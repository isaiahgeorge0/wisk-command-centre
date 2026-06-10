import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ personalised: false });
  }

  const { data } = await supabase
    .from("user_preferences")
    .select("personalisation_completed")
    .eq("user_id", user.id)
    .maybeSingle();

  const personalised = data?.personalisation_completed === true;

  return NextResponse.json({ personalised });
}
