"use client";

import { motion } from "framer-motion";
import {
  Bath,
  BedDouble,
  ChevronDown,
  ExternalLink,
  Pencil,
  PoundSterling,
  Trash2,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ExpandableSection } from "@/components/motion/expandable-section";
import { PropertyStatusBadge } from "@/components/properties/property-status-badge";
import { PropertyTypeBadge } from "@/components/properties/property-type-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  calculateAnnualYield,
  formatPropertyAddress,
  formatPropertyCurrency,
  formatYieldPercent,
} from "@/lib/properties/format";
import { useMotionSafe } from "@/lib/motion/use-motion-safe";
import type { PropertyWithStats } from "@/lib/properties/types";
import { cn } from "@/lib/utils";

type PropertyCardProps = {
  property: PropertyWithStats;
  index: number;
  onEdit: (property: PropertyWithStats) => void;
  onDelete: (property: PropertyWithStats) => void;
};

export function PropertyCard({
  property,
  index,
  onEdit,
  onDelete,
}: PropertyCardProps) {
  const { getInitial, reduced } = useMotionSafe();
  const [expanded, setExpanded] = useState(false);
  const annualYield = calculateAnnualYield(
    property.monthly_rent,
    property.purchase_price
  );

  return (
    <motion.div
      initial={getInitial({ opacity: 0, y: 16 })}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: reduced ? 0 : 0.35,
        delay: reduced ? 0 : index * 0.06,
      }}
    >
      <Card
        className={cn(
          "overflow-hidden border-border/60 bg-card/60",
          "border-l-4 border-l-wisk-ferrari"
        )}
      >
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h3 className="truncate text-base font-semibold text-foreground">
                {property.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {formatPropertyAddress(property)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
              <PropertyStatusBadge status={property.status} />
              <PropertyTypeBadge type={property.property_type} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BedDouble className="size-4" aria-hidden />
              {property.bedrooms ?? "—"} bed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bath className="size-4" aria-hidden />
              {property.bathrooms ?? "—"} bath
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PoundSterling className="size-4" aria-hidden />
              {formatPropertyCurrency(property.monthly_rent)}/mo
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {property.tenant_count} active tenant
              {property.tenant_count === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wrench className="size-3.5" aria-hidden />
              {property.open_maintenance_count} open ticket
              {property.open_maintenance_count === 1 ? "" : "s"}
            </span>
          </div>
        </CardHeader>

        <ExpandableSection open={expanded} className="px-6">
          <CardContent className="space-y-3 border-t border-border/50 px-0 pt-3 text-sm">
            {property.notes ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">
                  {property.notes}
                </p>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem
                label="Purchase price"
                value={formatPropertyCurrency(property.purchase_price)}
              />
              <DetailItem
                label="Current value"
                value={formatPropertyCurrency(property.current_value)}
              />
            </div>
            {annualYield != null ? (
              <div className="rounded-lg border border-wisk-ferrari/20 bg-wisk-ferrari/10 px-3 py-2">
                <p className="text-xs font-medium text-wisk-ferrari">
                  Annual yield
                </p>
                <p className="mt-0.5 text-lg font-semibold text-foreground">
                  {formatYieldPercent(annualYield)}
                </p>
              </div>
            ) : null}
          </CardContent>
        </ExpandableSection>

        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 gap-1.5"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                expanded && "rotate-180"
              )}
            />
            {expanded ? "Show less" : "Show more"}
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 gap-1.5"
              onClick={() => onEdit(property)}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 gap-1.5 text-destructive hover:text-destructive"
              onClick={() => onDelete(property)}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
            <Link
              href={`/properties/${property.id}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "min-h-11 gap-1.5 bg-wisk-ferrari text-white hover:bg-wisk-ferrari/90"
              )}
            >
              View property
              <ExternalLink className="size-4" />
            </Link>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
  );
}
