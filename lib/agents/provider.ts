import type { AgentResult, BriefInput } from "@/lib/types";

export interface AgentProvider {
  runPromptAgent(brief: BriefInput): Promise<AgentResult>;
  runStoryAgent(brief: BriefInput, promptStep: AgentResult): Promise<AgentResult>;
  runImageAgent(brief: BriefInput, storyStep: AgentResult): Promise<AgentResult>;
  runVoiceAgent(brief: BriefInput, storyStep: AgentResult): Promise<AgentResult>;
  runVideoAgent(
    brief: BriefInput,
    storyStep: AgentResult,
    imageStep: AgentResult,
    voiceStep: AgentResult
  ): Promise<AgentResult>;
}
