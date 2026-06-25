import Link from "next/link";

export default function ContractorNotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold text-[var(--portal-text)]">
        Job sheet not found
      </h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--portal-muted)]">
        This link may have expired or is invalid. Contact your landlord if you
        need a new job sheet link.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm font-medium text-[var(--portal-amber)] hover:underline"
      >
        Go to WISK
      </Link>
    </div>
  );
}
