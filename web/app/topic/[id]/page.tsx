import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Technology, Update } from "@/lib/types";

export const revalidate = 3600;

// Pre-render a static path for every known technology at build time (optional but fast).
export async function generateStaticParams() {
  const { data } = await supabase.from("technologies").select("slug");
  return (data ?? []).map((t) => ({ id: t.slug }));
}

// In Next.js 15, route `params` is a Promise and must be awaited.
type Params = { params: Promise<{ id: string }> };

export default async function TopicPage({ params }: Params) {
  const { id } = await params;

  // Fetch the technology by its slug (the [id] segment).
  const { data: tech } = await supabase
    .from("technologies")
    .select("*")
    .eq("slug", id)
    .single<Technology>();

  if (!tech) notFound();

  // Fetch its changelog, newest first.
  const { data: updates } = await supabase
    .from("updates")
    .select("*")
    .eq("technology_id", tech.id)
    .order("published_at", { ascending: false, nullsFirst: false });

  const list = (updates ?? []) as Update[];

  // Accent → border/text classes (static strings for JIT safety).
  const accent =
    { violet: "text-violet-300", cyan: "text-cyan-300", emerald: "text-emerald-300" }[
      tech.accent_color
    ] ?? "text-violet-300";

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-200"
      >
        <svg className="h-4 w-4 rotate-180" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
        Back to dashboard
      </Link>

      {/* Hero block for the topic */}
      <div className="glass relative mt-6 overflow-hidden rounded-3xl">
        {tech.image_url && (
          <div className="relative h-56 w-full">
            <Image src={tech.image_url} alt={tech.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-canvas to-transparent" />
          </div>
        )}
        <div className="p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-zinc-500">
              {tech.category}
            </span>
            {tech.current_version && (
              <span className={`rounded-full border border-white/10 px-3 py-1 text-sm ${accent}`}>
                Current: v{tech.current_version}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
            {tech.name}
          </h1>
          {tech.tagline && (
            <p className="mt-2 text-lg text-zinc-400">{tech.tagline}</p>
          )}
          {tech.description && (
            <p className="mt-4 leading-relaxed text-zinc-300">{tech.description}</p>
          )}
          {tech.homepage_url && (
            <a
              href={tech.homepage_url}
              target="_blank"
              rel="noreferrer"
              className={`mt-6 inline-block text-sm font-medium ${accent} hover:underline`}
            >
              Visit official site ↗
            </a>
          )}
        </div>
      </div>

      {/* Timeline of updates */}
      <section className="mt-12">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-100">
          Update history
        </h2>

        {list.length === 0 ? (
          <p className="text-zinc-500">
            No updates scraped yet — the daily job will populate this soon.
          </p>
        ) : (
          <ol className="relative border-l border-white/10 pl-6">
            {list.map((u) => (
              <li key={u.id} className="mb-8 last:mb-0">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-violet-500 shadow-glow-violet" />
                <div className="flex flex-wrap items-center gap-2">
                  <time className="text-xs text-zinc-500">
                    {u.published_at
                      ? new Date(u.published_at).toLocaleDateString()
                      : "recent"}
                  </time>
                  {u.version && (
                    <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-zinc-300">
                      v{u.version}
                    </span>
                  )}
                </div>
                <a
                  href={u.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-lg font-medium text-zinc-100 hover:text-white"
                >
                  {u.title}
                </a>
                {u.summary && (
                  <p className="mt-1 text-zinc-400">{u.summary}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
