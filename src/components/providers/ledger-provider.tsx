"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { markDeviceLedgerAdopted, readDeviceLedger } from "@/lib/device-ledger";
import type { LedgerOperation } from "@/lib/ledger-input";
import {
  applyOperation,
  budgetFor,
  LedgerContext,
  setLedgerBridge,
  type LedgerState,
  type LedgerStatus,
  type LedgerValue,
} from "@/lib/ledger-store";
import { periodFor } from "@/lib/period";

interface OperationResult {
  ledger: LedgerState;
  affected: number;
  skipped?: boolean;
}

interface ProviderState extends LedgerState {
  month: string;
  status: LedgerStatus;
  error?: string;
}

async function messageFrom(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? "Perubahan tidak tersimpan.";
  } catch {
    return "Perubahan tidak tersimpan.";
  }
}

export function LedgerProvider({
  initial,
  initialMonth,
  today,
  children,
}: {
  initial: LedgerState;
  /** Bulan yang dibuka pertama kali, dipilih server dari data yang ada. */
  initialMonth: string;
  /** Tanggal server saat halaman dimuat; dipakai sebagai "hari ini" bersama. */
  today: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<ProviderState>({
    ...initial,
    month: initialMonth,
    status: "idle",
  });
  /** Permintaan dikirim berurutan supaya dua perubahan cepat tidak saling tabrak. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  const load = useCallback(async (): Promise<LedgerState | null> => {
    const response = await fetch("/api/ledger", { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as LedgerState;
  }, []);

  const send = useCallback((operation: LedgerOperation) => {
    // Tampilan berubah lebih dulu; server mengonfirmasi sesudahnya.
    setState((current) => ({
      ...current,
      ...applyOperation(current, operation),
      status: "saving",
    }));

    queue.current = queue.current.then(async () => {
      try {
        const response = await fetch("/api/ledger", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(operation),
        });
        if (!response.ok) throw new Error(await messageFrom(response));

        const result = (await response.json()) as OperationResult;
        // Bulan yang sedang dibaca bukan milik server; jangan ikut ditimpa.
        setState((current) => ({
          ...current,
          transactions: result.ledger.transactions,
          budgets: result.ledger.budgets,
          status: "idle",
          error: undefined,
        }));
        if (operation.type === "adopt") markDeviceLedgerAdopted();
      } catch (error) {
        // Server tetap sumber kebenaran: keadaan lokal diambil ulang.
        const fresh = await load().catch(() => null);
        setState((current) => ({
          ...current,
          transactions: fresh?.transactions ?? current.transactions,
          budgets: fresh?.budgets ?? current.budgets,
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Perubahan tidak tersimpan.",
        }));
      }
    });
  }, [load]);

  // Jembatan untuk fungsi perubahan di luar React (mis. dari form).
  useEffect(() => {
    setLedgerBridge({
      snapshot: { transactions: state.transactions, budgets: state.budgets },
      month: state.month,
      dispatch: send,
    });
  }, [state.transactions, state.budgets, state.month, send]);

  useEffect(() => () => setLedgerBridge(null), []);

  const setMonth = useCallback((month: string) => {
    setState((current) =>
      current.month === month ? current : { ...current, month },
    );
  }, []);

  // Dipakai halaman yang menulis langsung ke server (draf email), supaya
  // keadaan di peramban tidak tertinggal dari database.
  const refresh = useCallback(async () => {
    const fresh = await load().catch(() => null);
    if (!fresh) return;
    setState((current) => ({
      ...current,
      transactions: fresh.transactions,
      budgets: fresh.budgets,
    }));
  }, [load]);

  const period = useMemo(
    () => periodFor(state.month, today),
    [state.month, today],
  );

  const value: LedgerValue = {
    transactions: state.transactions,
    budgets: state.budgets,
    month: state.month,
    today,
    period,
    budget: budgetFor(state, state.month),
    status: state.status,
    error: state.error,
    setMonth,
    refresh,
  };

  const adopted = useRef(false);

  // Pemindahan catatan peramban ke akun: hanya ke akun yang masih kosong, dan
  // hanya sekali per peramban ini.
  useEffect(() => {
    if (adopted.current) return;
    adopted.current = true;
    if (initial.transactions.length > 0) return;

    const device = readDeviceLedger();
    if (!device) return;
    send({
      type: "adopt",
      month: initialMonth,
      transactions: device.transactions,
      budget: device.budget,
    });
  }, [initial.transactions.length, initialMonth, send]);

  return <LedgerContext value={value}>{children}</LedgerContext>;
}
