import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Technology, Update, Opportunity } from "@/lib/types";
import Hero from "@/components/Hero";
import CategoryGrid from "@/components/CategoryGrid";
import HotTopicsFeed from "@/components/HotTopicsFeed";
import OpportunityCard from "@/components/OpportunityCard";

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

  // 2) Latest updates for the hero ticker.
  const { data: latest } = await supabase
    .from("updates")
    .select("*")
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

  // 4) Opportunities preview — soonest-closing, featured first (India-first ordering
  //    is applied in the scraper/DB; here we just take the freshest slice).
  const { data: opps } = await supabase
    .from("opportunities")
    .select("*")
    .order("is_featured", { ascending: false })
    .order("deadline", { ascending: true, nullsFirst: false })
    .limit(6);

  const technologies = (techs ?? []) as Technology[];
  const opportunities = (opps ?? []) as Opportunity[];

  return (
    <main className="min-h-screen">
      <Hero totalTracked={technologies.length} latest={(latest ?? []) as Update[]} />
      <CategoryGrid techs={technologies} />

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
    </main>
  );
}
