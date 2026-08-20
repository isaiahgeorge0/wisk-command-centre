"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useWinstonSidebar } from "@/components/winston/winston-sidebar-context";

/**
 * Opens research-scoped Winston when arriving via /research?askWinston=1
 * (e.g. Research Pro post-checkout CTA), then strips the query param.
 */
export function OpenResearchWinstonOnQuery({
  enabled,
}: {
  enabled: boolean;
}) {
  const { openSidebar } = useWinstonSidebar();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    openSidebar({ tier: "section", section: "research" });
    router.replace("/research", { scroll: false });
  }, [enabled, openSidebar, router]);

  return null;
}
