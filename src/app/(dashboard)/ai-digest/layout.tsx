import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SectionSubNav } from "@/components/layout/section-sub-nav";

const SUB_NAV_ITEMS: { id: string; label: string; href: string }[] = [
  { id: "digest", label: "Digest", href: "/ai-digest" },
  { id: "chat", label: "Chat", href: "/ai-digest/chat" },
];

export default function AiDigestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader
        title="Winston"
        subtitle="Your AI business assistant."
        icon={<Sparkles className="size-6 text-wisk-section-winston" />}
        accent="winston"
        gradient
      />

      <SectionSubNav items={SUB_NAV_ITEMS} />

      {children}
    </div>
  );
}
