import Link from "next/link";
import type { Update, Technology } from "@/lib/types";

/**
 * High-impact hero header.
 * Shows a live, auto-generated summary line plus the freshest few headlines
 * so the homepage always reflects the latest scrape. Each headline opens the
 * detail popup (via /?topic=<slug>) rather than the external source link.
 */
export default function Hero({
  totalTracked,
  latest,
}: {
  totalTracked: number;
  // Each update is pre-joined with its parent technology's slug.
  latest: (Update & { technology: Pick<Technology, "slug"> })[];
}) {
  return (
    <header className="relative mx-auto max-w-6xl px-6 pb-10 pt-20 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        Live · auto-updated daily · tracking {totalTracked} technologies
      </span>

      <h1 className="mx-auto mt-6 max-w-3xl bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-5xl font-bold leading-tight tracking-tight text-transparent sm:text-6xl animate-fade-up">
        The pulse of frontier AI & modern tech
      </h1>

      <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-400 animate-fade-up">
        Every model release, language version, and framework update — scraped,
        structured, and surfaced automatically. No stale docs, no manual edits.
      </p>

      {/* Latest headline ticker */}
      {latest.length > 0 && (
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-2 text-left">
          {latest.map((u) => (
            <Link
              key={u.id}
              href={`/?topic=${u.technology.slug}`}
              scroll={false}
              className="glass group flex items-center justify-between rounded-xl px-4 py-3 text-sm transition hover:border-white/20"
            >
              <span className="truncate text-zinc-200">{u.title}</span>
              <span className="ml-3 shrink-0 text-xs text-zinc-500 group-hover:text-zinc-300">
                {u.published_at
                  ? new Date(u.published_at).toLocaleDateString()
                  : "new"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
