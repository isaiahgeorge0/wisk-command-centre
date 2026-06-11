"use server";

import { z } from "zod";

import { sendAccessRequestConfirmation } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

const accessRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
});

export type AccessRequestResult =
  | { success: true }
  | { success: false; error: string };

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

  const supabase = createAdminClient();

  const { error } = await supabase.from("access_requests").insert({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
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
