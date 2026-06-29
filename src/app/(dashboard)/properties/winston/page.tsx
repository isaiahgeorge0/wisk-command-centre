import {
  canGenerateValuation,
  getComparablesByProperty,
  getLatestPropertyInsight,
  getLatestValuation,
  getProperties,
} from "@/app/(dashboard)/properties/actions";
import { PropertiesWinstonClient } from "@/components/properties/properties-winston-client";
import { isAdminEmail } from "@/lib/auth/is-admin";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { hasPackageAccess } from "@/lib/billing/access";
import type {
  PropertyComparable,
  PropertyValuation,
} from "@/lib/properties/types";

export default async function PropertiesWinstonPage() {
  const { supabase, userId } = await getScopedSupabase();
  const { data: authUser } = await supabase.auth.getUser();

  const [insight, properties, hasProPlan] = await Promise.all([
    getLatestPropertyInsight(),
    getProperties(),
    hasPackageAccess(userId, "properties_pro", supabase),
  ]);

  const valuationEntries = await Promise.all(
    properties.map(async (property) => {
      const [valuation, comparables, eligibility] = await Promise.all([
        getLatestValuation(property.id),
        getComparablesByProperty(property.id),
        canGenerateValuation(property.id),
      ]);
      return { propertyId: property.id, valuation, comparables, eligibility };
    })
  );

  const valuationsByProperty = Object.fromEntries(
    valuationEntries.map((entry) => [entry.propertyId, entry.valuation])
  ) as Record<string, PropertyValuation | null>;

  const comparablesByProperty = Object.fromEntries(
    valuationEntries.map((entry) => [entry.propertyId, entry.comparables])
  ) as Record<string, PropertyComparable[]>;

  const eligibilityByProperty = Object.fromEntries(
    valuationEntries.map((entry) => [entry.propertyId, entry.eligibility])
  );

  return (
    <PropertiesWinstonClient
      insight={insight}
      propertyCount={properties.length}
      isAdmin={isAdminEmail(authUser.user?.email)}
      hasProPlan={hasProPlan}
      properties={properties}
      valuationsByProperty={valuationsByProperty}
      comparablesByProperty={comparablesByProperty}
      eligibilityByProperty={eligibilityByProperty}
    />
  );
}
