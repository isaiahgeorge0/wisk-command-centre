import { z } from "zod";

import { cachedSystemParts } from "@/lib/ai/anthropic";
import { logUsage } from "@/lib/ai/usage-logger";
import { hasResearchAccess } from "@/lib/billing/access";
import {
  clampCitedClaims,
  formatCitationsBlock,
} from "@/lib/research/citations";
import { callAnthropicJson } from "@/lib/research/anthropic-json";
import { routeAndSearchResearchTools } from "@/lib/research/tool-routing";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  leadAutoEnrichmentHasContent,
  type Lead,
  type LeadAutoEnrichment,
  type LeadAutoEnrichmentLink,
  type LeadResearchClaim,
} from "@/lib/leads/types";
import { revalidatePath } from "next/cache";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
]);

const enrichmentOutputSchema = z.object({
  companySize: z
    .object({
      text: z.string().trim().min(1),
      citationIndex: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  likelyRole: z
    .object({
      text: z.string().trim().min(1),
      citationIndex: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1),
        url: z.string().trim().url(),
        citationIndex: z.number().int().nonnegative(),
      })
    )
    .max(6)
    .optional(),
});

export function extractEmailDomain(email: string | null | undefined): string | null {
  if (!email?.trim()) return null;
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 0) return null;
  const domain = email.trim().toLowerCase().slice(at + 1);
  if (!domain || !domain.includes(".")) return null;
  return domain;
}

export function extractCorporateEmailDomain(
  email: string | null | undefined
): string | null {
  const domain = extractEmailDomain(email);
  if (!domain) return null;
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

/** URLs or bare domains found in notes (website signal). */
export function extractDomainsFromNotes(
  notes: string | null | undefined
): string[] {
  if (!notes?.trim()) return [];
  const found = new Set<string>();
  const urlRe = /https?:\/\/[^\s<>"')]+/gi;
  for (const match of notes.matchAll(urlRe)) {
    try {
      const host = new URL(match[0]).hostname.replace(/^www\./, "");
      if (host.includes(".")) found.add(host);
    } catch {
      // ignore invalid
    }
  }
  const bareRe =
    /(?:^|[\s(,])((?:[a-z0-9-]+\.)+(?:com|co\.uk|io|ai|net|org|uk|dev))(?:$|[\s,),])/gi;
  for (const match of notes.matchAll(bareRe)) {
    const host = match[1]?.toLowerCase();
    if (host) found.add(host);
  }
  return [...found];
}

/**
 * Enough to search: corporate email domain or a website/domain in notes.
 * Skips name-and-phone-only leads (no company/website signal).
 */
export function canAutoEnrichLead(
  lead: Pick<Lead, "email" | "notes">
): boolean {
  if (extractCorporateEmailDomain(lead.email)) return true;
  return extractDomainsFromNotes(lead.notes).length > 0;
}

function clampClaim(
  claim: LeadResearchClaim | null | undefined,
  citationCount: number
): LeadResearchClaim | null {
  if (!claim?.text.trim()) return null;
  const [clamped] = clampCitedClaims([claim], citationCount);
  return clamped ?? null;
}

function clampLinks(
  links: LeadAutoEnrichmentLink[],
  citationCount: number
): LeadAutoEnrichmentLink[] {
  return links.filter(
    (link) =>
      link.url.trim() &&
      link.citationIndex >= 0 &&
      link.citationIndex < citationCount
  );
}

/**
 * Background enrichment for a newly created lead. Safe to call from `after()` —
 * never throws to the create path; logs and returns on failure.
 */
export async function runLeadAutoEnrichment(input: {
  userId: string;
  leadId: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const entitled = await hasResearchAccess(input.userId, admin);
    if (!entitled) return;

    const { data: leadRow, error: leadError } = await admin
      .from("leads")
      .select("*")
      .eq("id", input.leadId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (leadError || !leadRow) {
      console.error("lead auto-enrichment: lead fetch failed", leadError);
      return;
    }

    const lead = leadRow as Lead;
    if (lead.auto_enrichment_generated_at) return;
    if (!canAutoEnrichLead(lead)) return;

    const corporateDomain = extractCorporateEmailDomain(lead.email);
    const noteDomains = extractDomainsFromNotes(lead.notes);
    const domainHint = corporateDomain ?? noteDomains[0] ?? null;

    const contextLines = [
      `Lead name: ${lead.name}`,
      `Service interest: ${lead.service_interest}`,
      lead.email ? `Email: ${lead.email}` : null,
      domainHint ? `Company/domain signal: ${domainHint}` : null,
      lead.notes?.trim() ? `Notes: ${lead.notes.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const routed = await routeAndSearchResearchTools({
      userId: input.userId,
      usageFeature: "lead_auto_enrichment",
      routingUserPrompt: `${contextLines}

Decide a light search plan for automatic lead enrichment: company size signals, likely role/title for this person or company contact, and public links (company site, LinkedIn if findable). Prefer Exa for company/people background; add Tavily only if current web signals help.`,
      fallbackTavilyQuery: domainHint
        ? `${domainHint} company size employees`
        : `${lead.name} company size employees`,
      fallbackExaQuery: domainHint
        ? `${lead.name} ${domainHint} company LinkedIn profile`
        : `${lead.name} company LinkedIn profile role`,
    });

    const citations = routed.citations;
    if (citations.length === 0) return;

    const synthesisSystem = cachedSystemParts([
      {
        text: `You are Winston doing a light automatic lead enrichment pass (not a full research brief).
Return ONLY valid JSON:
{
  "companySize": { "text": "short size signal", "citationIndex": 0 } | null,
  "likelyRole": { "text": "likely role or title", "citationIndex": 0 } | null,
  "links": [{ "label": "Company site|LinkedIn|Other", "url": "https://...", "citationIndex": 0 }]
}
Rules:
- Every non-null claim and every link must cite a valid source index.
- Prefer null / empty over guesses. No invented facts or figures.
- Number guardrail: never invent, round, or recalculate headcount or other figures. If you mention a number, copy it character-for-character from a source snippet.
- Keep companySize and likelyRole to one short phrase each.
- links: only real URLs from sources (company site, LinkedIn, etc.), max 4.
- No markdown.`,
        cache: true,
      },
    ]);

    const synthesisResponse = await callAnthropicJson({
      system: synthesisSystem,
      userPrompt: `${contextLines}

Sources:
${formatCitationsBlock(citations)}

Generate the light enrichment JSON now.`,
      maxTokens: 700,
    });

    await logUsage(
      input.userId,
      "lead_auto_enrichment",
      synthesisResponse.usage.input,
      synthesisResponse.usage.output
    );

    const parsed = enrichmentOutputSchema.parse(
      JSON.parse(synthesisResponse.jsonText)
    );

    const enrichment: LeadAutoEnrichment = {
      companySize: clampClaim(parsed.companySize ?? null, citations.length),
      likelyRole: clampClaim(parsed.likelyRole ?? null, citations.length),
      links: clampLinks(parsed.links ?? [], citations.length),
      citations,
      generatedAt: new Date().toISOString(),
    };

    if (!leadAutoEnrichmentHasContent(enrichment)) return;

    const { error: updateError } = await admin
      .from("leads")
      .update({
        auto_enrichment: enrichment,
        auto_enrichment_generated_at: enrichment.generatedAt,
      })
      .eq("id", input.leadId)
      .eq("user_id", input.userId);

    if (updateError) {
      console.error("lead auto-enrichment: store failed", updateError);
      return;
    }

    revalidatePath("/leads");
    revalidatePath("/research");
  } catch (error) {
    console.error("lead auto-enrichment failed:", error);
  }
}
