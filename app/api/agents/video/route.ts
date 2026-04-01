import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api";
import { runSingleAgent } from "@/lib/agents/pipeline";
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

  const result = await runSingleAgent("video", parsed.data.brief, parsed.data.previous);
  return NextResponse.json({ step: result });
}
