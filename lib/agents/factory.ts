import { env } from "@/lib/env";
import { MockAgentProvider } from "@/lib/agents/mock-provider";
import { RealAgentProvider } from "@/lib/agents/real-provider";
import type { AgentProvider } from "@/lib/agents/provider";

export function getAgentProvider(): AgentProvider {
  if (env.OPENAI_API_KEY) {
    return new RealAgentProvider();
  }

  return new MockAgentProvider();
}
