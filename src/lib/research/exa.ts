export type ExaSearchResult = {
  title: string;
  url: string;
  text: string;
  publishedDate?: string | null;
};

type ExaResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    text?: string;
    publishedDate?: string | null;
  }>;
  error?: string;
};

export async function searchExa(input: {
  query: string;
  numResults?: number;
}): Promise<ExaSearchResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not configured");
  }

  const response = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      query: input.query,
      numResults: input.numResults ?? 5,
      contents: { text: true },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data = (await response.json()) as ExaResponse;
  if (!response.ok) {
    throw new Error(
      data.error ?? `Exa request failed with status ${response.status}`
    );
  }

  return (data.results ?? [])
    .filter(
      (row): row is Required<Pick<ExaSearchResult, "title" | "url" | "text">> &
        Pick<ExaSearchResult, "publishedDate"> =>
        typeof row.title === "string" &&
        typeof row.url === "string" &&
        typeof row.text === "string"
    )
    .map((row) => ({
      title: row.title,
      url: row.url,
      text: row.text,
      publishedDate: row.publishedDate ?? null,
    }));
}
