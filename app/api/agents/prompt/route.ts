import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api";
import { runSingleAgent } from "@/lib/agents/pipeline";
import { briefSchema } from "@/lib/types";

const requestSchema = z.object({
  brief: briefSchema
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const result = await runSingleAgent("prompt", parsed.data.brief);
  return NextResponse.json({ step: result });
}
