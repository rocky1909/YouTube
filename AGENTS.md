# AGENTS.md

## Project
YouTube Agentic Studio

Browser-based multi-agent workspace for YouTube content creation:
brief -> prompt ideas -> script/story -> image prompts -> voice plan -> video package

## Engineering Rules
- Use Next.js App Router + TypeScript
- Validate all request bodies with Zod
- Keep provider integrations server-side only
- Never expose secrets in client code or localStorage
- Keep each agent as a replaceable adapter
- Make route handlers deterministic and testable
- Prefer small, reviewable commits by feature slice

## Security Rules
- Paid provider keys are server-only env vars
- No direct client-side model calls
- Keep API responses scoped to required fields

## Build Priorities
1. Auth + workspace/project persistence
2. Replace mock provider with real model adapters
3. Job queue for long image/video tasks
4. Team review and approval flow
5. Publish/export pipeline
