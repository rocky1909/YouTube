# Architecture

## Current shape
- Frontend: Next.js pages + client dashboard runner
- Backend: Route handlers in `app/api/*`
- Domain layer: `lib/agents/*`
- Validation: Zod schemas in `lib/types.ts`
- Auth + sessions: Supabase auth routes + server cookie client
- Team data: Supabase authenticated session workspace/project persistence

## Why this fixes the missing part
The earlier prototype pattern often fails by putting everything in one client file. This repo now separates:
- UI concerns
- API contract validation
- agent orchestration logic
- provider implementation details
- auth and workspace persistence

That makes it deployable and safe to extend for team use.

## Planned production layers
1. Supabase auth and project tables
2. Asset storage and signed URLs
3. Queue worker for image/video jobs
4. Human-in-the-loop review checkpoints
5. Audit trail and run history
