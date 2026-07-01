import type { Technology } from "@/lib/types";
import TechCard from "./TechCard";

/**
 * Section 1 — the interactive grid.
 * Groups technologies by category and renders an elegant responsive grid of cards.
 */
export default function CategoryGrid({ techs }: { techs: Technology[] }) {
  // Group into { category: Technology[] } preserving first-seen order.
  const groups = techs.reduce<Record<string, Technology[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      {Object.entries(groups).map(([category, items]) => (
        <div key={category} className="mb-16 last:mb-0">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
              {category}
            </h2>
            <span className="text-sm text-zinc-500">{items.length} tracked</span>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((tech) => (
              <TechCard key={tech.id} tech={tech} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
