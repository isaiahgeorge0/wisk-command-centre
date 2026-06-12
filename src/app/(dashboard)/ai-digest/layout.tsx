import { Sparkles } from "lucide-react";

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
      {/* Winston section header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-wisk-purple/30 to-wisk-teal/30 shadow-sm">
          <Sparkles className="size-5 text-wisk-teal" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Winston
          </h1>
          <p className="text-sm text-muted-foreground">
            Your AI business assistant
          </p>
        </div>
      </div>

      <SectionSubNav items={SUB_NAV_ITEMS} />

      {children}
    </div>
  );
}
