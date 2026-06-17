"use server";

import { z } from "zod";

import {
  ACCESS_REQUEST_ALREADY_REGISTERED_MESSAGE,
} from "@/lib/auth/access-request";
import { emailIsRegistered } from "@/lib/auth/email-is-registered";
import { sendAccessRequestConfirmation } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

export type LookupResult =
  | { success: true; email: string }
  | { success: false; error: string };

export async function lookupEmailByUsername(
  username: string
): Promise<LookupResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .ilike("username", username.trim())
    .maybeSingle();

  if (error) {
    console.error("lookupEmailByUsername:", error);
    return { success: false, error: "Could not look up account" };
  }

  if (!data) {
    return { success: false, error: "No account found with that username" };
  }

  return { success: true, email: data.email };
}

const accessRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
});

export type AccessRequestResult =
  | { success: true }
  | { success: false; error: string; alreadyRegistered?: boolean };

export async function submitAccessRequest(input: {
  name: string;
  email: string;
}): Promise<AccessRequestResult> {
  const parsed = accessRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const normalizedEmail = parsed.data.email.toLowerCase();

  if (await emailIsRegistered(normalizedEmail)) {
    return {
      success: false,
      error: ACCESS_REQUEST_ALREADY_REGISTERED_MESSAGE,
      alreadyRegistered: true,
    };
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("access_requests").insert({
    name: parsed.data.name,
    email: normalizedEmail,
    status: "pending",
  });

  if (error) {
    console.error("submitAccessRequest:", error);
    return { success: false, error: error.message };
  }

  try {
    await sendAccessRequestConfirmation({
      name: parsed.data.name,
      email: parsed.data.email,
    });
  } catch (emailError) {
    console.error("submitAccessRequest confirmation email:", emailError);
  }

  return { success: true };
}
