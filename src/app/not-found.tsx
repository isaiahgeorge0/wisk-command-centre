import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-12">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, oklch(0.92 0.22 128 / 0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 100% 100%, oklch(0.62 0.1 210 / 0.06), transparent 50%)",
        }}
      />

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <span className="bg-wisk-lime bg-clip-text text-3xl font-bold tracking-[0.28em] text-transparent uppercase sm:text-4xl">
          WISK
        </span>

        <h1 className="mt-10 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Page not found.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Whatever you were looking for isn&apos;t here.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl bg-wisk-lime px-8 text-sm font-semibold text-wisk-dark transition-opacity hover:opacity-90"
        >
          Go to dashboard
        </Link>

        <Link
          href="/sign-in"
          className="mt-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
