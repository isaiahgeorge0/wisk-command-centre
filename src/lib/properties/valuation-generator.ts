import type { SupabaseClient } from "@supabase/supabase-js";

import { getPropertyTypeDisplayName } from "@/lib/properties/display-names";
import { formatPropertyAddress } from "@/lib/properties/format";
import type {
  Property,
  PropertyComparable,
  SearchLevel,
  ValuationConfidence,
  ValuationWebSource,
} from "@/lib/properties/types";

type AnthropicTextBlock = { type: "text"; text: string };
type AnthropicWebSearchResult = {
  type: "web_search_result";
  url?: string;
  title?: string;
  page_age?: string;
};
type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicWebSearchResult
  | { type: string };

type AnthropicResponse = {
  content: AnthropicContentBlock[];
  usage?: { input_tokens: number; output_tokens: number };
};

export type ValuationResult = {
  rental_min: number | null;
  rental_max: number | null;
  sale_min: number | null;
  sale_max: number | null;
  confidence: ValuationConfidence;
  search_level: SearchLevel;
  reasoning: string;
  low_evidence_warning: boolean;
  web_sources: ValuationWebSource[];
  inputTokens: number;
  outputTokens: number;
};

const FALLBACK_RESULT: Omit<ValuationResult, "inputTokens" | "outputTokens"> = {
  rental_min: null,
  rental_max: null,
  sale_min: null,
  sale_max: null,
  confidence: "low",
  search_level: "town",
  reasoning:
    "Unable to generate estimate — Winston could not parse a complete market analysis from the response. Please try again later or add manual comparables to improve the next estimate.",
  low_evidence_warning: true,
  web_sources: [],
};

function buildSystemPrompt(property: Property): string {
  const address = formatPropertyAddress(property);
  const propertyType = getPropertyTypeDisplayName(property.property_type);

  return `You are Winston, a property market analyst. Analyse the provided property details and market data to give rental and sale price recommendations for a UK landlord.

You have access to web search. Search for:
1. Current rental prices for similar properties in ${property.postcode} — if fewer than 3 results found at postcode level, search at town/city level (${property.city})
2. Recent sale prices for similar properties in the same area

After searching, provide your analysis.

Property details:
- Address: ${address}
- Postcode: ${property.postcode}
- City: ${property.city}
- Type: ${propertyType}
- Bedrooms: ${property.bedrooms ?? "Unknown"}
- Bathrooms: ${property.bathrooms ?? "Unknown"}
- Current monthly rent: ${property.monthly_rent != null ? `£${property.monthly_rent}` : "Not set"}
- Current value: ${property.current_value != null ? `£${property.current_value}` : "Not set"}

Return ONLY a raw JSON object with this structure:
{
  "rental_min": number,
  "rental_max": number,
  "sale_min": number | null,
  "sale_max": number | null,
  "confidence": "high" | "medium" | "low",
  "search_level": "postcode" | "town",
  "reasoning": string,
  "low_evidence_warning": boolean
}

Confidence guidelines:
- high: 5+ comparable properties found at postcode level
- medium: 2-4 comparables at postcode level OR 5+ at town level
- low: fewer than 2 comparables found OR data is more than 12 months old

If low_evidence_warning is true, reasoning must explicitly state that limited data was available and the estimate should be treated as a rough guide only.

All prices in GBP. rental_min/max are monthly figures. sale_min/max are total property values.
The response must start with { and end with }. No markdown, no code fences, no explanation.`;
}

