"use client";

import { Sparkles } from "lucide-react";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();

  return (
    <div>
      <PageHeader
        title="Winston"
        subtitle="Your AI business assistant."
        icon={
          <Sparkles
            className="size-6 text-white"
            style={{ color: resolvedTheme === "dark" ? "#8b00ff" : "#6200b3" }}
          />
        }
        gradient
        gradientFrom={resolvedTheme === "dark" ? "#8b00ff" : "#6200b3"}
        gradientTo={resolvedTheme === "dark" ? "#aca0ff" : "#4a3db0"}
      />

      <SectionSubNav items={SUB_NAV_ITEMS} />

      {children}
    </div>
  );
}
