import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmailWorkspace } from "@/components/email/email-workspace";
import { getSessionUser } from "@/lib/auth-session";
import { database } from "@/lib/db/pg";
import { readDrafts, readInbox } from "@/lib/email-service";

export const metadata: Metadata = { title: "Email bank — Sisa" };

export default async function EmailPage() {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");

  const [drafts, inbox] = await Promise.all([
    readDrafts(database, user.id),
    readInbox(database, user.id),
  ]);

  return <EmailWorkspace initialDrafts={drafts} initialInbox={inbox} />;
}
