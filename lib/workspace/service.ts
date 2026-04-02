import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { AgentResult } from "@/lib/types";

export type ProjectSummary = {
  id: string;
  title: string;
  topic: string;
  audience: string;
  tone: string;
  duration_minutes: number;
  status: string;
  created_at: string;
  updated_at?: string;
  last_run_at?: string;
  latest_run?: AgentResult[];
};

export type WorkspaceContext = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "editor" | "viewer";
  projects: ProjectSummary[];
  storageMode: "database" | "metadata";
};

type WorkspaceMetadataShape = {
  workspaceName?: string;
  projects?: ProjectSummary[];
};

type SupabaseLikeError = {
  code?: string;
  message?: string;
} | null;

const METADATA_KEY = "ytStudio";
const AGENT_ORDER: AgentResult["agent"][] = ["prompt", "story", "image", "voice", "video"];

function fallbackWorkspaceName(email: string | null | undefined): string {
  if (!email) return "My Studio";
  return `${email.split("@")[0]}'s Studio`;
}

function shouldUseMetadataFallback(error: SupabaseLikeError): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42501" ||
    error.code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asAgentName(value: unknown): AgentResult["agent"] | null {
  if (value === "prompt" || value === "story" || value === "image" || value === "voice" || value === "video") {
    return value;
  }
  return null;
}

function mergeAgentSteps(existing: AgentResult[] | undefined, incoming: AgentResult[]): AgentResult[] {
  const byAgent = new Map<AgentResult["agent"], AgentResult>();

  for (const step of existing ?? []) {
    byAgent.set(step.agent, step);
  }
  for (const step of incoming) {
    byAgent.set(step.agent, step);
  }

  return AGENT_ORDER.map((agent) => byAgent.get(agent)).filter((step): step is AgentResult => Boolean(step));
}

function normalizeProject(value: unknown): ProjectSummary {
  const now = new Date().toISOString();
  const objectValue = asObject(value);
  const latestRunRaw = Array.isArray(objectValue.latest_run)
    ? (objectValue.latest_run as AgentResult[])
    : undefined;
  return {
    id: typeof objectValue.id === "string" ? objectValue.id : crypto.randomUUID(),
    title: typeof objectValue.title === "string" ? objectValue.title : "Episode draft",
    topic: typeof objectValue.topic === "string" ? objectValue.topic : "Untitled topic",
    audience: typeof objectValue.audience === "string" ? objectValue.audience : "General audience",
    tone: typeof objectValue.tone === "string" ? objectValue.tone : "clear and confident",
    duration_minutes:
      typeof objectValue.duration_minutes === "number" && Number.isFinite(objectValue.duration_minutes)
        ? Math.max(1, Math.min(30, Math.round(objectValue.duration_minutes)))
        : 6,
    status: typeof objectValue.status === "string" ? objectValue.status : "draft",
    created_at: typeof objectValue.created_at === "string" ? objectValue.created_at : now,
    updated_at: typeof objectValue.updated_at === "string" ? objectValue.updated_at : undefined,
    last_run_at: typeof objectValue.last_run_at === "string" ? objectValue.last_run_at : undefined,
    latest_run: latestRunRaw
  };
}

function readWorkspaceMetadata(user: Pick<User, "email" | "user_metadata">): WorkspaceMetadataShape {
  const metadataRoot = asObject(user.user_metadata);
  const workspaceRaw = asObject(metadataRoot[METADATA_KEY]);
  const workspaceName =
    typeof workspaceRaw.workspaceName === "string" ? workspaceRaw.workspaceName : fallbackWorkspaceName(user.email);

  const projectsRaw = Array.isArray(workspaceRaw.projects) ? workspaceRaw.projects : [];
  const projects = projectsRaw.map(normalizeProject).sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    workspaceName,
    projects
  };
}

function buildMetadataContext(user: Pick<User, "id" | "email" | "user_metadata">): WorkspaceContext {
  const metadata = readWorkspaceMetadata(user);
  return {
    workspaceId: `meta-${user.id}`,
    workspaceName: metadata.workspaceName ?? fallbackWorkspaceName(user.email),
    role: "owner",
    projects: metadata.projects ?? [],
    storageMode: "metadata"
  };
}

async function updateWorkspaceMetadata(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
  updater: (current: WorkspaceMetadataShape) => WorkspaceMetadataShape
) {
  const latestUserResult = await supabase.auth.getUser();
  const latestUser = latestUserResult.data.user ?? user;

  const currentMetadata = readWorkspaceMetadata(latestUser);
  const nextMetadata = updater(currentMetadata);

  const baseMetadata = asObject(latestUser.user_metadata);
  const updateResult = await supabase.auth.updateUser({
    data: {
      ...baseMetadata,
      [METADATA_KEY]: {
        workspaceName: nextMetadata.workspaceName ?? fallbackWorkspaceName(latestUser.email),
        projects: nextMetadata.projects ?? []
      }
    }
  });

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }
}

