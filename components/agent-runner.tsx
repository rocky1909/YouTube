"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AgentName, AgentResult, BriefInput } from "@/lib/types";

type StepState = "idle" | "running" | "done" | "error";
type WorkspaceProject = {
  id: string;
  title: string;
  topic: string;
  audience: string;
  tone: string;
  duration_minutes: number;
  status: string;
  created_at: string;
};

type WorkspaceContext = {
  workspaceName: string;
  userEmail: string;
  projects: WorkspaceProject[];
};

const orderedAgents: AgentName[] = ["prompt", "story", "image", "voice", "video"];

const routeByAgent: Record<AgentName, string> = {
  prompt: "/api/agents/prompt",
  story: "/api/agents/story",
  image: "/api/agents/image",
  voice: "/api/agents/voice",
  video: "/api/agents/video"
};

const labels: Record<AgentName, string> = {
  prompt: "Prompt Generator",
  story: "Story Writer",
  image: "Text to Image",
  voice: "Text to Voice",
  video: "Image to Video Planner"
};

const defaultBrief: BriefInput = {
  topic: "How to build a faceless AI YouTube channel",
  audience: "New creators in India",
  tone: "clear and confident",
  durationMinutes: 6
};

function stateClasses(state: StepState): string {
  if (state === "running") return "text-lagoon border-lagoon/40 bg-lagoon/10";
  if (state === "done") return "text-moss border-moss/40 bg-moss/10";
  if (state === "error") return "text-coral border-coral/40 bg-coral/10";
  return "text-paper/70 border-paper/20 bg-paper/5";
}

