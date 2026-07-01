"""
News_Pond — Tools & models pipeline
===================================

Two complementary strategies so new tools surface automatically:

1. TARGETED feeds  — official blogs for things we always want (Gemini, GPT, Claude,
   Python, Tailwind). Precise: items are keyword-matched to a known slug.

2. DISCOVERY feeds — broad AI / dev-news feeds. Every item is run through an LLM
   *classifier* that decides "is this a NEW or updated developer tool / AI model?"
   and, if so, extracts its name, slug, and category. This is what makes brand-new
   tools (e.g. a fresh model from ZhipuAI) appear without anyone hardcoding them.

Both write into the same technologies/updates tables, deduped by updates.source_url.
"""

from __future__ import annotations

import time
from dataclasses import dataclass

import feedparser

from common import llm_json
from supabase import Client

ALLOWED_ACCENTS = {"violet", "cyan", "emerald"}
ALLOWED_CATEGORIES = {
    "Frontier Models",
    "Languages",
    "Frameworks",
    "AI Tools",
    "Developer Tools",
}


@dataclass
class Targeted:
    feed_url: str
    tech_slug: str
    keywords: tuple[str, ...]


# Precise, always-tracked sources.
TARGETED_SOURCES: list[Targeted] = [
    Targeted("https://blog.google/technology/google-deepmind/rss/", "gemini-pro",
             ("gemini", "deepmind")),
    Targeted("https://openai.com/blog/rss.xml", "gpt", ("gpt", "openai", "o1", "o3")),
    Targeted("https://www.anthropic.com/rss.xml", "claude-opus", ("claude", "anthropic", "opus")),
    Targeted("https://blog.python.org/feeds/posts/default", "python", ("python",)),
    Targeted("https://tailwindcss.com/feeds/feed.xml", "tailwindcss", ("tailwind",)),
]

TECH_DEFAULTS: dict[str, dict] = {
    "gemini-pro": {"name": "Gemini Pro", "category": "Frontier Models", "accent_color": "cyan"},
    "gpt": {"name": "GPT", "category": "Frontier Models", "accent_color": "emerald"},
    "claude-opus": {"name": "Claude Opus", "category": "Frontier Models", "accent_color": "violet"},
    "python": {"name": "Python", "category": "Languages", "accent_color": "emerald"},
    "tailwindcss": {"name": "Tailwind CSS", "category": "Frameworks", "accent_color": "cyan"},
}

# Broad feeds — anything genuinely new gets discovered & auto-created.
DISCOVERY_FEEDS: list[str] = [
    "https://huggingface.co/blog/feed.xml",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
    "https://venturebeat.com/category/ai/feed/",
    "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    "https://hnrss.org/frontpage?points=150",  # only high-signal HN items
]

ITEMS_PER_TARGETED = 10
ITEMS_PER_DISCOVERY = 12


# --------------------------------------------------------------------------- #
# LLM helpers
# --------------------------------------------------------------------------- #
def structure_known(title: str, content: str) -> dict:
    """Condense a targeted-feed item into clean fields (title/summary/version)."""
    fallback = {"title": title[:90], "summary": (content or "")[:200] or None, "version": None}
    data = llm_json(
        "You are a precise tech-news editor. Given a raw feed item, return STRICT JSON:\n"
        '{"title": "<concise headline, max 90 chars>",\n'
        ' "summary": "<one neutral sentence, max 200 chars>",\n'
        ' "version": "<version string introduced, or null>"}\n\n'
        f"Raw title: {title}\nRaw content: {content[:1500]}\n\n"
        "Return ONLY the JSON object."
    )
    if not data:
        return fallback
    return {
        "title": (data.get("title") or title)[:90],
        "summary": data.get("summary"),
        "version": data.get("version"),
    }


