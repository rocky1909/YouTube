import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api";
import { runAgentWithOptionalPersistence } from "@/lib/agents/route-runner";
import { agentResultSchema, briefSchema } from "@/lib/types";

const requestSchema = z.object({
  brief: briefSchema,
  previous: z.array(agentResultSchema).optional(),
  projectId: z.string().uuid().optional()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const result = await runAgentWithOptionalPersistence({
      agent: "image",
      brief: parsed.data.brief,
      previous: parsed.data.previous,
      projectId: parsed.data.projectId
    });
    return NextResponse.json({ step: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run image agent.";
    if (message.toLowerCase().includes("authentication required")) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.toLowerCase().includes("access")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.toLowerCase().includes("must be configured")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
