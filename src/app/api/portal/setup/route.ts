import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const bodySchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { token, password, confirmPassword } = parsed.data;

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .select(
      "id, email, portal_invite_token, portal_invited_at, portal_user_id, portal_enabled"
    )
    .eq("portal_invite_token", token)
    .maybeSingle();

  if (tenantError || !tenant) {
    return NextResponse.json(
      { error: "This link is invalid or has expired" },
      { status: 404 }
    );
  }

  if (tenant.portal_user_id) {
    return NextResponse.json(
      { error: "This account has already been set up" },
      { status: 400 }
    );
  }

  if (!tenant.email?.trim()) {
    return NextResponse.json(
      { error: "Tenant email is missing" },
      { status: 400 }
    );
  }

  const invitedAt = tenant.portal_invited_at
    ? new Date(tenant.portal_invited_at as string).getTime()
    : null;

  if (
    !invitedAt ||
    Date.now() - invitedAt > INVITE_EXPIRY_MS
  ) {
    return NextResponse.json(
      { error: "This link has expired" },
      { status: 410 }
    );
  }

  const { data: createdUser, error: createError } =
    await admin.auth.admin.createUser({
      email: tenant.email.trim(),
      password,
      email_confirm: true,
    });

  if (createError || !createdUser.user) {
    console.error("[portal/setup] createUser:", createError);
    return NextResponse.json(
      { error: createError?.message ?? "Could not create account" },
      { status: 500 }
    );
  }

  const { error: updateError } = await admin
    .from("tenants")
    .update({
      portal_user_id: createdUser.user.id,
      portal_invite_token: null,
      portal_enabled: true,
    })
    .eq("id", tenant.id);

  if (updateError) {
    console.error("[portal/setup] update tenant:", updateError);
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return NextResponse.json(
      { error: "Could not complete setup" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    email: tenant.email.trim(),
  });
}
