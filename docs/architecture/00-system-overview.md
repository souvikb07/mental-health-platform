# System Overview

## Architecture style

Architecture-first, modular monolith.

Use a single Next.js app for Phase 1, with clean boundaries inside `src/lib`.

## High-level diagram

```txt
Browser
  |
  v
Next.js App Router UI
  |
  |-- /api/session
  |-- /api/chat
  |-- /api/clarity-map
  |-- /api/resources
  |-- /api/feedback
  v
Server-side orchestration
  |
  |-- safety/risk classifier
  |-- ai/conversation agent
  |-- ai/clarity map generator
  |-- resources/router
  |-- db/supabase client
  v
Supabase Postgres
```

## Core request flow

```txt
User message
  -> API request validation
  -> save user message
  -> risk classification
  -> if high/imminent: safety response + resources
  -> if low/medium/none: conversation response
  -> post-response safety validation
  -> save assistant message
  -> return response
```

## Why this structure

- Simple enough for a 6-day hackathon.
- Clear enough for Codex to navigate.
- Safe enough for a sensitive mental health domain.
- Easy to demo: architecture can be explained in one slide.

## Phase 1 deployment

```txt
Vercel hosts Next.js
Supabase hosts Postgres
OpenAI powers AI tasks
```

## Main modules

| Module | Responsibility |
|---|---|
| `src/lib/ai` | OpenAI calls and structured output helpers |
| `src/lib/safety` | moderation, risk classifier, crisis response, validation |
| `src/lib/resources` | deterministic resource matching |
| `src/lib/db` | Supabase client and query helpers |
| `src/lib/validation` | Zod schemas for API inputs |
| `src/components` | reusable UI components |
| `schemas` | JSON schemas for AI structured outputs |
| `prompts` | prompt source of truth |
