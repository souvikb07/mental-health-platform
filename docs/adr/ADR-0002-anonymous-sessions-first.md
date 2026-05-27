# ADR-0002: Anonymous Sessions First

## Status

Accepted for Phase 1.

## Decision

Do not require login/signup in Phase 1.

Use anonymous sessions with optional country, age band, and reason for visit.

## Context

Mental health reflection is sensitive. Signup creates friction and additional privacy obligations. The hackathon MVP needs users to reach the core value quickly.

## Consequences

Pros:

- lower friction
- fewer auth bugs
- better for demos
- less personal data

Cons:

- no cross-device history
- no persistent account
- limited personalization

## Revisit when

- user wants saved history
- provider handoff is added
- long-term plans and check-ins are added
