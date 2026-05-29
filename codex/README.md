# Codex Handoff

This folder is the canonical handoff source for Codex chats working in this repo.

`docs/project-handoff/` was created for ChatGPT-web project work. It can be useful historical context, but it is not the Codex source of truth.

## Read First

Future Codex chats should read these before making changes:

1. `AGENTS.md`
2. `codex/CURRENT_STATUS.md`
3. The relevant state file for the task:
   - Backend/API work: `codex/BACKEND_STATE.md`
   - Frontend work: `codex/FRONTEND_STATE.md`
   - API-facing frontend work: `codex/API_CONTRACT.md`
   - Safety-sensitive backend or UI work: `codex/SAFETY_RULES.md`
   - Architecture/product precedent: `codex/DECISIONS.md`

## File Map

- `CURRENT_STATUS.md`: current completed work, incomplete areas, next tasks, risks, and what to avoid.
- `BACKEND_STATE.md`: backend stack, API routes, server modules, safety/AI/resource flow, environment assumptions, and backend modification rules.
- `FRONTEND_STATE.md`: frontend stack, route/component structure, styling conventions, state management, and frontend modification rules.
- `API_CONTRACT.md`: canonical frontend/backend API contract for current MVP endpoints.
- `SAFETY_RULES.md`: backend-owned safety flow, frontend rendering constraints, and known safety limitations.
- `DECISIONS.md`: durable decisions and consequences for future work.
- `SESSION_HANDOFF_TEMPLATE.md`: reusable template for ending a Codex work session.
- `prompts/`: older task prompts and scaffolding history.
- `CODEX_TASKS.md`: older task queue history.

## Maintenance Rules

- Update `codex/CURRENT_STATUS.md` before finishing any task.
- Update the specific state file when task work changes the facts it documents.
- Do not modify `docs/project-handoff/` unless explicitly requested.
- Keep this folder grounded in the actual current codebase, not stale plans.
