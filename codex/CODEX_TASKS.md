# Codex Task Queue

## Task 001: Bootstrap repo

- routes
- placeholder pages
- layout
- navigation
- app shell

## Task 002: Database and types

- Supabase schema
- TS types
- DB helper functions

## Task 003: Chat API

- request validation
- save messages
- risk classification placeholder
- conversation response placeholder/OpenAI integration

## Task 004: Safety router

- risk classifier
- safety event logging
- crisis response
- eval tests

## Task 005: Clarity Map

- structured output generation
- schema validation
- UI cards

## Task 006: Resources

- resource seed
- routing logic
- resources UI

## Task 007: UI polish

- mobile responsiveness
- loading states
- error states
- accessibility

## Task 008: Demo and tests

- `/demo` page
- safety test matrix
- Codex log highlights
- walkthrough-ready screenshots

## Sprint 1: Production Data Foundation

- [x] Block 1A: decisions and documentation
- [x] Block 1B: additive database migrations
- [x] Block 1C: server Supabase client, environment validation, and encryption helper
- [x] Block 1D: server-owned anonymous sessions
- [x] Block 1E: ownership guards
- [ ] Block 1F: persisted messages and chat turns
- [ ] Block 1G: persisted Clarity Maps and feedback
- [ ] Block 1H: safety, policy, model, and audit metadata
- [ ] Block 1I: rate limiting
- [ ] Block 1J: export, delete, and purge foundation
- [ ] Block 1K: frontend compatibility and hydration
- [ ] Block 1L: tests and QA

Block 1B encodes session-relative retention and raw-free storage opt-out
guardrails in SQL. The full spike on
`spike/sprint1-production-data-foundation-full-codex` at `9e196a1` remains
reference-only and must not be copied wholesale. Block 1C added unwired
server-only Supabase/config/encryption helpers. Block 1D added transactional
server-owned anonymous session creation. Block 1E added same-origin checks and
cookie-owner-scoped session guards. Next: Block 1F.
