import type { AgentResult, BriefInput } from "@/lib/types";
import type { AgentProvider } from "@/lib/agents/provider";

const now = () => new Date().toISOString();

function buildResult(
  agent: AgentResult["agent"],
  summary: string,
  payload: Record<string, unknown>
): AgentResult {
  return {
    agent,
    summary,
    payload,
    generatedAt: now()
  };
}

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export class MockAgentProvider implements AgentProvider {
  async runPromptAgent(brief: BriefInput): Promise<AgentResult> {
    const base = `${brief.topic} for ${brief.audience}`;
    return buildResult("prompt", "Generated title, hook, and thumbnail angle.", {
      titleOptions: [
        `${base}: 7 mistakes nobody tells you`,
        `${base}: complete ${brief.tone} breakdown`,
        `From zero to publish: ${brief.topic}`
      ],
      hookLine: `In the next ${brief.durationMinutes} minutes, you'll get a full creator-ready plan for ${brief.topic}.`,
      thumbnailText: `${brief.topic} Blueprint`,
      seoKeywords: [brief.topic, brief.audience, "youtube automation", "content studio"]
    });
  }

  async runStoryAgent(brief: BriefInput, promptStep: AgentResult): Promise<AgentResult> {
    const title = Array.isArray(promptStep.payload.titleOptions)
      ? String(promptStep.payload.titleOptions[0] ?? brief.topic)
      : brief.topic;
    return buildResult("story", "Built script with scene-ready structure.", {
      selectedTitle: title,
      sections: [
        `Intro: why ${brief.topic} matters for ${brief.audience}`,
        "Problem: common creator bottlenecks",
        "Framework: repeatable method with 3 key steps",
        "Case study: one practical before/after example",
        "CTA: publish checklist and next episode teaser"
      ],
      voiceoverDraft:
        `Today we break down ${brief.topic}. This script follows a ${brief.tone} tone and fits ${brief.durationMinutes} minutes.`
    });
  }

  async runImageAgent(brief: BriefInput, storyStep: AgentResult): Promise<AgentResult> {
    const sceneCount = Array.isArray(storyStep.payload.sections) ? storyStep.payload.sections.length : 5;
    const slug = toSlug(brief.topic) || "youtube-topic";
    const images = Array.from({ length: sceneCount }, (_, index) => ({
      scene: index + 1,
      prompt: `Cinematic frame for ${brief.topic}, scene ${index + 1}, ${brief.tone} lighting, high detail`,
      mockUrl: `/api/placeholder/${slug}/scene-${index + 1}.svg`
    }));
    return buildResult("image", "Generated image prompts and mock asset URLs.", {
      images
    });
  }

  async runVoiceAgent(brief: BriefInput, storyStep: AgentResult): Promise<AgentResult> {
    return buildResult("voice", "Prepared narration plan and voice style.", {
      voiceProfile: {
        style: brief.tone,
        pacing: "medium",
        emotion: "confident"
      },
      scriptLengthEstimateSeconds: brief.durationMinutes * 60,
      mockAudioUrl: `/api/placeholder/audio/${toSlug(brief.topic)}.mp3`,
      source: storyStep.payload.voiceoverDraft
    });
  }

  async runVideoAgent(
    brief: BriefInput,
    storyStep: AgentResult,
    imageStep: AgentResult,
    voiceStep: AgentResult
  ): Promise<AgentResult> {
    const sections = Array.isArray(storyStep.payload.sections)
      ? (storyStep.payload.sections as string[])
      : [];
    const images = Array.isArray(imageStep.payload.images)
      ? imageStep.payload.images.length
      : 0;
    return buildResult("video", "Assembled timeline and export package plan.", {
      timeline: sections.map((section, index) => ({
        order: index + 1,
        section,
        transition: index === 0 ? "cold-open punch-in" : "smooth cut",
        visualSource: `scene-${index + 1}`
      })),
      assets: {
        imageCount: images,
        audio: voiceStep.payload.mockAudioUrl,
        subtitleTrack: `${toSlug(brief.topic)}-captions.srt`
      },
      delivery: {
        format: "1080p, 30fps",
        targetDurationMinutes: brief.durationMinutes,
        readyFor: ["YouTube upload", "team review", "thumbnail A/B test"]
      }
    });
  }
}
