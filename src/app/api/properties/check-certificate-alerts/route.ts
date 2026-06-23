import { NextResponse } from "next/server";

import { getCertificateTypeDisplayName } from "@/lib/properties/display-names";
import { sendCertificateAlertEmail } from "@/lib/properties/emails";
import { daysUntilDate } from "@/lib/properties/format";
import type { CertificateAlertType } from "@/lib/properties/types";
import { createAdminClient } from "@/lib/supabase/admin";

type AlertThreshold = {
  type: CertificateAlertType;
  matches: (days: number) => boolean;
};

const THRESHOLDS: AlertThreshold[] = [
  { type: "expired", matches: (days) => days < 0 },
  { type: "7_days", matches: (days) => days >= 0 && days <= 7 },
  { type: "30_days", matches: (days) => days > 7 && days <= 30 },
  { type: "90_days", matches: (days) => days > 30 && days <= 90 },
];

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
    .select("id, user_id, name, alerts_enabled")
    .eq("alerts_enabled", true);

  if (propertiesError || !properties) {
    console.error("check-certificate-alerts: properties fetch failed:", propertiesError);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }

  const userIds = [...new Set(properties.map((p) => p.user_id as string))];
  const propertyMap = new Map(
    properties.map((p) => [p.id as string, { name: p.name as string, userId: p.user_id as string }])
  );

  for (const userId of userIds) {
    processed++;

    const { data: userRow } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", userId)
      .single();

    const userEmail = userRow?.email;
    if (!userEmail) continue;

    const displayName = userRow?.name?.trim() || userEmail.split("@")[0] || "there";

    const userPropertyIds = properties
      .filter((p) => p.user_id === userId)
      .map((p) => p.id as string);

    if (userPropertyIds.length === 0) continue;

    const { data: certificates } = await supabase
      .from("property_certificates")
      .select("id, property_id, certificate_type, expiry_date")
      .eq("user_id", userId)
      .in("property_id", userPropertyIds)
      .not("expiry_date", "is", null);

    if (!certificates?.length) continue;

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

      for (const threshold of THRESHOLDS) {
        if (!threshold.matches(days)) continue;

        const key = `${cert.id}:${threshold.type}`;
        const existing = alertMap.get(key);
        if (existing) continue;

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

  console.log(
    `check-certificate-alerts: complete — processed ${processed} users, sent ${alertsSent} alerts`
  );

  return NextResponse.json({ processed, alertsSent });
}
