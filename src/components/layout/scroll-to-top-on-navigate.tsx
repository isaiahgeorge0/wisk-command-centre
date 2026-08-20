"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Force the viewport to the top on route changes.
 * Next.js Link already tries window.scrollTo(0,0), but mobile Safari can
 * restore a prior scroll position after paint — which hides in-page subnav
 * under the fixed header. Overview already did this on mount; do it for all
 * dashboard routes.
 */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
