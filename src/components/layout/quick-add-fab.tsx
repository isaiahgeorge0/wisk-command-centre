"use client";

import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";

export function QuickAddFab() {
  const pathname = usePathname();
  const { openProjectAdd } = useQuickAdd();

  const handleClick = () => {
    // TODO(auth): Route FAB action by section; extend beyond projects.
    if (pathname === "/projects") {
      openProjectAdd();
    }
  };

  return (
    <Button
      size="icon-lg"
      className="fixed bottom-6 right-6 z-50 size-12 rounded-full border border-wisk-purple/20 bg-wisk-purple text-white shadow-[0_0_20px_rgba(139,92,246,0.1)] hover:bg-wisk-purple/90 hover:shadow-[0_0_24px_rgba(45,212,191,0.12)]"
      onClick={handleClick}
      aria-label="Quick add"
    >
      <Plus className="size-5" strokeWidth={2.5} />
    </Button>
  );
}
