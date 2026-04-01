# YouTube Agentic Studio

A production-structured starter for a browser-based YouTube AI assistant with multi-agent flow:
prompt generation, story writing, text-to-image planning, text-to-voice planning, and video package orchestration.

## What is included now
- Next.js App Router + TypeScript setup
- Bold, mobile-friendly UI (`/` and `/dashboard`)
- Typed agent routes:
  - `POST /api/agents/prompt`
  - `POST /api/agents/story`
  - `POST /api/agents/image`
  - `POST /api/agents/voice`
  - `POST /api/agents/video`
- Full pipeline route:
  - `POST /api/pipeline`
- Mock asset preview route:
  - `GET /api/placeholder/[...asset]`
- Provider abstraction with a mock provider
- Zod validation for request contracts
- `AGENTS.md` workflow guidance for Codex collaboration

## Quick start
```bash
npm install
npm run dev
```

Open:
- `http://localhost:3000` for overview
- `http://localhost:3000/dashboard` for the agent runner

## Request format
All agent endpoints accept:

```json
{
  "brief": {
    "topic": "How to grow a faceless YouTube channel",
    "audience": "New creators in India",
    "tone": "clear and confident",
    "durationMinutes": 6
  },
  "previous": []
}
```

`previous` is optional and used for dependencies between agents.

## Missing parts intentionally left for next phase
- Real auth/session and multi-user project permissions
- Supabase persistence for projects and outputs
- Real provider adapters (OpenAI/Runway/ElevenLabs/etc.)
- Queue worker for long-running video jobs
- Final media rendering and YouTube upload connector

## Suggested next commands
1. `npm run typecheck`
2. `npm run lint`
3. Add real adapters in `lib/agents/`
