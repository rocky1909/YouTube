"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  latest_run?: AgentResult[];
};

type WorkspaceContext = {
  workspaceName: string;
  userEmail: string;
  projects: WorkspaceProject[];
};

type ProviderStatus = {
  hasOpenAI: boolean;
  hasElevenLabs: boolean;
  hasRunway: boolean;
};

type ProviderInputs = {
  openaiApiKey: string;
  elevenLabsApiKey: string;
  runwayApiKey: string;
};

type ImageScene = {
  scene: number;
  prompt: string;
  url: string | null;
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

const idleStatus: Record<AgentName, StepState> = {
  prompt: "idle",
  story: "idle",
  image: "idle",
  voice: "idle",
  video: "idle"
};

function stateClasses(state: StepState): string {
  if (state === "running") return "text-lagoon border-lagoon/40 bg-lagoon/10";
  if (state === "done") return "text-moss border-moss/40 bg-moss/10";
  if (state === "error") return "text-coral border-coral/40 bg-coral/10";
  return "text-paper/70 border-paper/20 bg-paper/5";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function previewPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string") {
      if (value.startsWith("data:")) {
        next[key] = `${value.slice(0, 42)}...`;
      } else if (value.length > 260) {
        next[key] = `${value.slice(0, 260)}...`;
      } else {
        next[key] = value;
      }
      continue;
    }
    next[key] = value;
  }
  return next;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function readImageScenes(value: unknown): ImageScene[] {
  if (!Array.isArray(value)) return [];
  const scenes: ImageScene[] = [];

  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    const prompt = toOptionalString(item.prompt) ?? "";
    const sceneNumber =
      typeof item.scene === "number" && Number.isFinite(item.scene) ? Math.max(1, Math.round(item.scene)) : index + 1;
    const url = toOptionalString(item.url);
    scenes.push({
      scene: sceneNumber,
      prompt,
      url
    });
  });

  return scenes;
}

function statusTone(message: string | null): string {
  if (!message) return "text-paper/70";
  return message.toLowerCase().includes("failed") || message.toLowerCase().includes("error")
    ? "text-coral"
    : "text-moss";
}

function statusLabel(ready: boolean): string {
  return ready ? "Connected" : "Not set";
}

function statusClass(ready: boolean): string {
  return ready ? "text-moss border-moss/30 bg-moss/10" : "text-paper/70 border-paper/20 bg-paper/5";
}

function formatRunTime(value: string | undefined): string {
  if (!value) return "No output";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No output";
  return date.toLocaleString();
}

