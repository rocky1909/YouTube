import { AgentRunner } from "@/components/agent-runner";

export default function DashboardPage() {
  return (
    <main className="app-shell py-10 sm:py-12">
      <section className="mb-6 rounded-3xl border border-paper/15 bg-black/20 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-paper/55">Studio Control Room</p>
        <h1 className="mt-2 text-3xl font-semibold text-paper sm:text-4xl">
          Build YouTube-ready assets with coordinated agents
        </h1>
        <p className="mt-2 max-w-3xl text-paper/70">
          This runner covers the missing parts from the demo phase: a typed backend, individual agent APIs, and a full
          pipeline endpoint your team can extend with real providers.
        </p>
      </section>
      <AgentRunner />
    </main>
  );
}
