import { Suspense } from "react";

import { getMonthlyUsage } from "@/app/(dashboard)/ai-digest/actions";
import { SettingsPageShell } from "@/components/settings/settings-page-shell";
import { getIntegrations } from "@/app/(dashboard)/settings/integrations/actions";
import { getUserBillingSummary } from "@/lib/billing/plan";
import { isAdminEmail } from "@/lib/auth/is-admin";
import { resolveDisplayName } from "@/lib/auth/resolve-display-name";
import { getUserProfile } from "@/lib/auth/get-user-profile";
import { getScopedSupabase } from "@/lib/auth/scoped-supabase";
import { getOrCreateUserPreferences } from "@/lib/preferences/get-user-preferences";
import type { LandlordContact } from "@/lib/users/landlord-contact";

export default async function SettingsPage() {
  const { supabase, userId } = await getScopedSupabase();

  const [profile, preferences, integrations, prefsRow, usageResult, billing, userRow] =
    await Promise.all([
      getUserProfile(),
      getOrCreateUserPreferences(),
      getIntegrations(),
      supabase
        .from("user_preferences")
        .select("ai_access, winston_email_picks_enabled")
        .eq("user_id", userId)
        .maybeSingle(),
      getMonthlyUsage(),
      getUserBillingSummary(userId),
      supabase
        .from("users")
        .select(
          "username, address_line1, address_line2, city, postcode, phone"
        )
        .eq("id", userId)
        .maybeSingle(),
    ]);

  const aiAccess = prefsRow.data?.ai_access === true;
  const emailPicksEnabled = prefsRow.data?.winston_email_picks_enabled !== false;
  const winstonUsage = usageResult.success ? usageResult.data : null;

  const displayName = resolveDisplayName({
    displayName: preferences.displayName,
    profileName: profile.name,
    email: profile.email,
  });

  const accountName =
    profile.name?.trim() ||
    profile.email.split("@")[0] ||
    "User";

  const landlordContact: LandlordContact = {
    addressLine1: userRow.data?.address_line1 ?? null,
    addressLine2: userRow.data?.address_line2 ?? null,
    city: userRow.data?.city ?? null,
    postcode: userRow.data?.postcode ?? null,
    phone: userRow.data?.phone ?? null,
  };

  return (
    <Suspense fallback={null}>
      <SettingsPageShell
        email={profile.email}
        displayName={displayName}
        accountName={accountName}
        username={userRow.data?.username ?? null}
        landlordContact={landlordContact}
        fieldVisibility={preferences.fieldVisibility}
        serviceTypes={preferences.serviceTypes}
        integrations={integrations}
        showAdminLink={isAdminEmail(profile.email)}
        aiAccess={aiAccess}
        emailPicksEnabled={emailPicksEnabled}
        winstonUsage={winstonUsage}
        billingPlan={billing.plan}
        billingPlanLabel={billing.planLabel}
        billingPeriodEnd={billing.currentPeriodEnd}
      />
    </Suspense>
  );
}
