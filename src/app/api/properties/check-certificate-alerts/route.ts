import { NextResponse } from "next/server";

import {
  getCertificateTypeDisplayName,
  getInsuranceTypeDisplayName,
} from "@/lib/properties/display-names";
import {
  portalAppUrl,
  sendCertificateAlertEmail,
  sendInsuranceAlertEmail,
  sendMortgageAlertEmail,
} from "@/lib/properties/emails";
import { daysUntilDate, formatPropertyAddress } from "@/lib/properties/format";
import type {
  CertificateAlertType,
  InsuranceAlertType,
  MortgageAlertType,
} from "@/lib/properties/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AlertThreshold = {
  type: CertificateAlertType;
  matches: (days: number) => boolean;
};

const PRE_EXPIRY_THRESHOLDS: AlertThreshold[] = [
  { type: "7_days", matches: (days) => days >= 0 && days <= 7 },
  { type: "30_days", matches: (days) => days > 7 && days <= 30 },
  { type: "90_days", matches: (days) => days > 30 && days <= 90 },
];

const OVERDUE_THRESHOLDS: {
  type: CertificateAlertType;
  targetDays: number;
}[] = [
  { type: "7_days_overdue", targetDays: 7 },
  { type: "30_days_overdue", targetDays: 30 },
];

const MORTGAGE_THRESHOLDS: {
  type: MortgageAlertType;
  matches: (days: number) => boolean;
}[] = [
  { type: "180_days", matches: (days) => days > 90 && days <= 180 },
  { type: "90_days", matches: (days) => days > 30 && days <= 90 },
  { type: "30_days", matches: (days) => days > 7 && days <= 30 },
  { type: "7_days", matches: (days) => days >= 0 && days <= 7 },
];

const INSURANCE_THRESHOLDS: {
  type: InsuranceAlertType;
  matches: (days: number) => boolean;
}[] = [
  { type: "90_days", matches: (days) => days > 30 && days <= 90 },
  { type: "30_days", matches: (days) => days > 7 && days <= 30 },
  { type: "7_days", matches: (days) => days >= 0 && days <= 7 },
];

