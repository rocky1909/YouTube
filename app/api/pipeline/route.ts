import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { parseJsonBody } from "@/lib/api";
import { pipelineRequestSchema } from "@/lib/types";
import { runFullPipeline } from "@/lib/agents/pipeline";
import { readProviderKeysFromUser } from "@/lib/provider-keys";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertUserCanAccessProject, persistAgentSteps } from "@/lib/workspace/service";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, pipelineRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  let providerKeys;
  let authenticatedUser: User | null = null;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const authResult = await supabase.auth.getUser();
    authenticatedUser = authResult.data.user;
    if (authenticatedUser) {
      providerKeys = readProviderKeysFromUser(authenticatedUser);
    }
  }

  let workspaceSupabaseClient: Awaited<ReturnType<typeof createSupabaseServerClient>> | null = null;
  if (parsed.data.projectId) {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase must be configured to persist project pipeline runs." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    workspaceSupabaseClient = supabase;
    const authResult = await supabase.auth.getUser();
    const user = authResult.data.user;

    if (!user) {
      return NextResponse.json({ error: "Authentication required to save pipeline runs." }, { status: 401 });
    }

    try {
      await assertUserCanAccessProject(supabase, user.id, parsed.data.projectId, user);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "You do not have access to this project." },
        { status: 403 }
      );
    }
  }

  const result = await runFullPipeline(parsed.data.brief, { providerKeys });

  if (parsed.data.projectId && workspaceSupabaseClient) {
    try {
      const authResult = await workspaceSupabaseClient.auth.getUser();
      const user = authResult.data.user ?? authenticatedUser;
      if (!user) {
        return NextResponse.json({ error: "Authentication required to save pipeline runs." }, { status: 401 });
      }
      await persistAgentSteps(workspaceSupabaseClient, user, parsed.data.projectId, result.steps);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to persist pipeline run." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(result);
}
