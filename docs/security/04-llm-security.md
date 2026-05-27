# LLM Security Rules

## Model output is untrusted
The model can generate incorrect, unsafe, or manipulated content. Treat model output as untrusted text.

## Before model call
- validate request
- run deterministic safety classifier
- block high/imminent risk from normal model generation
- enforce rate limits

## After model call
- post-validate for diagnosis, medication advice, treatment protocols, self-harm details, and unsafe reassurance
- sanitize/render as plain text
- never use `dangerouslySetInnerHTML`

## Tool/function calls
Future model tool calls must be:
- allowlisted
- schema-validated
- authorization-checked server-side
- incapable of accessing secrets directly

## Prompt injection
User input may try to override system instructions. Do not let user/model text change:
- auth rules
- database permissions
- safety routing
- billing/payment state
- secret access