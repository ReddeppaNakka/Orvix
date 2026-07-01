import type { AccentColor, Opportunity, OpportunityKind } from "@/lib/types";

/**
 * Premium opportunity card — hackathons, competitions, conferences, internships, jobs.
 * Mirrors TechCard's glass + neon-glow language, but surfaces the things a fresher
 * actually cares about: deadline, location, prize, and a direct Apply link.
 *
 * The whole card opens the external source in a new tab.
 */

const ACCENT: Record<AccentColor, { glow: string; ring: string; badge: string; cta: string }> = {
  violet: {
    glow: "hover:shadow-glow-violet",
    ring: "group-hover:ring-violet-400/50",
    badge: "bg-violet-500/15 text-violet-300 border-violet-400/30",
    cta: "text-violet-300",
  },
  cyan: {
    glow: "hover:shadow-glow-cyan",
    ring: "group-hover:ring-cyan-400/50",
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
    cta: "text-cyan-300",
  },
  emerald: {
    glow: "hover:shadow-glow-emerald",
    ring: "group-hover:ring-emerald-400/50",
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    cta: "text-emerald-300",
  },
};

const KIND_META: Record<OpportunityKind, { label: string; icon: string }> = {
  hackathon: { label: "Hackathon", icon: "⚡" },
  competition: { label: "Competition", icon: "🏆" },
  conference: { label: "Conference", icon: "🎤" },
  internship: { label: "Internship", icon: "🎓" },
  job: { label: "Job", icon: "💼" },
  scholarship: { label: "Scholarship", icon: "📚" },
};

/** Human, timezone-stable deadline label computed on the server (no hydration drift). */
function deadlineLabel(deadline: string | null): { text: string; urgent: boolean; closed: boolean } {
  if (!deadline) return { text: "Rolling / no deadline", urgent: false, closed: false };
  const end = new Date(deadline).getTime();
  const days = Math.ceil((end - Date.now()) / 86_400_000);
  if (days < 0) return { text: "Closed", urgent: false, closed: true };
  if (days === 0) return { text: "Closes today", urgent: true, closed: false };
  if (days === 1) return { text: "Closes tomorrow", urgent: true, closed: false };
  if (days <= 7) return { text: `Closes in ${days} days`, urgent: true, closed: false };
  return {
    text: `Closes ${new Date(deadline).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
    urgent: false,
    closed: false,
  };
}

export default function OpportunityCard({ opp }: { opp: Opportunity }) {
  const accent = ACCENT[opp.accent_color] ?? ACCENT.cyan;
  const kind = KIND_META[opp.kind] ?? { label: opp.kind, icon: "•" };
  const dl = deadlineLabel(opp.deadline);

  return (
    <a
      href={opp.source_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group glass relative flex flex-col overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 ${accent.glow} ${
        dl.closed ? "opacity-60" : ""
      }`}
    >
      {/* Top row: kind badge + deadline pill */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${accent.badge}`}
        >
          <span aria-hidden>{kind.icon}</span>
          {kind.label}
        </span>
        <span
          className={`shrink-0 text-xs font-medium ${
            dl.closed ? "text-zinc-600" : dl.urgent ? "text-rose-300" : "text-zinc-400"
          }`}
        >
          {dl.text}
        </span>
      </div>

      {/* Title + organizer */}
      <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-zinc-100 group-hover:text-white">
        {opp.title}
      </h3>
      {opp.organizer && (
        <p className="mt-0.5 text-sm text-zinc-500">by {opp.organizer}</p>
      )}

      {/* Description */}
      {opp.description && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{opp.description}</p>
      )}

      {/* Meta chips: location, prize, eligibility */}
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {(opp.location || opp.is_remote) && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-300">
            📍 {opp.is_remote ? "Remote" : opp.location}
            {opp.country && opp.country !== "Global" ? ` · ${opp.country}` : ""}
          </span>
        )}
        {opp.prize && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-amber-200/90">
            💰 {opp.prize}
          </span>
        )}
        {opp.eligibility && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 text-zinc-400">
            ✅ {opp.eligibility}
          </span>
        )}
      </div>

      {/* CTA */}
      <span
        className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${accent.cta} transition-colors`}
      >
        {dl.closed ? "View details" : "Apply / Register"}
        <svg
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </span>

      <span
        className={`pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-transparent transition ${accent.ring}`}
      />
    </a>
  );
}
