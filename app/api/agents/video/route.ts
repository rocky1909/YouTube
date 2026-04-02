import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api";
import { runSingleAgent } from "@/lib/agents/pipeline";
import { readProviderKeysFromUser } from "@/lib/provider-keys";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { agentResultSchema, briefSchema } from "@/lib/types";

const requestSchema = z.object({
  brief: briefSchema,
  previous: z.array(agentResultSchema).optional()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  let providerKeys;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const authResult = await supabase.auth.getUser();
    const user = authResult.data.user;
    if (user) {
      providerKeys = readProviderKeysFromUser(user);
    }
  }

  const result = await runSingleAgent("video", parsed.data.brief, parsed.data.previous, { providerKeys });
  return NextResponse.json({ step: result });
}
