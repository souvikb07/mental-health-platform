# ADR-0003: Safety-First AI Pipeline

## Status

Accepted for Phase 1.

## Decision

Every user message must be risk-classified before a normal AI response.

High or imminent risk routes to safety support instead of continuing the normal clarity conversation.

## Context

Mental health products can receive self-harm, abuse, psychosis-like, and emergency disclosures. A normal chatbot flow is not safe enough.

## Consequences

Pros:

- safer behavior
- clearer judge demo
- stronger product trust
- better architecture boundary

Cons:

- more implementation work
- false positives possible
- requires careful copy and tests

## Revisit when

- adding human escalation
- adding country-specific crisis integrations
- adding clinical advisors