export async function getOrCreateWorkspaceContext(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">
): Promise<WorkspaceContext> {
  const email = user.email ?? null;

  const profileUpsert = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      display_name: email ? email.split("@")[0] : "creator"
    },
    { onConflict: "id" }
  );

  if (profileUpsert.error) {
    if (shouldUseMetadataFallback(profileUpsert.error)) {
      return buildMetadataContext(user);
    }
    throw new Error(profileUpsert.error.message);
  }

  const membership = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership.error && shouldUseMetadataFallback(membership.error)) {
    return buildMetadataContext(user);
  }

  let membershipData = membership.data;

  if (!membershipData) {
    const workspaceInsert = await supabase
      .from("workspaces")
      .insert({
        name: fallbackWorkspaceName(email)
      })
      .select("id, name")
      .single();

    if (workspaceInsert.error || !workspaceInsert.data) {
      if (shouldUseMetadataFallback(workspaceInsert.error)) {
        return buildMetadataContext(user);
      }
      throw new Error(workspaceInsert.error?.message ?? "Failed to create workspace.");
    }

    const memberInsert = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspaceInsert.data.id,
        profile_id: user.id,
        role: "owner"
      })
      .select("workspace_id, role, workspaces(name)")
      .single();

    if (memberInsert.error || !memberInsert.data) {
      if (shouldUseMetadataFallback(memberInsert.error)) {
        return buildMetadataContext(user);
      }
      throw new Error(memberInsert.error?.message ?? "Failed to create workspace membership.");
    }

    membershipData = memberInsert.data;
  }

  if (membership.error || !membershipData) {
    throw new Error(membership.error?.message ?? "Workspace membership lookup failed.");
  }

  const workspaceId = String((membershipData as { workspace_id: string }).workspace_id);
  const role = String((membershipData as { role: string }).role) as WorkspaceContext["role"];
  const workspacesRaw = (membershipData as { workspaces?: unknown }).workspaces;
  let workspaceName = "My Studio";
  if (Array.isArray(workspacesRaw) && workspacesRaw.length > 0) {
    workspaceName = String((workspacesRaw[0] as { name?: string }).name ?? "My Studio");
  } else if (workspacesRaw && typeof workspacesRaw === "object") {
    workspaceName = String((workspacesRaw as { name?: string }).name ?? "My Studio");
  }

  const projectsResult = await supabase
    .from("projects")
    .select("id, title, topic, audience, tone, duration_minutes, status, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (projectsResult.error) {
    if (shouldUseMetadataFallback(projectsResult.error)) {
      return buildMetadataContext(user);
    }
    throw new Error(projectsResult.error.message);
  }

  const projects = (projectsResult.data ?? []) as ProjectSummary[];
  if (projects.length === 0) {
    return {
      workspaceId,
      workspaceName,
      role,
      projects,
      storageMode: "database"
    };
  }

  const projectIds = projects.map((project) => project.id);
  const runsResult = await supabase
    .from("agent_runs")
    .select("project_id, agent_name, summary, payload, created_at")
    .in("project_id", projectIds)
    .order("created_at", { ascending: false });

  const latestByProject = new Map<string, Map<AgentResult["agent"], AgentResult>>();
  const latestRunAtByProject = new Map<string, string>();

  if (!runsResult.error && Array.isArray(runsResult.data)) {
    for (const row of runsResult.data) {
      const rowObject = asObject(row);
      const projectId = typeof rowObject.project_id === "string" ? rowObject.project_id : null;
      const agent = asAgentName(rowObject.agent_name);
      if (!projectId || !agent) continue;

      if (!latestRunAtByProject.has(projectId) && typeof rowObject.created_at === "string") {
        latestRunAtByProject.set(projectId, rowObject.created_at);
      }

      let byAgent = latestByProject.get(projectId);
      if (!byAgent) {
        byAgent = new Map<AgentResult["agent"], AgentResult>();
        latestByProject.set(projectId, byAgent);
      }
      if (byAgent.has(agent)) {
        continue;
      }

      byAgent.set(agent, {
        agent,
        summary: typeof rowObject.summary === "string" ? rowObject.summary : "Generated output",
        payload: asObject(rowObject.payload),
        generatedAt: typeof rowObject.created_at === "string" ? rowObject.created_at : new Date().toISOString()
      });
    }
  }

  const projectsWithRuns = projects.map((project) => {
    const byAgent = latestByProject.get(project.id);
    if (!byAgent || byAgent.size === 0) {
      return project;
    }
    const latestRun = AGENT_ORDER.map((agent) => byAgent.get(agent)).filter(
      (step): step is AgentResult => Boolean(step)
    );
    return {
      ...project,
      latest_run: latestRun,
      last_run_at: latestRunAtByProject.get(project.id) ?? project.last_run_at
    };
  });

  return {
    workspaceId,
    workspaceName,
    role,
    projects: projectsWithRuns,
    storageMode: "database"
  };
}

