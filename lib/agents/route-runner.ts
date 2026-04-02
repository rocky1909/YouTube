import type { User } from "@supabase/supabase-js";
import type { AgentName, AgentResult, BriefInput } from "@/lib/types";
import { runSingleAgent } from "@/lib/agents/pipeline";
import { readProviderKeysFromUser } from "@/lib/provider-keys";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertUserCanAccessProject, persistAgentSteps } from "@/lib/workspace/service";

export async function runAgentWithOptionalPersistence({
  agent,
  brief,
  previous,
  projectId
}: {
  agent: AgentName;
  brief: BriefInput;
  previous?: AgentResult[];
  projectId?: string;
}) {
  let providerKeys;
  let authenticatedUser: User | null = null;
  let workspaceSupabaseClient: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    workspaceSupabaseClient = supabase;
    const authResult = await supabase.auth.getUser();
    authenticatedUser = authResult.data.user;
    if (authenticatedUser) {
      providerKeys = readProviderKeysFromUser(authenticatedUser);
    }
  }

  if (projectId) {
    if (!isSupabaseConfigured()) {
      throw new Error("Supabase must be configured to persist project agent runs.");
    }
    if (!workspaceSupabaseClient) {
      workspaceSupabaseClient = await createSupabaseServerClient();
    }
    if (!authenticatedUser) {
      const authResult = await workspaceSupabaseClient.auth.getUser();
      authenticatedUser = authResult.data.user;
    }
    if (!authenticatedUser) {
      throw new Error("Authentication required to save agent runs.");
    }

    await assertUserCanAccessProject(workspaceSupabaseClient, authenticatedUser.id, projectId, authenticatedUser);
  }

  const step = await runSingleAgent(agent, brief, previous, { providerKeys });

  if (projectId && workspaceSupabaseClient && authenticatedUser) {
    await persistAgentSteps(workspaceSupabaseClient, authenticatedUser, projectId, [step]);
  }

  return step;
}
