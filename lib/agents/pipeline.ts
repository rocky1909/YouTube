import type { AgentResult, BriefInput, PipelineResponse } from "@/lib/types";
import { getAgentProvider } from "@/lib/agents/factory";
import type { AgentProvider } from "@/lib/agents/provider";

export async function runSingleAgent(
  agent: AgentResult["agent"],
  brief: BriefInput,
  previous?: AgentResult[]
): Promise<AgentResult> {
  const provider: AgentProvider = getAgentProvider();
  if (agent === "prompt") {
    return provider.runPromptAgent(brief);
  }

  const steps = previous ?? [];
  const promptStep = steps.find((step) => step.agent === "prompt") ?? (await provider.runPromptAgent(brief));

  if (agent === "story") {
    return provider.runStoryAgent(brief, promptStep);
  }

  const storyStep = steps.find((step) => step.agent === "story") ?? (await provider.runStoryAgent(brief, promptStep));

  if (agent === "image") {
    return provider.runImageAgent(brief, storyStep);
  }

  if (agent === "voice") {
    return provider.runVoiceAgent(brief, storyStep);
  }

  const imageStep = steps.find((step) => step.agent === "image") ?? (await provider.runImageAgent(brief, storyStep));
  const voiceStep = steps.find((step) => step.agent === "voice") ?? (await provider.runVoiceAgent(brief, storyStep));

  return provider.runVideoAgent(brief, storyStep, imageStep, voiceStep);
}

export async function runFullPipeline(brief: BriefInput): Promise<PipelineResponse> {
  const provider: AgentProvider = getAgentProvider();
  const steps: AgentResult[] = [];

  const promptStep = await provider.runPromptAgent(brief);
  steps.push(promptStep);

  const storyStep = await provider.runStoryAgent(brief, promptStep);
  steps.push(storyStep);

  const imageStep = await provider.runImageAgent(brief, storyStep);
  steps.push(imageStep);

  const voiceStep = await provider.runVoiceAgent(brief, storyStep);
  steps.push(voiceStep);

  const videoStep = await provider.runVideoAgent(brief, storyStep, imageStep, voiceStep);
  steps.push(videoStep);

  return {
    brief,
    steps
  };
}
