/**
 * Server-only web search via Tavily (https://tavily.com) — a search API built for
 * grounding LLM answers. Returns a short synthesized answer plus source snippets so
 * the brief can be written from REAL, current, citable information instead of the
 * model's memory. Returns null when no key is set (feature degrades gracefully).
 */
import "server-only";

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}
export interface SearchResponse {
  answer: string;
  results: SearchResult[];
}

export async function webSearch(query: string): Promise<SearchResponse | null> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return null;
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        api_key: key, // also accepted in body (older API) — harmless with the header
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const results: SearchResult[] = Array.isArray(data?.results)
      ? data.results
          .map((r: Record<string, unknown>) => ({
            title: String(r.title ?? ""),
            url: String(r.url ?? ""),
            content: String(r.content ?? ""),
          }))
          .filter((r: SearchResult) => r.url)
      : [];
    return { answer: typeof data?.answer === "string" ? data.answer : "", results };
  } catch {
    return null;
  }
}
