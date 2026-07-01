/**
 * Generates (and caches) a structured "brief" for a technology — the rich detail
 * shown in the topic popup.
 *
 * When a Tavily key is configured, the brief is written from REAL web search results
 * (with source links to verify), so it's genuine and current. Without a key it falls
 * back to the model's own knowledge (clearly less reliable for new/obscure tools).
 *
 * Cached for 24h per slug+version via unstable_cache; failures are never cached.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { llmJson } from "./llm";
import { webSearch } from "./search";
import type { Technology, Update } from "./types";

export interface Source {
  title: string;
  url: string;
}

export interface Brief {
  overview: string;
  created_by: string;
  released: string;
  pricing: string;
  features: string[];
  advantages: string[];
  disadvantages: string[];
  use_cases: string[];
  alternatives: string[];
  value: string;
  grounded: boolean; // true = written from web sources
  sources: Source[];
}

const asStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const asList = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim())
    : [];

async function generate(tech: Technology, updatesContext: string): Promise<Brief | null> {
  // 1) Search the web for real, current facts about this tool.
  const query =
    `${tech.name}${tech.tagline ? ` (${tech.tagline})` : ""} — what it is, ` +
    `which company or person created it, key features, pricing, alternatives, pros and cons`;
  const search = await webSearch(query);
  const grounded = !!(search && (search.answer || search.results.length));
  const sources: Source[] = (search?.results ?? [])
    .slice(0, 5)
    .map((r) => ({ title: r.title, url: r.url }));

  // Keep the source context compact so it fits comfortably in the free-tier
  // tokens-per-minute budget (and returns faster). Truncate each result, cap total.
  const sourceText = grounded
    ? [search!.answer, ...search!.results.slice(0, 5).map((r) => `[${r.title}] ${r.content.slice(0, 400)}`)]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 2800)
    : "";

  // 2) Ask the LLM to write the structured brief.
  const schema = `{
  "overview": "<2-4 sentence plain-English explanation>",
  "created_by": "<the company or person that created it>",
  "released": "<when it launched / latest version + rough date>",
  "pricing": "<pricing model: free / open-source / paid tiers / etc.>",
  "features": ["<key feature>", "..."],
  "advantages": ["<advantage, incl. improvements over previous versions or rivals>", "..."],
  "disadvantages": ["<real limitation or drawback>", "..."],
  "use_cases": ["<concrete scenario a developer would use it for>", "..."],
  "alternatives": ["<competing/similar tool>", "..."],
  "value": "<1-2 sentences on why it matters>"
}`;

  const prompt = grounded
    ? `You are a precise technology analyst writing a factual briefing for an entry-level engineer.
Using ONLY the web sources provided below, return STRICT JSON:
${schema}

Rules:
- Base EVERY statement on the sources. Do not use outside knowledge and never invent facts, version numbers, dates, prices, or company names.
- If the sources genuinely don't cover a field, use "Not publicly documented" for text fields and [] for lists. Do not guess.
- 3-6 items per list; short, clear, beginner-friendly.

Tool: ${tech.name} (category: ${tech.category})

WEB SOURCES:
${sourceText}

Return ONLY the JSON object.`
    : `You are a technology analyst. Based on what you reliably know, return STRICT JSON:
${schema}

Rules:
- Be accurate. For anything you are unsure about (especially a niche or very new tool), use "Not publicly documented" / [] rather than inventing specifics. Never fabricate versions, dates, prices, or company names.
- 3-6 items per list; beginner-friendly.

Tool name: ${tech.name}
Category: ${tech.category}
${tech.current_version ? `Version: ${tech.current_version}` : ""}
${tech.tagline ? `Tagline: ${tech.tagline}` : ""}
${tech.description ? `Description: ${tech.description}` : ""}
${updatesContext ? `Recent updates:\n${updatesContext}` : ""}

Return ONLY the JSON object.`;

  const data = await llmJson(prompt);
  if (!data) return null;

  const brief: Brief = {
    overview: asStr(data.overview),
    created_by: asStr(data.created_by),
    released: asStr(data.released),
    pricing: asStr(data.pricing),
    features: asList(data.features),
    advantages: asList(data.advantages),
    disadvantages: asList(data.disadvantages),
    use_cases: asList(data.use_cases),
    alternatives: asList(data.alternatives),
    value: asStr(data.value),
    grounded,
    sources,
  };
  if (!brief.overview && !brief.features.length) return null;
  return brief;
}

export async function getBrief(tech: Technology, updates: Update[]): Promise<Brief | null> {
  const context = updates
    .slice(0, 6)
    .map((u) => `- ${u.title}${u.summary ? `: ${u.summary}` : ""}`)
    .join("\n");

  // Key by slug + version so a new release regenerates. Throw on failure so a transient
  // rate limit / search hiccup isn't cached for 24h — the next open just retries.
  const cached = unstable_cache(
    async () => {
      const b = await generate(tech, context);
      if (!b) throw new Error("brief-unavailable");
      return b;
    },
    ["tech-brief-v2", tech.slug, tech.current_version ?? "na"],
    { revalidate: 86400 },
  );
  try {
    return await cached();
  } catch {
    return null;
  }
}
