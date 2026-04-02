import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api";
import { env } from "@/lib/env";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  readProviderKeysFromUser,
  saveProviderKeysForUser,
  toProviderKeyStatus
} from "@/lib/provider-keys";

const requestSchema = z.object({
  openaiApiKey: z.string().optional(),
  elevenLabsApiKey: z.string().optional(),
  runwayApiKey: z.string().optional()
});

function getServerEnvStatus() {
  return {
    hasOpenAI: Boolean(env.OPENAI_API_KEY),
    hasElevenLabs: Boolean(env.ELEVENLABS_API_KEY),
    hasRunway: Boolean(env.RUNWAY_API_KEY)
  };
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      providerKeys: { hasOpenAI: false, hasElevenLabs: false, hasRunway: false },
      serverEnv: getServerEnvStatus(),
      authRequired: false
    });
  }

  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth.getUser();
  const user = authResult.data.user;
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return NextResponse.json({
    providerKeys: toProviderKeyStatus(readProviderKeysFromUser(user)),
    serverEnv: getServerEnvStatus(),
    authRequired: true
  });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase must be configured to save per-user provider keys." },
      { status: 400 }
    );
  }

  const parsed = await parseJsonBody(request, requestSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const supabase = await createSupabaseServerClient();
  const authResult = await supabase.auth.getUser();
  const user = authResult.data.user;
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const toStored = (value: string | undefined) => {
    if (value === undefined) return undefined;
    return value.trim();
  };

  try {
    const keys = await saveProviderKeysForUser(supabase, user, {
      openaiApiKey: toStored(parsed.data.openaiApiKey),
      elevenLabsApiKey: toStored(parsed.data.elevenLabsApiKey),
      runwayApiKey: toStored(parsed.data.runwayApiKey)
    });

    return NextResponse.json({
      providerKeys: toProviderKeyStatus(keys),
      serverEnv: getServerEnvStatus()
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save provider keys." },
      { status: 500 }
    );
  }
}
