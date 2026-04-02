import { redirect } from "next/navigation";
import { AgentRunner } from "@/components/agent-runner";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateWorkspaceContext } from "@/lib/workspace/service";

export default async function DashboardPage() {
  let workspaceContext:
    | {
        workspaceName: string;
        userEmail: string;
        projects: Array<{
          id: string;
          title: string;
          topic: string;
          audience: string;
          tone: string;
          duration_minutes: number;
          status: string;
          created_at: string;
        }>;
      }
    | undefined;
  let workspaceLoadError: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user) {
      redirect("/auth/login");
    }

    try {
      const context = await getOrCreateWorkspaceContext(supabase, user);

      workspaceContext = {
        workspaceName: context.workspaceName,
        userEmail: user.email ?? "creator",
        projects: context.projects
      };
    } catch (error) {
      workspaceLoadError = error instanceof Error ? error.message : "Failed to load workspace data.";
    }
  }

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
        {workspaceContext ? (
          <p className="mt-3 text-sm text-lagoon/90">
            Signed in as {workspaceContext.userEmail} in workspace &quot;{workspaceContext.workspaceName}&quot;.
          </p>
        ) : workspaceLoadError ? (
          <p className="mt-3 text-sm text-coral/90">{workspaceLoadError}</p>
        ) : (
          <p className="mt-3 text-sm text-coral/90">
            Supabase not configured yet. Dashboard is running in standalone mode.
          </p>
        )}
      </section>
      <AgentRunner workspace={workspaceContext} />
    </main>
  );
}
