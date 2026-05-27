# ADR-0001: Stack Choice

## Status

Accepted for Phase 1.

## Decision

Use:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- OpenAI API
- Supabase Postgres
- Vercel

## Context

The hackathon timeline requires speed, credible architecture, and an easy demo. A modular Next.js app is enough for Phase 1.

## Consequences

Pros:

- fast to ship
- easy deployment
- Codex-friendly
- fewer moving parts
- one repo for UI/API

Cons:

- not ideal for large-scale multi-service architecture
- serverless constraints may matter later

## Revisit when

- traffic grows
- async workflows become complex
- therapist marketplace/provider workflows are added
- compliance requirements increase