type PropertyRow = {
  id: string;
  user_id: string;
  name: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postcode: string;
  alerts_enabled: boolean;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.PROPERTY_ALERTS_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();
  let processed = 0;
  let alertsSent = 0;

  const { data: properties, error: propertiesError } = await supabase
    .from("properties")
    .select(
      "id, user_id, name, address_line1, address_line2, city, postcode, alerts_enabled"
    )
    .eq("alerts_enabled", true);

  if (propertiesError || !properties) {
    console.error("check-certificate-alerts: properties fetch failed:", propertiesError);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }

  const propertyRows = properties as PropertyRow[];
  const userIds = [...new Set(propertyRows.map((p) => p.user_id))];
  const propertyMap = new Map(
    propertyRows.map((p) => [
      p.id,
      {
        name: p.name,
        userId: p.user_id,
        address: formatPropertyAddress(p),
      },
    ])
  );
  const enabledPropertyIds = new Set(propertyRows.map((p) => p.id));

  for (const userId of userIds) {
    processed++;

    const { data: userRow } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    const userEmail = userRow?.email;
    if (!userEmail) continue;

    const displayName =
      userRow?.name?.trim() || userEmail.split("@")[0] || "there";

    const userPropertyIds = propertyRows
      .filter((p) => p.user_id === userId)
      .map((p) => p.id);

    if (userPropertyIds.length === 0) continue;

    // ─── Certificate alerts ───────────────────────────────────────────────

    const { data: certificates } = await supabase
      .from("property_certificates")
      .select("id, property_id, certificate_type, expiry_date")
      .eq("user_id", userId)
      .in("property_id", userPropertyIds)
      .not("expiry_date", "is", null);

    if (certificates?.length) {
      const certIds = certificates.map((c) => c.id as string);
      const { data: existingAlerts } = await supabase
        .from("certificate_alert_log")
        .select("certificate_id, alert_type, acknowledged")
        .in("certificate_id", certIds);

      const alertMap = new Map<string, { acknowledged: boolean }>();
      for (const alert of existingAlerts ?? []) {
        alertMap.set(
          `${alert.certificate_id}:${alert.alert_type}`,
          { acknowledged: alert.acknowledged as boolean }
        );
      }

      for (const cert of certificates) {
        const days = daysUntilDate(cert.expiry_date as string);
        if (days == null) continue;

        const property = propertyMap.get(cert.property_id as string);
        if (!property) continue;

        const certificateType = getCertificateTypeDisplayName(
          cert.certificate_type as string
        );

        const thresholds: AlertThreshold[] =
          days < 0
            ? [
                { type: "expired", matches: () => true },
                ...OVERDUE_THRESHOLDS.map((t) => ({
                  type: t.type,
                  matches: () =>
                    Math.abs(Math.abs(days) - t.targetDays) <= 1,
                })),
              ]
            : PRE_EXPIRY_THRESHOLDS;

        for (const threshold of thresholds) {
          if (!threshold.matches(days)) continue;

          const key = `${cert.id}:${threshold.type}`;
          if (alertMap.has(key)) continue;

          const { error: insertError } = await supabase
            .from("certificate_alert_log")
            .insert({
              user_id: userId,
              property_id: cert.property_id,
              certificate_id: cert.id,
              alert_type: threshold.type,
            });

          if (insertError) {
            if (insertError.code === "23505") continue;
            console.error("check-certificate-alerts: insert failed:", insertError);
            continue;
          }

          alertMap.set(key, { acknowledged: false });

          const sent = await sendCertificateAlertEmail({
            to: userEmail,
            displayName,
            propertyName: property.name,
            certificateType,
            expiryDate: cert.expiry_date as string,
            daysUntilExpiry: days,
            alertType: threshold.type,
            propertyId: cert.property_id as string,
          });

          if (sent) alertsSent++;
        }
      }
    }

    // ─── Mortgage alerts ──────────────────────────────────────────────────

    const { data: mortgages } = await supabase
      .from("property_mortgages")
      .select("id, property_id, lender, fixed_rate_end_date")
      .eq("user_id", userId)
      .eq("alerts_enabled", true)
      .in("property_id", userPropertyIds)
      .not("fixed_rate_end_date", "is", null);

    if (mortgages?.length) {
      const mortgageIds = mortgages.map((m) => m.id as string);
      const { data: existingMortgageAlerts } = await supabase
        .from("mortgage_alert_log")
        .select("mortgage_id, alert_type")
        .in("mortgage_id", mortgageIds);

      const mortgageAlertMap = new Set(
        (existingMortgageAlerts ?? []).map(
          (a) => `${a.mortgage_id}:${a.alert_type}`
        )
      );

      for (const mortgage of mortgages) {
        if (!enabledPropertyIds.has(mortgage.property_id as string)) continue;

        const days = daysUntilDate(mortgage.fixed_rate_end_date as string);
        if (days == null || days < 0) continue;

        const property = propertyMap.get(mortgage.property_id as string);
        if (!property) continue;

        for (const threshold of MORTGAGE_THRESHOLDS) {
          if (!threshold.matches(days)) continue;

          const key = `${mortgage.id}:${threshold.type}`;
          if (mortgageAlertMap.has(key)) continue;

          const { error: insertError } = await supabase
            .from("mortgage_alert_log")
            .insert({
              user_id: userId,
              property_id: mortgage.property_id,
              mortgage_id: mortgage.id,
              alert_type: threshold.type,
            });

          if (insertError) {
            if (insertError.code === "23505") continue;
            console.error("check-certificate-alerts: mortgage insert failed:", insertError);
            continue;
          }

          mortgageAlertMap.add(key);

          const sent = await sendMortgageAlertEmail({
            to: userEmail,
            displayName,
            propertyAddress: property.address,
            lender: mortgage.lender as string,
            fixedRateEndDate: mortgage.fixed_rate_end_date as string,
            daysUntil: days,
            alertType: threshold.type,
            propertyUrl: portalAppUrl(
              `/properties/${mortgage.property_id}?tab=finances`
            ),
          });

          if (sent) alertsSent++;
        }
      }
    }

    // ─── Insurance alerts ─────────────────────────────────────────────────

    const { data: insuranceRecords } = await supabase
      .from("property_insurance")
      .select("id, property_id, insurer, insurance_type, renewal_date")
      .eq("user_id", userId)
      .eq("alerts_enabled", true)
      .in("property_id", userPropertyIds)
      .not("renewal_date", "is", null);

    if (insuranceRecords?.length) {
      const insuranceIds = insuranceRecords.map((i) => i.id as string);
      const { data: existingInsuranceAlerts } = await supabase
        .from("insurance_alert_log")
        .select("insurance_id, alert_type")
        .in("insurance_id", insuranceIds);

      const insuranceAlertMap = new Set(
        (existingInsuranceAlerts ?? []).map(
          (a) => `${a.insurance_id}:${a.alert_type}`
        )
      );

      for (const insurance of insuranceRecords) {
        if (!enabledPropertyIds.has(insurance.property_id as string)) continue;

        const days = daysUntilDate(insurance.renewal_date as string);
        if (days == null || days < 0) continue;

        const property = propertyMap.get(insurance.property_id as string);
        if (!property) continue;

        const insuranceType = getInsuranceTypeDisplayName(
          insurance.insurance_type as string
        );

        for (const threshold of INSURANCE_THRESHOLDS) {
          if (!threshold.matches(days)) continue;

          const key = `${insurance.id}:${threshold.type}`;
          if (insuranceAlertMap.has(key)) continue;

          const { error: insertError } = await supabase
            .from("insurance_alert_log")
            .insert({
              user_id: userId,
              property_id: insurance.property_id,
              insurance_id: insurance.id,
              alert_type: threshold.type,
            });

          if (insertError) {
            if (insertError.code === "23505") continue;
            console.error("check-certificate-alerts: insurance insert failed:", insertError);
            continue;
          }

          insuranceAlertMap.add(key);

          const sent = await sendInsuranceAlertEmail({
            to: userEmail,
            displayName,
            propertyAddress: property.address,
            insurer: insurance.insurer as string,
            insuranceType,
            renewalDate: insurance.renewal_date as string,
            daysUntil: days,
            alertType: threshold.type,
            propertyUrl: portalAppUrl(
              `/properties/${insurance.property_id}?tab=finances`
            ),
          });

          if (sent) alertsSent++;
        }
      }
    }
  }

  console.log(
    `check-certificate-alerts: complete — processed ${processed} users, sent ${alertsSent} alerts`
  );

  return NextResponse.json({ processed, alertsSent });
}
