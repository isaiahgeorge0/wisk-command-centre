import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { SectionSubNav } from "@/components/layout/section-sub-nav";

const SUB_NAV_ITEMS = [
  { label: "Digest", href: "/ai-digest" },
  { label: "Chat", href: "/ai-digest/chat" },
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
        icon={<Sparkles className="size-6 text-white" />}
        gradient
        gradientFrom="#14b8a6"
        gradientTo="#a855f7"
      />

      <SectionSubNav items={SUB_NAV_ITEMS} />

      {children}
    </div>
  );
}
