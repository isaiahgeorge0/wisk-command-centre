import "@/components/portal/portal-theme.css";

import Link from "next/link";

export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-root portal-light min-h-dvh dark:portal-dark">
      <header className="sticky top-0 z-10 border-b border-[var(--portal-border)] bg-[var(--portal-nav-bg)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-[var(--portal-text)]"
          >
            WISK
          </Link>
          <span className="ml-3 text-sm text-[var(--portal-muted)]">
            Contractor job sheet
          </span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
