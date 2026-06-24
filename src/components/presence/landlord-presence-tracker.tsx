"use client";

import { useEffect } from "react";

import { updateLandlordLastSeen } from "@/app/(dashboard)/presence/actions";

export function LandlordPresenceTracker() {
  useEffect(() => {
    const update = () => {
      void updateLandlordLastSeen();
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
