"use client";

import { LockSimple } from "@phosphor-icons/react";
import { useSessionUser } from "@/components/providers/session-provider";
import { SignOutButton } from "@/components/shell/sign-out-button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { initials } from "@/lib/format";

export function ProfilePanel() {
  const user = useSessionUser();

  return (
    <Panel className="flex flex-col">
      <PanelHeader
        title="Akun"
        caption="Catatanmu terikat pada akun ini, bukan pada peramban."
      />

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-pine/15 bg-pine-soft text-[11px] font-medium text-pine">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium">{user.name}</p>
            <p className="truncate text-[10.5px] text-faint">{user.email}</p>
          </div>
          <SignOutButton className="ml-auto shrink-0" />
        </div>

        <p className="mt-3.5 flex items-start gap-1.5 border-t border-line pt-3 text-[10px] leading-relaxed text-faint">
          <LockSimple size={12} className="mt-px shrink-0" />
          Sesi disimpan pada cookie HttpOnly dan berlaku 30 hari. Keluar akan
          menghapus sesi di server, bukan hanya di peramban ini.
        </p>
      </div>
    </Panel>
  );
}
