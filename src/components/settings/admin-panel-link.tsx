import Link from "next/link";
import { Shield } from "lucide-react";

export function AdminPanelLink() {
  return (
    <div className="border-t border-border/60 pt-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-orange-600 dark:hover:text-orange-400"
      >
        <Shield className="size-4" aria-hidden="true" />
        Admin panel →
      </Link>
    </div>
  );
}
