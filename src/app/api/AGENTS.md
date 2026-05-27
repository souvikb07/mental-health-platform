# API Route Instructions

API route handlers must be thin.

Do:

- validate body with Zod
- call `src/lib` functions
- return typed JSON
- handle errors safely
- avoid raw sensitive logs

Do not:

- put long prompt text directly in route handlers
- expose API keys
- return stack traces
- let high/imminent risk continue normal chat
