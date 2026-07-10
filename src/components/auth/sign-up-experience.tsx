"use client";

import {
  motion,
  useInView,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// Tuned to approximate #c3ff32 (exact match via CSS filter is approximate).
const LIME_FILTER =
  "brightness(0) saturate(100%) invert(91%) sepia(61%) saturate(700%) hue-rotate(30deg) brightness(108%)";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const SECTION_DOTS = [
  { name: "Projects", color: "#aca0ff" },
  { name: "Tasks", color: "#2dd4bf" },
  { name: "Goals", color: "#baf7e1" },
  { name: "Ideas", color: "#fea9e0" },
  { name: "Leads", color: "#ff5d00" },
  { name: "Content", color: "#0066ff" },
  { name: "Calendar", color: "#00c4b4" },
  { name: "Winston", color: "#8b00ff" },
  { name: "Properties", color: "#e8001d" },
] as const;

const TICKER_ITEMS = [
  { label: "Projects", color: "#aca0ff" },
  { label: "Tasks", color: "#2dd4bf" },
  { label: "Goals", color: "#baf7e1" },
  { label: "Ideas", color: "#fea9e0" },
  { label: "Leads", color: "#ff5d00" },
  { label: "Content", color: "#0066ff" },
  { label: "Calendar", color: "#00c4b4" },
  { label: "Winston", color: "#8b00ff" },
  { label: "Properties", color: "#e8001d" },
] as const;

export function SignUpExperience() {
  const reduced = useReducedMotion() ?? false;

  // Shared scroll progress (Enhancements 3 + 5).
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { damping: 30, stiffness: 200 });
  const ambientColor = useTransform(
    scrollYProgress,
    [0, 0.33, 0.66, 1],
    [
      "rgba(195,255,50,0.05)",
      "rgba(1,108,129,0.05)",
      "rgba(172,160,255,0.05)",
      "rgba(172,160,255,0.03)",
    ]
  );

  // Cursor-tracked magnetic glow (Enhancement 1).
  const mouseX = useSpring(0, { damping: 30, stiffness: 80 });
  const mouseY = useSpring(0, { damping: 30, stiffness: 80 });

  useEffect(() => {
    if (reduced) return;
    const handleMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY, reduced]);

  const cursorGlow = useMotionTemplate`radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(195, 255, 50, 0.04), transparent 50%)`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#141b27] text-white">
      {/* Ambient colour shift (Enhancement 5) */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundColor: ambientColor }}
      />

      {/* Cursor-tracked glow (Enhancement 1) */}
      {reduced ? null : (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0"
          style={{ background: cursorGlow }}
        />
      )}

      {/* Scroll progress line (Enhancement 3) */}
      {reduced ? null : (
        <motion.div
          aria-hidden
          className="fixed left-0 top-0 z-50 w-[2px] origin-top bg-wisk-lime"
          style={{ height: "100vh", scaleY, opacity: 0.6 }}
        />
      )}

      <div className="relative z-10">
        <Hero reduced={reduced} />
        <Ticker reduced={reduced} />
        <ValueProps reduced={reduced} />
        <FormSection reduced={reduced} />
      </div>
    </div>
  );
}

// ─── Section 1 — Hero ─────────────────────────────────────────────────────────

