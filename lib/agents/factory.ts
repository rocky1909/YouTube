import { env } from "@/lib/env";
import { MockAgentProvider } from "@/lib/agents/mock-provider";
import { RealAgentProvider } from "@/lib/agents/real-provider";
import type { AgentProvider } from "@/lib/agents/provider";
import type { ProviderKeys } from "@/lib/provider-keys";

export function getAgentProvider(providerKeys?: ProviderKeys): AgentProvider {
  const effectiveOpenAI = providerKeys?.openaiApiKey ?? env.OPENAI_API_KEY;
  if (effectiveOpenAI) {
    return new RealAgentProvider(providerKeys);
  }

  return new MockAgentProvider();
}