export async function createProjectForUserWorkspace(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
  input: {
    title: string;
    topic: string;
    audience: string;
    tone: string;
    durationMinutes: number;
  }
) {
  const context = await getOrCreateWorkspaceContext(supabase, user);
  const now = new Date().toISOString();
  const metadataProject: ProjectSummary = {
    id: crypto.randomUUID(),
    title: input.title,
    topic: input.topic,
    audience: input.audience,
    tone: input.tone,
    duration_minutes: input.durationMinutes,
    status: "draft",
    created_at: now,
    latest_run: []
  };

  if (context.storageMode === "metadata") {
    await updateWorkspaceMetadata(supabase, user, (current) => ({
      workspaceName: current.workspaceName ?? fallbackWorkspaceName(user.email),
      projects: [metadataProject, ...(current.projects ?? [])].slice(0, 40)
    }));
    return metadataProject;
  }

  const result = await supabase
    .from("projects")
    .insert({
      workspace_id: context.workspaceId,
      title: input.title,
      topic: input.topic,
      audience: input.audience,
      tone: input.tone,
      duration_minutes: input.durationMinutes,
      status: "draft"
    })
    .select("id, title, topic, audience, tone, duration_minutes, status, created_at")
    .single();

  if (result.error || !result.data) {
    if (shouldUseMetadataFallback(result.error)) {
      await updateWorkspaceMetadata(supabase, user, (current) => ({
        workspaceName: current.workspaceName ?? fallbackWorkspaceName(user.email),
        projects: [metadataProject, ...(current.projects ?? [])].slice(0, 40)
      }));
      return metadataProject;
    }
    throw new Error(result.error?.message ?? "Failed to create project.");
  }

  return result.data as ProjectSummary;
}

export async function assertUserCanAccessProject(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  user?: Pick<User, "id" | "email" | "user_metadata">
) {
  const project = await supabase.from("projects").select("workspace_id").eq("id", projectId).maybeSingle();
  if (project.error && shouldUseMetadataFallback(project.error)) {
    const metadataUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!metadataUser) {
      throw new Error("Authentication required.");
    }
    const metadataProjects = readWorkspaceMetadata(metadataUser).projects ?? [];
    if (metadataProjects.some((item) => item.id === projectId)) {
      return;
    }
    throw new Error("You do not have access to this project.");
  }

  if (project.error || !project.data) {
    throw new Error(project.error?.message ?? "Project not found.");
  }

  const membership = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", String(project.data.workspace_id))
    .eq("profile_id", userId)
    .maybeSingle();

  if (membership.error && shouldUseMetadataFallback(membership.error)) {
    const metadataUser = user ?? (await supabase.auth.getUser()).data.user;
    if (!metadataUser) {
      throw new Error("Authentication required.");
    }
    const metadataProjects = readWorkspaceMetadata(metadataUser).projects ?? [];
    if (metadataProjects.some((item) => item.id === projectId)) {
      return;
    }
    throw new Error("You do not have access to this project.");
  }

  if (membership.error || !membership.data) {
    throw new Error("You do not have access to this project.");
  }
}

export async function persistAgentSteps(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email" | "user_metadata">,
  projectId: string,
  steps: AgentResult[]
) {
  if (steps.length === 0) return;
  const now = new Date().toISOString();

  const inserts = steps.map((step) => ({
    project_id: projectId,
    agent_name: step.agent,
    summary: step.summary,
    payload: step.payload
  }));

  const insertResult = await supabase.from("agent_runs").insert(inserts);
  if (insertResult.error && !shouldUseMetadataFallback(insertResult.error)) {
    throw new Error(insertResult.error.message);
  }

  const updateResult = await supabase
    .from("projects")
    .update({
      status: "ready",
      updated_at: now
    })
    .eq("id", projectId);

  if (updateResult.error && !shouldUseMetadataFallback(updateResult.error)) {
    throw new Error(updateResult.error.message);
  }

  if (!insertResult.error && !updateResult.error) {
    return;
  }

  await updateWorkspaceMetadata(supabase, user, (current) => ({
    workspaceName: current.workspaceName ?? fallbackWorkspaceName(user.email),
    projects: (current.projects ?? []).map((project) =>
      project.id === projectId
        ? {
            ...project,
            status: "ready",
            last_run_at: now,
            updated_at: now,
            latest_run: mergeAgentSteps(project.latest_run, steps)
          }
        : project
    )
  }));
}
