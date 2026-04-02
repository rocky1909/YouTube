import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProviderKeys = {
  openaiApiKey?: string;
  elevenLabsApiKey?: string;
  runwayApiKey?: string;
};

export type ProviderKeyStatus = {
  hasOpenAI: boolean;
  hasElevenLabs: boolean;
  hasRunway: boolean;
};

const METADATA_KEY = "providerKeys";

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readProviderKeysFromUser(user: Pick<User, "user_metadata">): ProviderKeys {
  const root = asObject(user.user_metadata);
  const keys = asObject(root[METADATA_KEY]);

  return {
    openaiApiKey: toOptionalString(keys.openaiApiKey),
    elevenLabsApiKey: toOptionalString(keys.elevenLabsApiKey),
    runwayApiKey: toOptionalString(keys.runwayApiKey)
  };
}

export function toProviderKeyStatus(keys: ProviderKeys): ProviderKeyStatus {
  return {
    hasOpenAI: Boolean(keys.openaiApiKey),
    hasElevenLabs: Boolean(keys.elevenLabsApiKey),
    hasRunway: Boolean(keys.runwayApiKey)
  };
}

export async function saveProviderKeysForUser(
  supabase: SupabaseClient,
  user: Pick<User, "user_metadata">,
  incoming: ProviderKeys
) {
  const existingRoot = asObject(user.user_metadata);
  const existingKeys = asObject(existingRoot[METADATA_KEY]);

  const nextKeys = {
    ...existingKeys,
    ...(incoming.openaiApiKey !== undefined ? { openaiApiKey: incoming.openaiApiKey } : {}),
    ...(incoming.elevenLabsApiKey !== undefined ? { elevenLabsApiKey: incoming.elevenLabsApiKey } : {}),
    ...(incoming.runwayApiKey !== undefined ? { runwayApiKey: incoming.runwayApiKey } : {})
  };

  const updateResult = await supabase.auth.updateUser({
    data: {
      ...existingRoot,
      [METADATA_KEY]: nextKeys
    }
  });

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  const nextUser = updateResult.data.user ?? user;
  return readProviderKeysFromUser(nextUser);
}
