"use client";

import { useEffect } from "react";

import { updateTenantLastSeen } from "@/app/portal/actions";

export function TenantPresenceTracker() {
  useEffect(() => {
    const update = () => {
      void updateTenantLastSeen();
    };

    update();

    const onVisibilityChange = () => {
      update();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