export function AgentRunner({ workspace }: { workspace?: WorkspaceContext }) {
  const [brief, setBrief] = useState<BriefInput>(defaultBrief);
  const [steps, setSteps] = useState<AgentResult[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>(workspace?.projects ?? []);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(workspace?.projects?.[0]?.id ?? "");
  const [newProjectTitle, setNewProjectTitle] = useState("Episode draft");
  const [status, setStatus] = useState<Record<AgentName, StepState>>(idleStatus);
  const [error, setError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    hasOpenAI: false,
    hasElevenLabs: false,
    hasRunway: false
  });
  const [serverProviderStatus, setServerProviderStatus] = useState<ProviderStatus>({
    hasOpenAI: false,
    hasElevenLabs: false,
    hasRunway: false
  });
  const [providerInputs, setProviderInputs] = useState<ProviderInputs>({
    openaiApiKey: "",
    elevenLabsApiKey: "",
    runwayApiKey: ""
  });
  const [providerBusy, setProviderBusy] = useState(false);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);

  const completedCount = useMemo(
    () => Object.values(status).filter((value) => value === "done").length,
    [status]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
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

  useEffect(() => {
    if (!selectedProjectId) return;
    const saved = selectedProject?.latest_run;
    if (Array.isArray(saved) && saved.length > 0) {
      setSteps(saved);
      const nextStatus: Record<AgentName, StepState> = { ...idleStatus };
      for (const step of saved) {
        nextStatus[step.agent] = "done";
      }
      setStatus(nextStatus);
      setError(null);
      return;
    }
    setSteps([]);
    setStatus({ ...idleStatus });
    setError(null);
  }, [selectedProjectId, selectedProject]);

  useEffect(() => {
    let cancelled = false;
    async function loadProviderStatus() {
      try {
        const response = await fetch("/api/provider-keys", { method: "GET" });
        const json = (await response.json()) as {
          providerKeys?: ProviderStatus;
          serverEnv?: ProviderStatus;
          error?: string;
        };

        if (cancelled || !response.ok) return;
        if (json.providerKeys) {
          setProviderStatus(json.providerKeys);
        }
        if (json.serverEnv) {
          setServerProviderStatus(json.serverEnv);
        }
      } catch {
        // Keep defaults when status endpoint is unavailable.
      }
    }
    void loadProviderStatus();
    return () => {
      cancelled = true;
    };
  }, []);

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
    setStatus({ prompt: "running", story: "running", image: "running", voice: "running", video: "running" });

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
      if (selectedProjectId) {
        const now = new Date().toISOString();
        setProjects((current) =>
          current.map((project) =>
            project.id === selectedProjectId
              ? {
                  ...project,
                  status: "ready",
                  latest_run: json.steps,
                  created_at: project.created_at ?? now
                }
              : project
          )
        );
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected pipeline error.");
      setStatus({ prompt: "error", story: "error", image: "error", voice: "error", video: "error" });
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

  const saveProviderKeys = async () => {
    setProviderBusy(true);
    setProviderMessage(null);
    try {
      const response = await fetch("/api/provider-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(providerInputs)
      });
      const json = (await response.json()) as {
        providerKeys?: ProviderStatus;
        serverEnv?: ProviderStatus;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(json.error ?? "Failed to save provider keys.");
      }

      if (json.providerKeys) {
        setProviderStatus(json.providerKeys);
      }
      if (json.serverEnv) {
        setServerProviderStatus(json.serverEnv);
      }
      setProviderInputs({
        openaiApiKey: "",
        elevenLabsApiKey: "",
        runwayApiKey: ""
      });
      setProviderMessage("Provider keys saved for your account.");
    } catch (caught) {
      setProviderMessage(caught instanceof Error ? caught.message : "Failed to save provider keys.");
    } finally {
      setProviderBusy(false);
    }
  };

  const promptOutput = steps.find((step) => step.agent === "prompt");
  const storyOutput = steps.find((step) => step.agent === "story");
  const imageOutput = steps.find((step) => step.agent === "image");
  const voiceOutput = steps.find((step) => step.agent === "voice");
  const videoOutput = steps.find((step) => step.agent === "video");

  const titleOptions = useMemo(() => readStringArray(promptOutput?.payload.titleOptions), [promptOutput]);
  const hookLine = toOptionalString(promptOutput?.payload.hookLine);
  const voiceScript = toOptionalString(voiceOutput?.payload.scriptSample);
  const voiceAudioUrl = toOptionalString(voiceOutput?.payload.audioDataUrl);
  const imageScenes = useMemo(() => readImageScenes(imageOutput?.payload.images), [imageOutput]);

  const timeline = useMemo(() => {
    if (!Array.isArray(videoOutput?.payload.timeline)) return [];
    return videoOutput.payload.timeline
      .map((item) => {
        if (!isRecord(item)) return null;
        const order = typeof item.order === "number" ? item.order : null;
        const section = toOptionalString(item.section);
        const transition = toOptionalString(item.transition);
        if (order === null || !section) return null;
        return {
          order,
          section,
          transition
        };
      })
      .filter((item): item is { order: number; section: string; transition: string | null } => Boolean(item));
  }, [videoOutput]);

  const videoTask = useMemo(() => {
    if (!isRecord(videoOutput?.payload.task)) return null;
    return {
      id: toOptionalString(videoOutput.payload.task.id),
      taskId: toOptionalString(videoOutput.payload.task.taskId),
      status: toOptionalString(videoOutput.payload.task.status)
    };
  }, [videoOutput]);

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

      <section className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-paper/55">Provider Keys</p>
            <h2 className="mt-1 text-xl font-semibold text-paper">Connect Real APIs</h2>
          </div>
          <p className="text-sm text-paper/70">
            Add your own keys here. Leave a field blank if you do not want to change it.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-paper/15 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-paper/55">OpenAI</p>
            <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClass(providerStatus.hasOpenAI)}`}>
              {statusLabel(providerStatus.hasOpenAI)}
            </div>
          </div>
          <div className="rounded-xl border border-paper/15 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-paper/55">ElevenLabs</p>
            <div
              className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClass(providerStatus.hasElevenLabs)}`}
            >
              {statusLabel(providerStatus.hasElevenLabs)}
            </div>
          </div>
          <div className="rounded-xl border border-paper/15 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-paper/55">Runway</p>
            <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClass(providerStatus.hasRunway)}`}>
              {statusLabel(providerStatus.hasRunway)}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-paper/60">
          Server fallback available:
          {" "}
          OpenAI {serverProviderStatus.hasOpenAI ? "yes" : "no"},
          {" "}
          ElevenLabs {serverProviderStatus.hasElevenLabs ? "yes" : "no"},
          {" "}
          Runway {serverProviderStatus.hasRunway ? "yes" : "no"}.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-paper/70">OpenAI API Key</span>
            <input
              type="password"
              value={providerInputs.openaiApiKey}
              onChange={(event) => setProviderInputs((current) => ({ ...current, openaiApiKey: event.target.value }))}
              placeholder="sk-..."
              className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none transition focus:border-lagoon/60"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-paper/70">ElevenLabs API Key</span>
            <input
              type="password"
              value={providerInputs.elevenLabsApiKey}
              onChange={(event) =>
                setProviderInputs((current) => ({ ...current, elevenLabsApiKey: event.target.value }))
              }
              placeholder="xi-..."
              className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none transition focus:border-lagoon/60"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-paper/70">Runway API Key</span>
            <input
              type="password"
              value={providerInputs.runwayApiKey}
              onChange={(event) => setProviderInputs((current) => ({ ...current, runwayApiKey: event.target.value }))}
              placeholder="rw_..."
              className="w-full rounded-xl border border-paper/20 bg-black/25 px-3 py-2 text-paper outline-none transition focus:border-lagoon/60"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={saveProviderKeys}
            disabled={providerBusy || !workspace}
            className="rounded-xl border border-paper/20 px-4 py-2 text-sm text-paper transition hover:bg-paper/5 disabled:opacity-60"
          >
            {providerBusy ? "Saving..." : "Save Provider Keys"}
          </button>
          {workspace ? (
            <p className="text-sm text-paper/65">Keys are saved to your signed-in account metadata.</p>
          ) : (
            <p className="text-sm text-paper/65">Sign in with Supabase to save per-user keys.</p>
          )}
          {providerMessage ? <p className={`w-full text-sm ${statusTone(providerMessage)}`}>{providerMessage}</p> : null}
        </div>
      </section>

      <section className="glass-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-paper/55">Generated Output</p>
            <h2 className="mt-1 text-xl font-semibold text-paper">
              {selectedProject ? selectedProject.title : "Current Pipeline Run"}
            </h2>
          </div>
          <p className="max-w-lg text-sm text-paper/70">
            Your generated project assets appear here: title + script, images, voice sample, and video plan.
          </p>
        </div>

        {steps.length === 0 ? (
          <p className="mt-4 rounded-xl border border-paper/15 bg-black/20 p-3 text-sm text-paper/70">
            No generated assets yet. Run the full pipeline to populate this section.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-paper/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-paper/55">Prompt + Story</p>
              {titleOptions.length > 0 ? (
                <p className="mt-2 text-sm text-paper/90">
                  <span className="text-paper/65">Title:</span> {titleOptions[0]}
                </p>
              ) : null}
              {hookLine ? (
                <p className="mt-1 text-sm text-paper/90">
                  <span className="text-paper/65">Hook:</span> {hookLine}
                </p>
              ) : null}
              {storyOutput ? (
                <p className="mt-2 text-xs text-paper/65">Updated {formatRunTime(storyOutput.generatedAt)}</p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-paper/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-paper/55">Images</p>
              {imageScenes.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {imageScenes.map((scene) => (
                    <figure key={`${scene.scene}-${scene.url ?? "none"}`} className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
                      {scene.url ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={scene.url} alt={`Scene ${scene.scene}`} className="h-32 w-full object-cover" />
                        </>
                      ) : (
                        <div className="flex h-32 items-center justify-center text-xs text-paper/55">No image URL</div>
                      )}
                      <figcaption className="p-2 text-xs text-paper/70">
                        Scene {scene.scene}
                        {scene.prompt ? ` - ${scene.prompt}` : ""}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-paper/70">No image output yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-paper/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-paper/55">Voice</p>
              {voiceAudioUrl ? (
                <audio controls className="mt-3 w-full">
                  <source src={voiceAudioUrl} />
                </audio>
              ) : (
                <p className="mt-2 text-sm text-paper/70">No voice output yet.</p>
              )}
              {voiceScript ? (
                <p className="mt-2 text-xs text-paper/65">
                  Script sample: {voiceScript.length > 180 ? `${voiceScript.slice(0, 180)}...` : voiceScript}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-paper/15 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-paper/55">Video</p>
              {videoTask ? (
                <p className="mt-2 text-sm text-paper/90">
                  Runway task submitted:
                  {" "}
                  {videoTask.id ?? videoTask.taskId ?? "Unknown task"}
                  {videoTask.status ? ` (${videoTask.status})` : ""}
                </p>
              ) : null}
              {timeline.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {timeline.map((item) => (
                    <div key={`${item.order}-${item.section}`} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-paper/75">
                      {item.order}. {item.section}
                      {item.transition ? ` | ${item.transition}` : ""}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-paper/70">No video timeline output yet.</p>
              )}
            </div>
          </div>
        )}
      </section>

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
                {JSON.stringify(previewPayload(result?.payload ?? {}), null, 2)}
              </pre>
            </article>
          );
        })}
      </div>
    </section>
  );
}
