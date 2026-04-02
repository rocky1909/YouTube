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
};

export type WorkspaceContext = {
  workspaceId: string;
  workspaceName: string;
  role: "owner" | "editor" | "viewer";
  projects: ProjectSummary[];
};

export async function getOrCreateWorkspaceContext(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">
): Promise<WorkspaceContext> {
  const email = user.email ?? null;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      display_name: email ? email.split("@")[0] : "creator"
    },
    { onConflict: "id" }
  );

  const membership = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(name)")
    .eq("profile_id", user.id)
    .limit(1)
    .maybeSingle();

  let membershipData = membership.data;

  if (!membershipData) {
    const workspaceInsert = await supabase
      .from("workspaces")
      .insert({
        name: email ? `${email.split("@")[0]}'s Studio` : "My Studio"
      })
      .select("id, name")
      .single();

    if (workspaceInsert.error || !workspaceInsert.data) {
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
    throw new Error(projectsResult.error.message);
  }

  return {
    workspaceId,
    workspaceName,
    role,
    projects: (projectsResult.data ?? []) as ProjectSummary[]
  };
}

export async function createProjectForUserWorkspace(
  supabase: SupabaseClient,
  user: Pick<User, "id" | "email">,
  input: {
    title: string;
    topic: string;
    audience: string;
    tone: string;
    durationMinutes: number;
  }
) {
  const context = await getOrCreateWorkspaceContext(supabase, user);

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
    throw new Error(result.error?.message ?? "Failed to create project.");
  }

  return result.data as ProjectSummary;
}

export async function assertUserCanAccessProject(supabase: SupabaseClient, userId: string, projectId: string) {
  const project = await supabase.from("projects").select("workspace_id").eq("id", projectId).maybeSingle();
  if (project.error || !project.data) {
    throw new Error(project.error?.message ?? "Project not found.");
  }

  const membership = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", String(project.data.workspace_id))
    .eq("profile_id", userId)
    .maybeSingle();

  if (membership.error || !membership.data) {
    throw new Error("You do not have access to this project.");
  }
}

export async function persistAgentSteps(supabase: SupabaseClient, projectId: string, steps: AgentResult[]) {
  if (steps.length === 0) return;

  const inserts = steps.map((step) => ({
    project_id: projectId,
    agent_name: step.agent,
    summary: step.summary,
    payload: step.payload
  }));

  const insertResult = await supabase.from("agent_runs").insert(inserts);
  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  const updateResult = await supabase
    .from("projects")
    .update({
      status: "ready",
      updated_at: new Date().toISOString()
    })
    .eq("id", projectId);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }
}
