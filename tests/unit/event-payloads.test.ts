import { describe, expect, it, vi } from "vitest";

import { evaluateSafety } from "../../src/lib/safety-core";
import {
  buildAiTriageModelEvents,
  buildAuditEvent,
  buildEventBundle,
  buildModelEvent,
  buildSafetyEvent,
  getChatPostValidationOutcome,
  parseEventBundle,
} from "../../src/lib/server/persistence/event-payloads";

describe("raw-free event payloads", () => {
  it("builds structured safety and policy metadata without text fields", async () => {
    const decision = await evaluateSafety({
      message: "Can you diagnose me with depression?",
    });
    const event = buildSafetyEvent("api/chat", decision);
    const serialized = JSON.stringify(event);

    expect(event).toMatchObject({
      route_key: "api/chat",
      safety_state: "policy_boundary",
      response_source: "boundary",
      policy_action: "answer_with_boundary",
      policy_categories: ["diagnosis_request"],
    });
    expect(serialized).not.toContain("diagnose me");
    expect(serialized).not.toContain("cannot diagnose");
    expect(serialized).not.toContain("reason");
  });

  it("records coarse model provenance and normalizes unsafe identifiers", () => {
    expect(buildModelEvent({
      taskCode: "conversation_reply",
      sourceCode: "openai",
      modelIdentifier: "gpt-test:model/v1",
      postValidationOutcomeCode: "passed",
    })).toEqual({
      task_code: "conversation_reply",
      source_code: "openai",
      model_identifier: "gpt-test:model/v1",
      fallback_reason_code: null,
      post_validation_outcome_code: "passed",
      store_disabled: true,
    });

    expect(buildModelEvent({
      taskCode: "context_intake",
      sourceCode: "fallback",
      modelIdentifier: "unsafe model name with spaces",
    })).toMatchObject({
      source_code: "fallback",
      model_identifier: null,
      fallback_reason_code: "agent_fallback",
      store_disabled: true,
    });
  });

  it("adds triage model events only when existing Safety Core metadata says triage was used", async () => {
    const used = await evaluateSafety(
      { message: "I feel like a burden." },
      {
        aiTriageClassifier: vi.fn().mockResolvedValue({
          available: true,
          signal: triageSignal(),
        }),
      },
    );
    const skipped = await evaluateSafety({
      message: "I have pills and I'm going to take them tonight.",
    });

    expect(buildAiTriageModelEvents([used, skipped], "triage-model")).toEqual([
      expect.objectContaining({
        task_code: "ai_triage",
        source_code: "openai",
        model_identifier: "triage-model",
        store_disabled: true,
      }),
    ]);
  });

  it("maps only allowlisted chat post-validation codes", () => {
    expect(getChatPostValidationOutcome({ blocked: false })).toBe("passed");
    expect(getChatPostValidationOutcome({
      blocked: true,
      reason: "medication_advice",
    })).toBe("blocked_medication_advice");
    expect(() => getChatPostValidationOutcome({
      blocked: true,
      reason: "private free text",
    })).toThrow();
  });

  it("rejects unknown event bundle fields", () => {
    const auditEvent = buildAuditEvent("api/chat", "completed");

    expect(() => parseEventBundle({
      ...buildEventBundle({ auditEvent }),
      raw_message: "private mental-health text",
    })).toThrow();
    expect(() => parseEventBundle({
      safety_events: [],
      model_events: [],
      audit_event: {
        ...auditEvent,
        transcript_excerpt: "private mental-health text",
      },
    })).toThrow();
  });

  it("rejects inconsistent model provenance combinations", () => {
    const auditEvent = buildAuditEvent("api/chat", "completed");

    expect(() => parseEventBundle({
      safety_events: [],
      model_events: [{
        task_code: "context_intake",
        source_code: "openai",
        model_identifier: "context-model",
        fallback_reason_code: "agent_fallback",
        post_validation_outcome_code: null,
        store_disabled: true,
      }],
      audit_event: auditEvent,
    })).toThrow();
  });
});

function triageSignal() {
  return {
    schemaVersion: "triage.v1" as const,
    riskLevel: "high" as const,
    safetyStateCandidate: "passive_suicidal_ideation" as const,
    riskCategories: ["self_harm" as const],
    policyCategories: [],
    subject: "self" as const,
    temporalUrgency: "ongoing" as const,
    intentSignal: "passive_ideation" as const,
    recommendedAction: "show_resources" as const,
    confidence: "medium" as const,
    needsClarifyingSafetyQuestion: true,
    rationaleCode: "passive_life_worth_signal" as const,
  };
}
