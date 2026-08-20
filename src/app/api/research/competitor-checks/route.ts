import { NextResponse } from "next/server";

import { runCompetitorChecks } from "@/lib/research/run-competitor-checks";

function isAuthorised(request: Request): boolean {
  const auth = request.headers.get("authorization");
  return [process.env.CRON_SECRET, process.env.AI_DIGEST_SECRET]
    .filter((secret): secret is string => Boolean(secret))
    .some((secret) => auth === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const summary = await runCompetitorChecks();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[research/competitor-checks]", error);
    return NextResponse.json(
      { error: "Could not run competitor checks." },
      { status: 500 }
    );
  }
}
