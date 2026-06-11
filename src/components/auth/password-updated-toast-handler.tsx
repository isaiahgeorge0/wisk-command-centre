"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PasswordUpdatedToast } from "@/components/auth/password-updated-toast";

export function PasswordUpdatedToastHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("password_updated") !== "true") return;

    setOpen(true);

    const url = new URL(window.location.href);
    url.searchParams.delete("password_updated");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router, searchParams]);

  return <PasswordUpdatedToast open={open} onDismiss={() => setOpen(false)} />;
}
