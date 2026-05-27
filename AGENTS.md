# Codex Project Instructions: MindBridge

You are working on **MindBridge**, a Phase 1 hackathon MVP for an AI-powered mental health clarity platform.

## Product position

MindBridge helps users reflect on what they may be experiencing and identify the right next support step.

It must **not** be built or described as:

- an AI therapist
- a diagnostic tool
- a treatment tool
- a medical device
- a crisis service
- a replacement for professional care

Use language such as:

- "patterns that may be present"
- "this is not a diagnosis"
- "a professional may be able to help you explore this"
- "consider reaching out to a trusted person or qualified professional"

Avoid language such as:

- "you have depression"
- "you need medication"
- "this treatment will fix you"
- "you are definitely safe"

## Phase 1 build target

Build the narrow core journey first:

```txt
Landing -> Onboarding -> Guided Chat -> Safety Routing -> Clarity Map -> Resources -> Feedback
```

Do not build auth, payments, therapist marketplace, community forum, long-term memory, voice mode, or mobile app in Phase 1.

## Technical stack

Use this default stack unless explicitly told otherwise:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- OpenAI API
- Supabase Postgres
- Vercel
- Zod for validation
- Vitest for unit tests

## Architecture rules

1. Treat safety as part of the architecture, not a UI add-on.
2. Every user message must pass through a risk classification step before a normal assistant response.
3. Resource recommendations must come from app-owned data, not model invention.
4. Structured outputs must be validated before storage/rendering.
5. Keep AI orchestration server-side only.
6. Keep API keys server-side only.
7. Do not store raw chat indefinitely unless explicitly enabled later.
8. No analytics provider should receive raw mental health content.
9. Prefer small modules with clear contracts over large all-purpose files.
10. Add tests for safety, schemas, and resource routing.

## Folder expectations

Use the app structure documented in `PROJECT_TREE.md`.

Important folders:

```txt
src/app                 Next.js routes and pages
src/app/api             server-side route handlers
src/components          UI components
src/lib/ai              OpenAI client, prompts, structured output helpers
src/lib/safety          moderation, risk classifier, crisis routing
src/lib/resources       resource routing and curated resource loading
src/lib/db              Supabase clients and database helpers
src/types               shared TypeScript types
schemas                 JSON schemas for AI outputs
prompts                 model prompts
supabase                migrations and seed data
docs                   product and architecture docs
codex                  Codex workflow prompts and build log helpers
```

## Safety behavior

Risk levels:

```txt
none | low | medium | high | imminent
```

If risk is `high` or `imminent`, do not continue normal reflective chat. Route to a safe support response and relevant resources.

Never provide self-harm instructions, lethal means information, medication dosing, or definitive medical advice.

For crisis copy, keep the tone calm, direct, and short. Encourage immediate local emergency support, crisis helplines, and contacting a trusted person.

## AI tasks

Use separate AI tasks for:

1. conversation guidance
2. risk classification
3. clarity map generation
4. post-response safety validation

Do not create one giant prompt for everything.

## Coding conventions

- Use TypeScript strictness.
- Prefer named exports.
- Validate all request bodies with Zod.
- Do not expose stack traces to users.
- Keep route handlers thin; put business logic in `src/lib`.
- Use server-only modules for OpenAI/Supabase admin clients.
- Keep UI components accessible and mobile responsive.

## Test expectations

Before considering a task done, add or update tests when the change affects:

- risk classification
- crisis routing
- structured outputs
- API contracts
- resource routing
- privacy-sensitive behavior

Minimum commands to run when relevant:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

## Codex build log

After every meaningful coding task, update `CODEX_BUILD_LOG.md` with:

- date/time
- prompt used
- files changed
- commands run
- what passed
- what failed
- manual decisions made

## Pull request summary format

When summarizing changes, use:

```txt
What changed:
- ...

Safety/privacy notes:
- ...

Validation:
- ...

Next step:
- ...
```
