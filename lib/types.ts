import { z } from "zod";

export const briefSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters."),
  audience: z.string().min(2, "Audience is required."),
  tone: z.string().min(2, "Tone is required."),
  durationMinutes: z.number().int().min(1).max(30)
});

export const agentNameSchema = z.enum(["prompt", "story", "image", "voice", "video"]);

export const agentResultSchema = z.object({
  agent: agentNameSchema,
  summary: z.string(),
  payload: z.record(z.any()),
  generatedAt: z.string()
});

export const pipelineRequestSchema = z.object({
  brief: briefSchema,
  projectId: z.string().uuid().optional()
});

export type BriefInput = z.infer<typeof briefSchema>;

export type AgentName = z.infer<typeof agentNameSchema>;

export type AgentResult = {
  agent: AgentName;
  summary: string;
  payload: Record<string, unknown>;
  generatedAt: string;
};

export type PipelineResponse = {
  brief: BriefInput;
  steps: AgentResult[];
};
