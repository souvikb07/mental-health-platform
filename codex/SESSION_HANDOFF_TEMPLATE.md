# Codex Session Handoff Template

Use this template at the end of a Codex work session when another Codex chat may continue.

## Task

- Name:
- Goal:
- Status: complete / partial / blocked

## Files Changed

- `path/to/file`: what changed and why

## Behavior Preserved

- API contracts:
- Backend route/service behavior:
- Storage keys:
- Safety behavior:
- Policy-boundary behavior:
- Resource routing:
- Clarity Map gating:
- Route behavior:
- Tests/fixtures:

## Backend Notes

- API endpoints changed:
- Request/response shapes changed:
- Environment variables added/changed:
- Database/Supabase migrations added/changed:
- Auth/authorization impact:
- Raw-message logging risk:
- New dependencies:

## Safety Notes

- Deterministic risk rules touched:
- Safety Core/playbooks touched:
- AI triage behavior touched:
- Policy-boundary rules touched:
- Resource selection touched:
- Clarity Map safety gating touched:
- Regression cases checked:

## Validation

Commands run:

```bash
npm test
npm run lint
npm run build
git diff --check
```

Results:

- Tests:
- Lint:
- Build:
- Diff check:
- Real AI eval, if run:
- Manual API checks, if run:

## Manual QA

- Desktop:
- Mobile:
- Main happy path:
- Safety/boundary cases:
- Known unverified items:

## Risks Or Limitations

- None recorded.

## Next Recommended Step

- Describe the next recommended action.

## Read First Next Time

- `AGENTS.md`
- `codex/CURRENT_STATUS.md`
- Backend/API: `codex/BACKEND_STATE.md`
- Frontend/UI: `codex/FRONTEND_STATE.md`
- Contracts/safety: `codex/API_CONTRACT.md` / `codex/SAFETY_RULES.md`
