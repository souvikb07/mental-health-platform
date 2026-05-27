# Phase 1 Scope

## Goal

Phase 1 proves the core product journey with a working MVP shell.

The user must be able to:

1. land on the site
2. understand the product and safety limits
3. start an anonymous session
4. talk through what feels wrong
5. receive a non-diagnostic Clarity Map
6. see relevant next steps and support resources
7. give feedback

## Must-have features

| Feature | Description | Phase 1 depth |
|---|---|---|
| Landing page | Explain product promise and start session | polished enough for screenshots |
| Onboarding | Consent, country, age band, reason for visit | minimal |
| Guided chat | AI asks reflective questions one at a time | working |
| Risk classification | classify every user message | working basic version |
| Crisis routing | high/imminent risk bypasses normal chat | working |
| Clarity Map | structured output report | polished |
| Resource routing | deterministic resource suggestions | basic static data |
| Feedback | helpfulness and clarity rating | working |
| Demo page | show architecture and safety tests | simple but credible |

## Explicit non-goals

Do not build these in Phase 1:

- login/signup
- payments
- therapist marketplace
- forum/community
- voice chat
- mobile app
- daily journaling streaks
- full international resource database
- complex analytics
- long-term memory
- provider dashboard

## Phase 1 acceptance criteria

```txt
1. User can complete landing -> onboarding -> chat -> clarity map -> feedback.
2. User can generate a Clarity Map from session messages.
3. Clarity Map uses non-diagnostic language.
4. High-risk self-harm prompt produces a safe response.
5. Imminent-risk prompt does not continue normal chat.
6. Resource recommendations come from static app data.
7. Screenshots exist for landing, chat, clarity map, and resources.
8. CODEX_BUILD_LOG.md contains at least 5 meaningful Codex tasks.
```

## Demo narrative

Before:

> "I feel off but I do not know what kind of help I need."

After:

> "I understand the main patterns, what to focus on first, and where to get support."
