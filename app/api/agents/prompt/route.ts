import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api";
import { runAgentWithOptionalPersistence } from "@/lib/agents/route-runner";
import { briefSchema } from "@/lib/types";

const requestSchema = z.object({
  brief: briefSchema,
  projectId: z.string().uuid().optional()
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const result = await runAgentWithOptionalPersistence({
      agent: "prompt",
      brief: parsed.data.brief,
      projectId: parsed.data.projectId
    });
    return NextResponse.json({ step: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run prompt agent.";
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