def classify_discovery(title: str, content: str) -> dict | None:
    """Decide if a broad-feed item announces a developer tool / AI model.

    Returns a dict ready to upsert, or None if it's not relevant (news, opinion,
    funding gossip, etc.) or the LLM is unavailable.
    """
    data = llm_json(
        "You curate a tracker of programming languages, frameworks, AI models, and "
        "developer tools. Decide if the item below announces a NEW or UPDATED such "
        "tool/model that a software engineer would want to try. Ignore pure funding "
        "news, opinion, drama, and non-technical items.\n\n"
        "Return STRICT JSON:\n"
        '{"relevant": true|false,\n'
        ' "name": "<official tool/model name, e.g. \'GLM-4.6\' or \'Bun\'>",\n'
        ' "slug": "<lowercase-kebab-id, e.g. \'glm\' or \'bun\'>",\n'
        ' "category": "Frontier Models|Languages|Frameworks|AI Tools|Developer Tools",\n'
        ' "accent_color": "violet|cyan|emerald",\n'
        ' "tagline": "<=70 char one-liner>",\n'
        ' "title": "<=90 char headline>",\n'
        ' "summary": "<=200 char neutral sentence>",\n'
        ' "version": "<version if any, else null>"}\n\n'
        f"Item title: {title}\nItem content: {content[:1500]}\n\n"
        "Return ONLY the JSON object.",
        max_tokens=350,
    )
    if not data or not data.get("relevant"):
        return None
    slug = (data.get("slug") or "").strip().lower()
    name = (data.get("name") or "").strip()
    if not slug or not name:
        return None
    category = data.get("category") if data.get("category") in ALLOWED_CATEGORIES else "AI Tools"
    accent = data.get("accent_color") if data.get("accent_color") in ALLOWED_ACCENTS else "cyan"
    return {
        "slug": slug,
        "name": name[:60],
        "category": category,
        "accent_color": accent,
        "tagline": (data.get("tagline") or None),
        "title": (data.get("title") or title)[:90],
        "summary": data.get("summary"),
        "version": data.get("version"),
    }


# --------------------------------------------------------------------------- #
# DB helpers
# --------------------------------------------------------------------------- #
def get_or_create_technology(db: Client, slug: str, defaults: dict) -> str | None:
    existing = db.table("technologies").select("id").eq("slug", slug).execute()
    if existing.data:
        return existing.data[0]["id"]
    if not defaults.get("name"):
        return None
    created = db.table("technologies").insert({"slug": slug, **defaults}).execute()
    print(f"  + discovered technology '{slug}' ({defaults.get('name')})")
    return created.data[0]["id"]


def insert_update(db: Client, tech_id: str, fields: dict, source_url: str, published: str | None):
    db.table("updates").upsert(
        {
            "technology_id": tech_id,
            "title": fields["title"],
            "summary": fields["summary"],
            "version": fields["version"],
            "source_url": source_url,
            "published_at": published,
        },
        on_conflict="source_url",
        ignore_duplicates=True,
    ).execute()
    if fields.get("version"):
        db.table("technologies").update({"current_version": fields["version"]}).eq(
            "id", tech_id
        ).execute()


def _published(entry) -> str | None:
    if getattr(entry, "published_parsed", None):
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", entry.published_parsed)
    return None


# --------------------------------------------------------------------------- #
# Entry point
# --------------------------------------------------------------------------- #
def run(db: Client) -> int:
    total = 0
    print("\n=== TOOLS: targeted feeds ===")
    for src in TARGETED_SOURCES:
        print(f"→ {src.feed_url}")
        feed = feedparser.parse(src.feed_url)
        tech_id = get_or_create_technology(db, src.tech_slug, TECH_DEFAULTS.get(src.tech_slug, {}))
        if not tech_id:
            continue
        for entry in feed.entries[:ITEMS_PER_TARGETED]:
            title = entry.get("title", "")
            if not any(k in title.lower() for k in src.keywords):
                continue
            link = entry.get("link")
            if not link:
                continue
            content = entry.get("summary", "") or entry.get("description", "")
            fields = structure_known(title, content)
            insert_update(db, tech_id, fields, link, _published(entry))
            print(f"  • {fields['title']}")
            total += 1

    print("\n=== TOOLS: discovery feeds (auto-detect new tools) ===")
    for url in DISCOVERY_FEEDS:
        print(f"→ {url}")
        try:
            feed = feedparser.parse(url)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! feed error: {exc}")
            continue
        for entry in feed.entries[:ITEMS_PER_DISCOVERY]:
            title = entry.get("title", "")
            link = entry.get("link")
            if not title or not link:
                continue
            content = entry.get("summary", "") or entry.get("description", "")
            info = classify_discovery(title, content)
            if not info:
                continue
            tech_id = get_or_create_technology(
                db,
                info["slug"],
                {
                    "name": info["name"],
                    "category": info["category"],
                    "accent_color": info["accent_color"],
                    "tagline": info["tagline"],
                },
            )
            if not tech_id:
                continue
            insert_update(db, tech_id, info, link, _published(entry))
            print(f"  • [{info['slug']}] {info['title']}")
            total += 1

    return total