function formatComparables(comparables: PropertyComparable[]): string {
  if (comparables.length === 0) return "None provided";

  return comparables
    .map((item, index) => {
      const type = item.comparable_type === "rental" ? "Rental" : "Sale";
      const parts = [
        `${index + 1}. ${item.address}`,
        `${type}: £${item.price}`,
        item.date ? `Date: ${item.date}` : null,
        item.source ? `Source: ${item.source}` : null,
        item.bedrooms != null ? `Bedrooms: ${item.bedrooms}` : null,
        item.property_type ? `Type: ${item.property_type}` : null,
        item.notes ? `Notes: ${item.notes}` : null,
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .join("\n");
}

function normalizeRentalValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function extractTextFromContent(content: AnthropicContentBlock[]): string {
  return content
    .filter((block): block is AnthropicTextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function parseValuationJson(text: string): Omit<
  ValuationResult,
  "web_sources" | "inputTokens" | "outputTokens"
> | null {
  const cleaned = text
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();

  const candidates = [cleaned];
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch && jsonMatch[0] !== cleaned) {
    candidates.push(jsonMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const json = JSON.parse(candidate) as {
        rental_min?: number;
        rental_max?: number;
        sale_min?: number | null;
        sale_max?: number | null;
        confidence?: ValuationConfidence;
        search_level?: SearchLevel;
        reasoning?: string;
        low_evidence_warning?: boolean;
      };

      const rentalMin = normalizeRentalValue(json.rental_min);
      const rentalMax = normalizeRentalValue(json.rental_max);

      if (!rentalMin || !rentalMax || !json.confidence || !json.search_level) {
        continue;
      }

      return {
        rental_min: rentalMin,
        rental_max: rentalMax,
        sale_min: json.sale_min ?? null,
        sale_max: json.sale_max ?? null,
        confidence: json.confidence,
        search_level: json.search_level,
        reasoning: json.reasoning?.trim() || "Market analysis completed.",
        low_evidence_warning: json.low_evidence_warning === true,
      };
    } catch {
      // try next candidate
    }
  }

  return null;
}

function extractWebSources(content: AnthropicContentBlock[]): ValuationWebSource[] {
  const sources: ValuationWebSource[] = [];

  for (const block of content) {
    if (block.type !== "web_search_result") continue;
    const result = block as AnthropicWebSearchResult;
    if (!result.url) continue;
    sources.push({
      title: result.title?.trim() || result.url,
      url: result.url,
      snippet: result.page_age
        ? `Page age: ${result.page_age}`
        : "Market listing",
    });
  }

  return sources;
}

export async function generatePropertyValuation(
  property: Property,
  comparables: PropertyComparable[]
): Promise<ValuationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ...FALLBACK_RESULT, inputTokens: 0, outputTokens: 0 };
  }

  const postcode = property.postcode.trim();
  const propertyType = getPropertyTypeDisplayName(property.property_type);
  const bedrooms = property.bedrooms ?? "unknown";

  const userPrompt = `Search the UK property market and analyse this property.

Suggested searches:
- "rental prices ${postcode} ${propertyType} ${bedrooms} bedrooms 2024 2025"
- "house prices ${postcode} ${propertyType} ${bedrooms} bedrooms sold 2024 2025"

Manual comparables provided by landlord:
${formatComparables(comparables)}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: buildSystemPrompt(property),
        tools: [
          {
            type: "web_search_20250305",
            name: "web_search",
            max_uses: 5,
          },
        ],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[generatePropertyValuation] Claude error:", err);
      return { ...FALLBACK_RESULT, inputTokens: 0, outputTokens: 0 };
    }

    const data = (await response.json()) as AnthropicResponse;
    const combinedText = extractTextFromContent(data.content);
    const textBlocks = data.content.filter(
      (block): block is AnthropicTextBlock => block.type === "text"
    );
    const lastTextBlock = textBlocks.at(-1)?.text ?? "";

    if (!combinedText && !lastTextBlock) {
      return { ...FALLBACK_RESULT, inputTokens: 0, outputTokens: 0 };
    }

    const parsed =
      parseValuationJson(combinedText) ??
      (lastTextBlock !== combinedText
        ? parseValuationJson(lastTextBlock)
        : null);
    const webSources = extractWebSources(data.content);

    if (!parsed) {
      return {
        ...FALLBACK_RESULT,
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
      };
    }

    return {
      ...parsed,
      web_sources: webSources,
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
    };
  } catch (error) {
    console.error("[generatePropertyValuation] error:", error);
    return { ...FALLBACK_RESULT, inputTokens: 0, outputTokens: 0 };
  }
}

export async function fetchPropertyForValuation(
  propertyId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<Property | null> {
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as Property | null) ?? null;
}
