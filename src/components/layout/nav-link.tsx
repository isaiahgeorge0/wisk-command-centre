"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

import { MOTION_DURATION, MOTION_EASE } from "@/lib/motion/config";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  active: boolean;
};

export function NavLink({ href, label, active }: NavLinkProps) {
  const reduced = useReducedMotion();

  return (
    <Link
      href={href}
      className={cn(
        "relative shrink-0 px-0.5 py-1 text-sm font-medium transition-colors duration-300",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {active ? (
        <motion.span
          layoutId={reduced ? undefined : "nav-underline"}
          className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-wisk-lime/80"
          transition={
            reduced
              ? { duration: 0 }
              : { duration: MOTION_DURATION.normal, ease: MOTION_EASE.smooth }
          }
        />
      ) : null}
    </Link>
  );
}
