import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api";
import { pipelineRequestSchema } from "@/lib/types";
import { runFullPipeline } from "@/lib/agents/pipeline";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertUserCanAccessProject, persistAgentSteps } from "@/lib/workspace/service";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, pipelineRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
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
      await assertUserCanAccessProject(supabase, user.id, parsed.data.projectId);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "You do not have access to this project." },
        { status: 403 }
      );
    }
  }

  const result = await runFullPipeline(parsed.data.brief);

  if (parsed.data.projectId && workspaceSupabaseClient) {
    try {
      await persistAgentSteps(workspaceSupabaseClient, parsed.data.projectId, result.steps);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to persist pipeline run." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(result);
}
