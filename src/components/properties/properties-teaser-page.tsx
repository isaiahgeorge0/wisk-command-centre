"use client";

import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

import { buttonVariants } from "@/components/ui/button";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import { cn } from "@/lib/utils";

function PortfolioPreview() {
  const rows = [
    { name: "Flat 2, Crown Street", status: "Occupied", rent: "£1,250" },
    { name: "12 Oak Lane", status: "Vacant", rent: "—" },
    { name: "Riverside HMO", status: "Maintenance", rent: "£2,400" },
  ];

  return (
    <div className="pointer-events-none select-none">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-wisk-ferrari/10">
          <Building2 className="size-5 text-wisk-ferrari" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Properties
          </h1>
          <p className="text-sm text-muted-foreground">Portfolio command centre</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/80">
        <div className="grid grid-cols-3 gap-2 border-b border-border/60 px-4 py-3 text-xs font-medium text-muted-foreground">
          <span>Property</span>
          <span>Status</span>
          <span className="text-right">Rent</span>
        </div>
        <ul className="divide-y divide-border/60">
          {rows.map((row) => (
            <li key={row.name} className="grid grid-cols-3 gap-2 px-4 py-3 text-sm">
              <span className="truncate font-medium text-foreground">{row.name}</span>
              <span className="text-muted-foreground">{row.status}</span>
              <span className="text-right text-foreground">{row.rent}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PropertiesTeaserPage() {
  const { getPageInitial, getPageAnimate, pageTransition } = useMotionSafe();

  return (
    <motion.div
      initial={getPageInitial()}
      animate={getPageAnimate()}
      transition={pageTransition}
    >
      <div className="relative min-h-[70vh]">
        <div className="w-full" style={{ filter: "blur(8px)" }} aria-hidden="true">
          <PortfolioPreview />
        </div>

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 to-background/80"
          aria-hidden="true"
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center px-6 py-10 text-center"
          >
            <div className="mb-5 flex size-20 items-center justify-center rounded-2xl bg-wisk-ferrari/10 shadow-lg ring-1 ring-wisk-ferrari/20">
              <Building2 className="size-9 text-wisk-ferrari" />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Your property portfolio. Managed.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/80">
              WISK Properties gives landlords a complete command centre — tenants,
              maintenance, rent tracking, certificates, and Winston AI insights. All
              in one place.
            </p>

            <ul className="mt-5 max-w-md space-y-3 text-left">
              {[
                "Portfolio dashboard across all your properties",
                "Tenant records, rent tracking, and maintenance",
                "Winston alerts for certificates and overdue issues",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 pl-1">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-wisk-ferrari"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/upgrade/properties"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 gap-2 bg-gradient-to-r from-wisk-ferrari to-wisk-ferrari/60 text-white hover:opacity-90"
              )}
            >
              Unlock Properties
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
