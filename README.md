# YouTube Agentic Studio

A production-structured starter for a browser-based YouTube AI assistant with multi-agent flow:
prompt generation, story writing, text-to-image planning, text-to-voice planning, and video package orchestration.

## What is included now
- Next.js App Router + TypeScript setup
- Bold, mobile-friendly UI (`/` and `/dashboard`)
- Supabase auth flow (`/auth/login`) with login/signup/logout APIs
- Team workspace and project persistence (when Supabase env vars are set)
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
- Project API:
  - `POST /api/projects`
- Provider abstraction with real adapters:
  - OpenAI (`prompt`, `story`, `image`, `tts`)
  - ElevenLabs (`tts` when key is set)
  - Runway hook (`image-to-video` task submission)
  - automatic fallback to mock provider when keys are missing
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

`projectId` is optional for single-step endpoints, and supported on full pipeline:

```json
{
  "brief": {
    "topic": "How to grow a faceless YouTube channel",
    "audience": "New creators in India",
    "tone": "clear and confident",
    "durationMinutes": 6
  },
  "projectId": "a-valid-project-uuid"
}
```

When `projectId` is provided and the user is authenticated, agent steps are saved into `agent_runs`.

## Environment
Required for auth/workspaces:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional Supabase admin key:
- `SUPABASE_SERVICE_ROLE_KEY`

Optional for real provider generation:
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `RUNWAY_API_KEY`

## Remaining next phase items
- Queue worker for long-running video jobs
- Full rendered media output pipeline
- YouTube publish connector and team approval workflow

## Suggested next commands
1. `npm run typecheck`
2. `npm run lint`
3. Configure Supabase env vars and test `/auth/login`
