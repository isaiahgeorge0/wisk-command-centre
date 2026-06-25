import "@/components/portal/portal-theme.css";

export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-root portal-light min-h-dvh bg-[var(--portal-bg)] dark:portal-dark">
      <header className="sticky top-0 z-10 border-b border-[var(--portal-border)] border-t-4 border-t-[var(--portal-amber)] bg-[var(--portal-bg)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <p className="text-sm font-bold tracking-[0.18em] text-[var(--portal-amber)]">
            WISK
          </p>
          <span className="ml-3 text-sm text-[var(--portal-muted)]">
            Contractor job sheet
          </span>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
