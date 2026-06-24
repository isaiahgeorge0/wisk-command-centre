import { MessageSquare } from "lucide-react";

import { PortalPage } from "@/components/portal/portal-page";

export default function PortalMessagesPage() {
  return (
    <PortalPage>
      <div className="rounded-2xl border border-dashed border-[var(--portal-amber)]/30 bg-[var(--portal-card)] px-6 py-16 text-center shadow-[var(--portal-shadow)]">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--portal-amber-light)]">
          <MessageSquare className="size-7 text-[var(--portal-amber)]" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-[var(--portal-text)]">
          Messages
        </h1>
        <p className="mt-2 text-sm text-[var(--portal-muted)]">
          Messaging with your landlord is coming soon.
        </p>
      </div>
    </PortalPage>
  );
}
