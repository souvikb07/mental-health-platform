# Real AI Smoke Eval

This local harness checks MindBridge API behavior against synthetic eval cases. It is meant for developer smoke testing only, after real OpenAI environment variables are configured locally.

It covers:

- context intake openers
- normal guided chat
- deterministic safety routing
- policy boundary routing
- AI-triage-sensitive semantic cases
- negation and idiom false positives
- multilingual risk-signal probes

## Safety Rules

- Use synthetic cases only.
- Do not paste API keys into Codex, chat, docs, or Git.
- Put keys in `.env.local` only.
- Do not use real user messages.
- Do not commit `eval-results/`.

The script does not read `OPENAI_API_KEY` directly. The local Next.js server reads `.env.local`; the eval harness only calls local HTTP API routes.

## Run

Start the local server:

```bash
npm run dev
```

In a second terminal, explicitly enable the eval:

```bash
RUN_REAL_AI_EVALS=true EVAL_BASE_URL=http://localhost:3000 npm run eval:ai:smoke
```

Without `RUN_REAL_AI_EVALS=true`, the script exits with instructions and makes no API calls.

## Results

Results are written locally to:

```txt
eval-results/
```

Each run creates:

```txt
eval-results/real-ai-smoke-<timestamp>.json
eval-results/real-ai-smoke-<timestamp>.md
```

Inspect these locally after a run. They are ignored by Git and should not be committed.

## Interpreting Warnings

Some assertions are warnings because they depend on optional local OpenAI configuration. For example, context-intake and normal chat sources are expected to be `openai` when the corresponding model env vars are configured; otherwise the app may safely return deterministic fallbacks.

Warnings should be reviewed, but hard failures are the first priority.
