"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

const LIME_FILTER =
  "brightness(0) saturate(100%) invert(93%) sepia(55%) saturate(900%) hue-rotate(33deg) brightness(105%)";

type SignUpConfirmProps = {
  email: string | null;
};

export function SignUpConfirm({ email }: SignUpConfirmProps) {
  const reduced = useReducedMotion() ?? false;
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResend = () => {
    if (!email) return;
    setResendError(null);
    startTransition(async () => {
      const supabase = createClient();
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${origin}/auth/callback` },
      });

      if (error) {
        setResendError(error.message);
        return;
      }

      setResent(true);
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#141b27] px-6 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(195,255,50,0.06), transparent 60%), radial-gradient(ellipse 45% 40% at 80% 100%, rgba(1,108,129,0.06), transparent 55%)",
        }}
      />

      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wisk-logo-white.png"
          alt="WISK"
          className="h-8 w-auto"
          style={{ filter: LIME_FILTER }}
        />

        <motion.div
          className="mt-8"
          initial={reduced ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, type: "spring", bounce: 0.5 }}
        >
          <CheckCircle2 className="mx-auto size-16 text-wisk-lime" aria-hidden />
        </motion.div>

        <h1 className="mt-6 text-3xl font-bold text-white">
          Check your inbox.
        </h1>

        <p className="mt-3 max-w-sm text-base text-white/50">
          We&apos;ve sent a confirmation link
          {email ? (
            <>
              {" "}
              to <span className="text-white/80">{email}</span>
            </>
          ) : null}
          . Click it to activate your account and get started.
        </p>

        <p className="mt-2 text-center text-sm text-white/40">
          After confirming, you&apos;ll be taken through a quick setup to
          personalise your workspace.
        </p>

        <p className="mt-6 text-sm text-white/40">
          Didn&apos;t get it? Check your spam folder
          {email ? (
            <>
              {" "}
              or{" "}
              {resent ? (
                <span className="text-wisk-lime">Sent!</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending}
                  className="text-wisk-lime underline disabled:opacity-50"
                >
                  {isPending ? "resending…" : "resend the email"}
                </button>
              )}
            </>
          ) : null}
          .
        </p>

        {resendError ? (
          <p className="mt-2 text-sm text-red-400" role="alert">
            {resendError}
          </p>
        ) : null}

        <Link
          href="/sign-in"
          className="mt-8 text-sm text-white/30 transition-colors hover:text-white"
        >
          ← Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
