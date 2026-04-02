import Link from "next/link";

const points = [
  "Prompt generator for title/hook/thumbnail ideas",
  "Story writer and scene planner for short or long form",
  "Image, voice, and video pipeline with export package",
  "Team-ready architecture with secure server routes"
];

export function Hero() {
  return (
    <main className="app-shell py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <section>
          <p className="inline-flex rounded-full border border-lagoon/40 bg-lagoon/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-paper/80">
            Multi-agent YouTube production
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-paper sm:text-5xl lg:text-6xl">
            Build videos in your browser with an agent team that works together.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-paper/70 sm:text-lg">
            This project gives you a real full-stack foundation, not a fake demo. Run generator agents, inspect outputs,
            and ship in phases to GitHub and production.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="w-full rounded-2xl bg-paper px-5 py-3 text-center text-sm font-semibold text-night transition hover:translate-y-[-1px] sm:w-auto"
            >
              Open the studio
            </Link>
            <a
              href="#stack"
              className="w-full rounded-2xl border border-paper/20 px-5 py-3 text-center text-sm font-semibold text-paper/90 transition hover:bg-paper/5 sm:w-auto"
            >
              View architecture
            </a>
          </div>
        </section>

        <section className="glass-card rounded-3xl p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-paper/50">Pipeline Status</p>
          <ul className="mt-4 space-y-3">
            {points.map((point) => (
              <li key={point} className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-paper/80">
                {point}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section id="stack" className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["Frontend", "Next.js App Router + TypeScript + Tailwind"],
          ["Backend", "Route handlers with typed request validation"],
          ["Agents", "Provider abstraction to swap mock with real APIs"],
          ["Next Phase", "Supabase auth, DB, storage, and team workflows"]
        ].map(([title, body]) => (
          <article key={title} className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-paper/60">{title}</p>
            <p className="mt-2 text-sm text-paper/80">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
