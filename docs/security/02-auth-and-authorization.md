# Authentication and Authorization Model

## Principles
- Auth is not enough.
- Every protected action needs authorization.
- Never trust the browser.
- Object ownership checks happen on the server.

## Future user-owned resources
- sessions
- messages
- clarity_maps
- feedback
- saved resources
- account settings

## Required authorization checks
Before reading/writing any user-owned object:
1. Validate session server-side.
2. Resolve authenticated user ID.
3. Confirm object belongs to user.
4. Enforce RLS or server-side ownership check.
5. Return only allowed fields.

## Forbidden
- client-only route guards as security
- trusting userId from request body
- trusting role from localStorage
- exposing admin/service credentials