function Hero({ reduced }: { reduced: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const line1 = ["Your", "business,"];
  const centralised = "centralised.".split("");

  // Random per-character rotations, generated once (Enhancement 2).
  const charRotations = useMemo(
    () => centralised.map(() => (Math.random() - 0.5) * 16),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden px-6">
      {/* Ambient glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 10% 5%, rgba(195,255,50,0.06), transparent 60%), radial-gradient(ellipse 45% 40% at 90% 95%, rgba(1,108,129,0.06), transparent 55%)",
        }}
        animate={
          reduced ? undefined : { scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }
        }
        transition={
          reduced
            ? undefined
            : { duration: 14, repeat: Infinity, ease: "easeInOut" }
        }
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.img
          src="/wisk-logo-white.png"
          alt="WISK"
          className="h-10 w-auto md:h-14"
          style={{ height: "auto", filter: LIME_FILTER }}
          initial={reduced ? false : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: reduced ? 0 : 0.2 }}
        />

        <h1 className="mt-6 text-6xl font-bold tracking-tight md:text-8xl">
          <span className="block">
            {line1.map((word, i) => (
              <motion.span
                key={word}
                className="mr-[0.22em] inline-block last:mr-0"
                initial={reduced ? false : { y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: reduced ? 0 : 0.5 + i * 0.08,
                  ease: EASE_OUT,
                }}
              >
                {word}
              </motion.span>
            ))}
          </span>
          {/* Character-by-character signature line (Enhancement 2) */}
          <span className="block overflow-hidden pb-[0.12em] text-[#c3ff32]">
            {centralised.map((char, i) => (
              <motion.span
                key={i}
                style={{ display: "inline-block" }}
                initial={
                  reduced
                    ? false
                    : { y: 80, opacity: 0, rotate: charRotations[i] }
                }
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        damping: 12,
                        stiffness: 200,
                        delay: 0.8 + i * 0.04,
                      }
                }
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </span>
        </h1>
      </div>

      {/* Scroll indicator */}
      <motion.div
        aria-hidden
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: scrolled ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <span className="text-xs uppercase tracking-widest text-white/40">
          Scroll
        </span>
        <motion.span
          animate={
            reduced ? undefined : { y: [0, 6, 0], opacity: [0.4, 1, 0.4] }
          }
          transition={
            reduced
              ? undefined
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <ChevronDown className="size-5 text-white/60" />
        </motion.span>
      </motion.div>
    </section>
  );
}

// ─── Marquee ticker (Enhancement 4) ───────────────────────────────────────────

function Ticker({ reduced }: { reduced: boolean }) {
  // 3 copies form one sequence; render the sequence twice and translate -50%
  // so the loop is perfectly seamless.
  const sequence = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  const items = [...sequence, ...sequence];

  return (
    <div className="relative overflow-hidden border-y border-white/6 py-4">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={
          reduced
            ? undefined
            : { duration: 30, repeat: Infinity, ease: "linear" }
        }
      >
        {items.map((item, i) => (
          <span
            key={i}
            className="shrink-0 text-sm font-semibold uppercase tracking-[0.15em]"
            style={{ color: item.color }}
          >
            {item.label}
            <span className="ml-12 text-white/20">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Section 2 — Value props ──────────────────────────────────────────────────

function ValueProps({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });

  const lines = [
    { text: "Every project. Every task. Every goal.", cls: "text-white" },
    {
      text: "Your leads, content, and ideas in one place.",
      cls: "text-white/80",
    },
    {
      text: "And if you're a landlord, your entire portfolio.",
      cls: "text-white/60",
    },
  ];

  const show = reduced || inView;

  // Random off-screen start positions for the dots (Enhancement 6).
  const dotPositions = useMemo(
    () =>
      SECTION_DOTS.map(() => ({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 400,
      })),
    []
  );

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center px-6 py-24"
    >
      {/* Word-by-word 3D flip-down (Enhancement 8) */}
      <div
        className="mx-auto w-full max-w-4xl space-y-3"
        style={{ perspective: "1000px" }}
      >
        {lines.map((line, lineIndex) => (
          <p
            key={line.text}
            className={cn("text-3xl font-bold md:text-5xl", line.cls)}
          >
            {line.text.split(" ").map((word, wordIndex) => (
              <motion.span
                key={`${lineIndex}-${wordIndex}`}
                style={{ display: "inline-block", marginRight: "0.25em" }}
                initial={
                  reduced ? false : { y: -60, opacity: 0, rotateX: 90 }
                }
                animate={
                  show
                    ? { y: 0, opacity: 1, rotateX: 0 }
                    : { y: -60, opacity: 0, rotateX: 90 }
                }
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        type: "spring",
                        damping: 20,
                        stiffness: 300,
                        delay: lineIndex * 0.2 + wordIndex * 0.05,
                      }
                }
              >
                {word}
              </motion.span>
            ))}
          </p>
        ))}
      </div>

      {/* Dot constellation fly-in (Enhancement 6) */}
      <div className="mx-auto mt-10 grid w-full max-w-4xl grid-cols-3 gap-4 sm:grid-cols-5 md:flex md:flex-wrap md:gap-6">
        {SECTION_DOTS.map((dot, i) => (
          <div key={dot.name} className="flex flex-col items-center gap-1.5">
            <motion.span
              className="size-3 rounded-full"
              style={{ backgroundColor: dot.color }}
              initial={
                reduced
                  ? false
                  : {
                      x: dotPositions[i].x,
                      y: dotPositions[i].y,
                      opacity: 0,
                      scale: 0,
                    }
              }
              animate={
                show
                  ? { x: 0, y: 0, opacity: 1, scale: 1 }
                  : {
                      x: dotPositions[i].x,
                      y: dotPositions[i].y,
                      opacity: 0,
                      scale: 0,
                    }
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      damping: 15,
                      stiffness: 150,
                      delay: i * 0.06,
                    }
              }
            />
            <span className="text-[10px] uppercase tracking-wider text-white/40">
              {dot.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Section 3 — The form ─────────────────────────────────────────────────────

function FormSection({ reduced }: { reduced: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  const show = reduced || inView;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          name: name.trim(),
          password_set: true,
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    router.push(`/sign-up/confirm?email=${encodeURIComponent(email.trim())}`);
  };

  const fieldClass =
    "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 transition-colors focus:border-wisk-lime/50 focus:outline-none focus:ring-1 focus:ring-wisk-lime/30";

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center px-6 py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(195,255,50,0.03))",
        }}
      />

      {/* Blur-to-focus reveal (Enhancement 7) */}
      <motion.div
        className="relative z-10 mx-auto w-full max-w-md rounded-2xl border border-white/8 bg-[#1a2235] px-8 py-8"
        initial={
          reduced
            ? false
            : { filter: "blur(12px)", opacity: 0, y: 30, scale: 0.97 }
        }
        animate={
          show
            ? { filter: "blur(0px)", opacity: 1, y: 0, scale: 1 }
            : { filter: "blur(12px)", opacity: 0, y: 30, scale: 0.97 }
        }
        transition={{ duration: 0.7, ease: EASE_OUT }}
      >
        <h2 className="text-2xl font-bold text-white">Join WISK</h2>
        <p className="mt-1 mb-5 text-sm text-white/50">
          Start free. No card required.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="signup-name"
              className="text-xs uppercase tracking-wide text-white/50"
            >
              Full name
            </label>
            <input
              id="signup-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
              className={fieldClass}
              placeholder="Ada Lovelace"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="text-xs uppercase tracking-wide text-white/50"
            >
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
              className={fieldClass}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="text-xs uppercase tracking-wide text-white/50"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
                className={cn(fieldClass, "pr-12")}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c3ff32] py-3.5 text-sm font-bold text-[#141b27] transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>

          {error ? (
            <p className="text-center text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <p className="mt-3 text-center text-sm text-white/40">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-wisk-lime hover:underline">
            Sign in
          </Link>
        </p>

        <p className="mt-2 text-center text-xs text-white/30">
          By joining you agree to our{" "}
          <a href="/terms" className="underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </motion.div>
    </section>
  );
}
