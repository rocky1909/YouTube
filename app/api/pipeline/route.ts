import { NextResponse } from "next/server";
import { parseJsonBody } from "@/lib/api";
import { pipelineRequestSchema } from "@/lib/types";
import { runFullPipeline } from "@/lib/agents/pipeline";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, pipelineRequestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await runFullPipeline(parsed.data.brief);
  return NextResponse.json(result);
}
