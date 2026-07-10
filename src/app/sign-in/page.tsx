import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#141b27] px-6 py-12 text-white">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 30% 0%, rgba(1,108,129,0.08), transparent 60%), radial-gradient(ellipse 40% 40% at 80% 100%, rgba(172,160,255,0.05), transparent 50%)",
        }}
      />
      <a
        href="https://wiskapp.com"
        className="absolute top-6 left-6 text-sm text-white/40 transition-colors hover:text-white"
      >
        ← wiskapp.com
      </a>
      <Suspense fallback={null}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
