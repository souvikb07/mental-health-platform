# AI Orchestration

## Principle

Do not build one giant mental-health chatbot. Use small AI tasks with clear contracts.

## AI task 1: conversation agent

Purpose:

- listen
- reflect
- ask one question at a time
- gather context
- avoid diagnosis/treatment claims

Input:

- recent messages
- onboarding context
- current risk level

Output:

- assistant message
- suggested next stage

Prompt file:

```txt
prompts/conversation-agent.md
```

## AI task 2: risk classifier

Purpose:

- identify self-harm, harm-to-others, abuse, psychosis/mania-like signals, medical emergency, minor safety
- produce structured risk result

Output schema:

```txt
schemas/risk-classification.schema.json
```

## AI task 3: clarity map generator

Purpose:

- summarize the session into a structured, non-diagnostic report
- produce focus areas and next steps

Output schema:

```txt
schemas/clarity-map.schema.json
```

## AI task 4: post-response validator

Purpose:

- catch unsafe assistant text before returning it
- block diagnosis, medication advice, dangerous reassurance, self-harm details, delusion affirmation

## Orchestration rule

```txt
Risk classifier runs before normal conversation.
Post-response validator runs before output is returned.
```

## Structured outputs

Use schemas for:

- risk classification
- clarity map
- resources
- feedback if needed

Validate returned JSON before rendering or saving.

## Fallback behavior

If AI call fails:

- show a safe fallback message
- do not pretend to have generated a full clarity map
- log the error without raw sensitive content when possible
