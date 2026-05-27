# Codex Workflow

Use Codex as a senior pair engineer, not as an autopilot.

## Rules

1. Give Codex one focused task at a time.
2. Ask for a plan before major edits.
3. Keep safety logic manually reviewed.
4. Run tests after changes.
5. Update `CODEX_BUILD_LOG.md` after each meaningful task.

## Suggested sequence

```txt
001 Bootstrap repo skeleton
002 Database schema and types
003 Chat API
004 Safety router
005 Clarity Map generator
006 Resource routing
007 UI polish
008 Tests and demo page
```

## Good Codex prompt pattern

```txt
Read AGENTS.md and the relevant docs first.
Implement [small task].
Constraints: [safety/architecture rules].
Add tests where relevant.
Run [commands].
Update CODEX_BUILD_LOG.md.
Summarize what changed and what needs manual review.
```
