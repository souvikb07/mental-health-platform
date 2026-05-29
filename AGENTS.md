# Codex Guidance: MindBridge

This is the canonical guidance file for Codex work in this repo.

## Handoff Source

- Codex-specific handoff lives in `codex/`.
- `docs/project-handoff/` is ChatGPT-web project history, not the canonical Codex handoff source.
- Before making changes, read `codex/CURRENT_STATUS.md` and the relevant state files in `codex/`.
- Update `codex/CURRENT_STATUS.md` before finishing any task.

## Product Boundaries

MindBridge is a Phase 1 MVP for reflection and support routing. It is not therapy, diagnosis, treatment, medical advice, a crisis service, or a replacement for professional care.

Preserve the core journey:

```txt
Landing -> Onboarding -> Guided Chat -> Safety Routing -> Clarity Map -> Resources -> Feedback
```

Do not add auth, profile/account history, payments, community, long-term memory, voice mode, or unrelated product surfaces unless explicitly approved.

## Frontend And Safety Rules

- Treat `reference/stitch/` as visual reference only.
- Do not import Stitch HTML directly into production.
- Do not iframe or embed Stitch HTML.
- Do not use `dangerouslySetInnerHTML` for Stitch, model, or user output.
- Translate visual references into real React/Next.js components.
- Preserve real backend API contracts and safety behavior.
- Do not hardcode Clarity Map, safety, resource, crisis, Harmony Signal, or risk decisions.
- Frontend must render backend safety decisions; it must not infer or override risk.
- Resource recommendations must come from app-owned data and backend/API flows, not model invention.

## Backend Rules

- Keep API route handlers thin; put business logic in `src/lib/server/**`, safety modules, validation modules, or focused domain helpers.
- Preserve published API contracts unless the task explicitly approves a contract change.
- Preserve safety routing, policy-boundary behavior, resource routing, and Clarity Map safety gating.
- Do not introduce new dependencies without explaining why they are needed and why existing code cannot reasonably cover the task.
- Never expose server-only secrets to client components or `NEXT_PUBLIC_` variables.

## Validation

Run the commands appropriate to the change. For frontend code changes, default to:

```bash
npm test
npm run lint
npm run build
git diff --check
```

For documentation-only changes, `git diff --check` is usually sufficient unless the documentation references generated behavior that needs verification.
