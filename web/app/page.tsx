import Link from "next/link";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import type { Technology, Opportunity } from "@/lib/types";
import Hero from "@/components/Hero";
import Highlights from "@/components/Highlights";
import TechExplorer from "@/components/TechExplorer";
import HotTopicsFeed from "@/components/HotTopicsFeed";
import OpportunityCard from "@/components/OpportunityCard";
import TopicModal from "@/components/TopicModal";

/**
 * Homepage — fully dynamic, server-rendered from Supabase.
 *
 * `revalidate = 3600` means Next.js re-fetches at most once an hour (ISR), so the
 * page reflects new scraper data without a redeploy while staying cheap to serve.
 */
export const revalidate = 3600;

export default async function HomePage() {
  // 1) All technologies for the grid.
  const { data: techs } = await supabase
    .from("technologies")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  // 2) Latest updates for the hero ticker (embed the parent tech slug so each row
  //    can open the detail popup instead of the external source link).
  const { data: latest } = await supabase
    .from("updates")
    .select("*, technology:technologies!inner(slug)")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(4);

  // 3) Hot Topics — recent updates joined with their parent technology.
  //    Supabase embeds the related row via the FK relationship.
  const { data: hot } = await supabase
    .from("updates")
    .select(
      "*, technology:technologies!inner(name, slug, accent_color, is_featured)"
    )
    .eq("technology.is_featured", true)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(12);

  // 4) Opportunities preview — featured first, then soonest-closing. Fetch a wider
  //    slice so that after dropping expired ones we still have enough to show 6.
  const { data: opps } = await supabase
    .from("opportunities")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(40);

  // 5) This week's highlights — important, recent updates across all technologies.
  const { data: recent } = await supabase
    .from("updates")
    .select("*, technology:technologies!inner(name, slug, accent_color)")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(60);

  const technologies = (techs ?? []) as Technology[];
  // Keep only currently-open opportunities: no deadline (evergreen) or deadline still
  // in the future. So an important listing stays visible right up until its last date.
  const now = Date.now();
  const openOpps = ((opps ?? []) as Opportunity[]).filter(
    (o) => !o.deadline || new Date(o.deadline).getTime() >= now,
  );
  const opportunities = openOpps.slice(0, 6);

  // Important (importance >= 4) updates from the last 7 days, best first. This keeps big
  // releases pinned for the week instead of sinking under minor news.
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const highlights = ((recent ?? []) as { importance?: number; published_at: string | null }[])
    .filter(
      (u) =>
        (u.importance ?? 0) >= 4 &&
        !!u.published_at &&
        now - new Date(u.published_at).getTime() <= WEEK_MS,
    )
    .sort(
      (a, b) =>
        (b.importance ?? 0) - (a.importance ?? 0) ||
        (a.published_at! < b.published_at! ? 1 : -1),
    )
    .slice(0, 6);

  return (
    <main className="min-h-screen">
      <Hero totalTracked={technologies.length} latest={(latest ?? []) as never} />
      <Highlights items={highlights as never} />
      <TechExplorer techs={technologies} />

      {/* Opportunities for freshers — competitions, hackathons, conferences, internships */}
      {opportunities.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-glow-cyan" />
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                Opportunities for Freshers
              </h2>
            </div>
            <Link
              href="/opportunities"
              className="shrink-0 text-sm font-medium text-cyan-300 transition hover:text-cyan-200"
            >
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((o) => (
              <OpportunityCard key={o.id} opp={o} />
            ))}
          </div>
        </section>
      )}

      {/* `hot` rows carry an embedded `technology` object matching the feed's prop type. */}
      <HotTopicsFeed items={(hot ?? []) as never} />

      <footer className="border-t border-white/5 py-10 text-center text-sm text-zinc-600">
        News_Pond · open source · data auto-refreshed daily via GitHub Actions
      </footer>

      {/* Detail popup — opens when the URL has ?topic=<slug> */}
      <Suspense fallback={null}>
        <TopicModal />
      </Suspense>
    </main>
  );
}
