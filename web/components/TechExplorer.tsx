"use client";

import { useMemo, useState } from "react";
import type { Technology } from "@/lib/types";
import TechCard from "./TechCard";

/**
 * Searchable, filterable technology explorer. Replaces the plain grid so users can
 * FIND any tracked technology instead of scrolling. Search + category filtering run
 * client-side over the full list passed from the server, so it's instant.
 */
export default function TechExplorer({ techs }: { techs: Technology[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(techs.map((t) => t.category))).sort()],
    [techs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return techs.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.tagline?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [techs, query, category]);

  // Group the filtered results by category, preserving first-seen order.
  const groups = filtered.reduce<Record<string, Technology[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Explore technologies
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {techs.length} tracked · search or filter to find any of them
        </p>
      </div>

      {/* Search box */}
      <div className="relative mb-4">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
            clipRule="evenodd"
          />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search technologies… (e.g. python, gemini, framework, cursor)"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-white/25"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 hover:text-zinc-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="mb-10 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              category === c
                ? "bg-white/90 text-canvas"
                : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200"
            }`}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-zinc-500">
          No technologies match{query ? ` “${query}”` : " these filters"} yet.
        </p>
      ) : (
        Object.entries(groups).map(([cat, items]) => (
          <div key={cat} className="mb-14 last:mb-0">
            <div className="mb-6 flex items-end justify-between">
              <h3 className="text-xl font-semibold tracking-tight text-zinc-100">{cat}</h3>
              <span className="text-sm text-zinc-500">{items.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((tech) => (
                <TechCard key={tech.id} tech={tech} />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
