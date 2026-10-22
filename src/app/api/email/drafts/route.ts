import { getSessionUser } from "@/lib/auth-session";
import { CATEGORY_ORDER } from "@/lib/data/categories";
import { database } from "@/lib/db/pg";
import {
  confirmDraft,
  dismissDraft,
  ingestEmail,
  readDrafts,
  readInbox,
} from "@/lib/email-service";
import { isBodyTooLarge, isSameOriginRequest, jsonNoStore } from "@/lib/http";
import type { CategoryKey } from "@/lib/types";

/**
 * Draf hasil parsing email. Belum menjadi transaksi sampai pengguna
 * mengonfirmasi lewat POST di route yang sama.
 */

const MAX_TEXT = 20_000;
const MAX_SUBJECT = 200;
const DRAFT_ID = /^draft-[a-f0-9]{16}$/;

export async function GET(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return jsonNoStore({ error: "Perlu masuk dulu." }, { status: 401 });
  }

  try {
    const [drafts, inbox] = await Promise.all([
      readDrafts(database, user.id),
      readInbox(database, user.id),
    ]);
    return jsonNoStore({ drafts, inbox });
  } catch (error) {
    console.error("[email] gagal membaca draf:", error);
    return jsonNoStore(
      { error: "Tidak bisa membaca draf email." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request.headers);
  if (!user) {
    return jsonNoStore({ error: "Perlu masuk dulu." }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return jsonNoStore(
      { error: "Permintaan harus datang dari halaman aplikasi." },
      { status: 403 },
    );
  }
  if (isBodyTooLarge(request)) {
    return jsonNoStore({ error: "Kiriman terlalu besar." }, { status: 413 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: unknown;
        text?: unknown;
        subject?: unknown;
        id?: unknown;
        category?: unknown;
      }
    | null;
  if (!body || typeof body.action !== "string") {
    return jsonNoStore({ error: "Bentuk permintaan tidak dikenali." }, { status: 400 });
  }

  try {
    switch (body.action) {
      case "paste": {
        if (typeof body.text !== "string" || !body.text.trim()) {
          return jsonNoStore({ error: "Isi email masih kosong." }, { status: 400 });
        }
        const subject =
          typeof body.subject === "string"
            ? body.subject.trim().slice(0, MAX_SUBJECT)
            : undefined;

        const result = await ingestEmail(database, user.id, {
          text: body.text.slice(0, MAX_TEXT),
          subject: subject || undefined,
        });

        if (!result.draft && !result.duplicate) {
          return jsonNoStore(
            { error: result.reason ?? "Email ini tidak bisa dibaca." },
            { status: 422 },
          );
        }

        return jsonNoStore({
          draft: result.draft,
          duplicate: result.duplicate,
          reason: result.reason,
        });
      }

      case "confirm": {
        if (typeof body.id !== "string" || !DRAFT_ID.test(body.id)) {
          return jsonNoStore({ error: "Draf tidak dikenali." }, { status: 400 });
        }

        // Kategori pilihan pengguna (kalau ada) harus salah satu yang dikenal;
        // selain itu server menebaknya sendiri seperti jalur impor CSV.
        let category: CategoryKey | undefined;
        if (body.category !== undefined && body.category !== null) {
          if (
            typeof body.category !== "string" ||
            !CATEGORY_ORDER.includes(body.category as CategoryKey)
          ) {
            return jsonNoStore(
              { error: "Kategori tidak dikenali." },
              { status: 400 },
            );
          }
          category = body.category as CategoryKey;
        }

        const result = await confirmDraft(
          database,
          user.id,
          body.id,
          category,
        );

        // Catatan yang sama sudah ada (mis. diinput manual kemarin): draf
        // ditutup tanpa menambah baris baru, dan pengguna diberi tahu.
        if (result.duplicate) {
          return jsonNoStore({
            transaction: null,
            duplicate: true,
            existing: result.existing ?? null,
          });
        }

        if (!result.transaction) {
          return jsonNoStore(
            { error: "Draf ini sudah diproses atau tidak ada." },
            { status: 404 },
          );
        }
        return jsonNoStore({ transaction: result.transaction });
      }

      case "dismiss": {
        if (typeof body.id !== "string" || !DRAFT_ID.test(body.id)) {
          return jsonNoStore({ error: "Draf tidak dikenali." }, { status: 400 });
        }
        await dismissDraft(database, user.id, body.id);
        return jsonNoStore({ ok: true });
      }

      default:
        return jsonNoStore({ error: "Aksi tidak dikenali." }, { status: 400 });
    }
  } catch (error) {
    console.error("[email] gagal memproses draf:", error);
    return jsonNoStore(
      { error: "Perubahan tidak tersimpan. Coba lagi." },
      { status: 500 },
    );
  }
}