export function AgentRunner({ workspace }: { workspace?: WorkspaceContext }) {
  const [brief, setBrief] = useState<BriefInput>(defaultBrief);
  const [steps, setSteps] = useState<AgentResult[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>(workspace?.projects ?? []);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(workspace?.projects?.[0]?.id ?? "");
  const [newProjectTitle, setNewProjectTitle] = useState("Episode draft");
  const [status, setStatus] = useState<Record<AgentName, StepState>>({
    prompt: "idle",
    story: "idle",
    image: "idle",
    voice: "idle",
    video: "idle"
  });
  const [error, setError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  const completedCount = useMemo(
    () => Object.values(status).filter((value) => value === "done").length,
    [status]
  );

  const updateStep = (incoming: AgentResult) => {
    setSteps((current) => {
      const existing = current.find((step) => step.agent === incoming.agent);
      if (!existing) {
        return [...current, incoming];
      }
      return current.map((step) => (step.agent === incoming.agent ? incoming : step));
    });
  };

  const runSingle = async (agent: AgentName) => {
    setError(null);
    setStatus((current) => ({ ...current, [agent]: "running" }));
    try {
      const response = await fetch(routeByAgent[agent], {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ brief, previous: steps, projectId: selectedProjectId || undefined })
      });
      const json = (await response.json()) as { step?: AgentResult; error?: string };
      if (!response.ok || !json.step) {
        throw new Error(json.error ?? `Failed to run ${agent} agent.`);
      }
      updateStep(json.step);
      setStatus((current) => ({ ...current, [agent]: "done" }));
    } catch (caught) {
      setStatus((current) => ({ ...current, [agent]: "error" }));
      setError(caught instanceof Error ? caught.message : "Unexpected pipeline error.");
    }
  };

  const runAll = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setRunningAll(true);
    setStatus({
      prompt: "running",
      story: "running",
      image: "running",
      voice: "running",
      video: "running"
    });

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ brief, projectId: selectedProjectId || undefined })
      });
      const json = (await response.json()) as { steps?: AgentResult[]; error?: string };
      if (!response.ok || !Array.isArray(json.steps)) {
        throw new Error(json.error ?? "Failed to run full pipeline.");
      }

      setSteps(json.steps);
      setStatus({
        prompt: "done",
        story: "done",
        image: "done",
        voice: "done",
        video: "done"
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected pipeline error.");
      setStatus({
        prompt: "error",
        story: "error",
        image: "error",
        voice: "error",
        video: "error"
      });
    } finally {
      setRunningAll(false);
    }
  };

  const createProject = async () => {
    setWorkspaceError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: newProjectTitle,
          topic: brief.topic,
          audience: brief.audience,
          tone: brief.tone,
          durationMinutes: brief.durationMinutes
        })
      });
      const json = (await response.json()) as { project?: WorkspaceProject; error?: string };
      if (!response.ok || !json.project) {
        throw new Error(json.error ?? "Failed to create project.");
      }

      setProjects((current) => [json.project as WorkspaceProject, ...current]);
      setSelectedProjectId(json.project.id);
      setNewProjectTitle(`${brief.topic.slice(0, 32)} episode`);
    } catch (caught) {
      setWorkspaceError(caught instanceof Error ? caught.message : "Failed to create project.");
    }
  };

  return (
    <section className="space-y-6">
      <form onSubmit={runAll} className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="mb-4 rounded-2xl border border-paper/15 bg-black/15 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-paper/55">
            {workspace ? "Team Workspace Mode" : "Standalone Mode"}
          </p>
          {workspace ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_minmax(220px,1fr)_auto]">
              <select
                value={selectedProjectId}
                onChange={(event) => setSelectedProjectId(event.target.value)}
                className="min-w-0 rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none focus:border-lagoon/60"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title} ({project.status})
                  </option>
                ))}
              </select>
              <input
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
                className="min-w-0 rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none focus:border-lagoon/60"
                placeholder="New project title"
              />
              <button
                type="button"
                onClick={createProject}
                className="rounded-xl border border-paper/20 px-3 py-2 text-sm text-paper transition hover:bg-paper/5 lg:px-4"
              >
                Create project
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-paper/70">
              Configure Supabase and sign in to unlock team workspace and project persistence.
            </p>
          )}
          {workspaceError ? <p className="mt-2 text-sm text-coral">{workspaceError}</p> : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-paper/70">Video Topic</span>
            <input
              value={brief.topic}
              onChange={(event) => setBrief((current) => ({ ...current, topic: event.target.value }))}
              className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none transition focus:border-lagoon/60"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-paper/70">Audience</span>
            <input
              value={brief.audience}
              onChange={(event) => setBrief((current) => ({ ...current, audience: event.target.value }))}
              className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none transition focus:border-lagoon/60"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-paper/70">Tone</span>
            <input
              value={brief.tone}
              onChange={(event) => setBrief((current) => ({ ...current, tone: event.target.value }))}
              className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none transition focus:border-lagoon/60"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-paper/70">Target Duration (minutes)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={brief.durationMinutes}
              onChange={(event) =>
                setBrief((current) => ({
                  ...current,
                  durationMinutes: Number.parseInt(event.target.value, 10) || 1
                }))
              }
              className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none transition focus:border-lagoon/60"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={runningAll}
            className="w-full rounded-xl bg-paper px-4 py-2 text-sm font-semibold text-night transition hover:translate-y-[-1px] disabled:opacity-60 sm:w-auto"
          >
            {runningAll ? "Running full pipeline..." : "Run Full Pipeline"}
          </button>
          <div className="w-full rounded-xl border border-paper/20 px-3 py-2 text-sm text-paper/75 sm:w-auto">
            Completed {completedCount} / {orderedAgents.length} agents
          </div>
          {selectedProjectId ? (
            <div className="w-full rounded-xl border border-lagoon/40 bg-lagoon/10 px-3 py-2 text-sm text-paper/85 sm:w-auto">
              Saving runs to selected project
            </div>
          ) : null}
          {error ? <p className="w-full text-sm text-coral">{error}</p> : null}
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        {orderedAgents.map((agent) => {
          const result = steps.find((step) => step.agent === agent);
          return (
            <article key={agent} className="glass-card rounded-3xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-paper sm:text-lg">{labels[agent]}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${stateClasses(status[agent])}`}>
                  {status[agent]}
                </span>
              </div>
              <p className="mt-2 text-sm text-paper/70">
                {result?.summary ?? "Not run yet. Use Run Full Pipeline or run this agent alone."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => runSingle(agent)}
                  disabled={runningAll || status[agent] === "running"}
                  className="rounded-lg border border-paper/20 px-3 py-1.5 text-sm text-paper/90 transition hover:bg-paper/5 disabled:opacity-60"
                >
                  {status[agent] === "running" ? "Running..." : "Run agent"}
                </button>
                <span className="text-xs text-paper/50">
                  {result?.generatedAt ? new Date(result.generatedAt).toLocaleTimeString() : "No output"}
                </span>
              </div>
              <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-white/10 bg-black/25 p-3 text-xs text-paper/75">
                {JSON.stringify(result?.payload ?? {}, null, 2)}
              </pre>
            </article>
          );
        })}
      </div>
    </section>
  );
}
