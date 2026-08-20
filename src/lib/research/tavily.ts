export type TavilySearchDepth = "basic" | "advanced";

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
};

type TavilyResponse = {
  results?: TavilySearchResult[];
  answer?: string;
};

export async function searchTavily(input: {
  query: string;
  searchDepth?: TavilySearchDepth;
  maxResults?: number;
}): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: input.query,
      search_depth: input.searchDepth ?? "basic",
      max_results: input.maxResults ?? 5,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  const data = (await response.json()) as TavilyResponse & {
    error?: string;
    detail?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error ??
        data.detail ??
        `Tavily request failed with status ${response.status}`
    );
  }

  return (data.results ?? []).filter(
    (row): row is TavilySearchResult =>
      typeof row.title === "string" &&
      typeof row.url === "string" &&
      typeof row.content === "string"
  );
}
