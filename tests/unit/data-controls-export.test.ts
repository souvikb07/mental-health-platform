import { Buffer } from "node:buffer";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getFallbackStructuredClarityMap } from "../../src/lib/ai/clarity-map/clarity-map-fallback";
import { encryptSensitiveJson } from "../../src/lib/server/crypto/sensitive-data";
import { encryptClarityMapResponse } from "../../src/lib/server/persistence/clarity-map-payloads";
import { buildAnonymousDataExport } from "../../src/lib/server/persistence/export-payloads";
import { encryptFeedbackComment } from "../../src/lib/server/persistence/feedback-payloads";
import {
  encryptChatAssistantResponse,
  encryptChatUserMessage,
  encryptContextIntakeResponse,
} from "../../src/lib/server/persistence/message-payloads";

const key = Buffer.alloc(32, 7).toString("base64");
const sessionId = "11111111-1111-4111-8111-111111111111";
const createdAt = "2026-05-01T00:00:00.000Z";
const expiresAt = "2026-05-31T00:00:00.000Z";

describe("anonymous owner export payloads", () => {
  beforeEach(() => {
    vi.stubEnv("MIND_BRIDGE_DATA_ENCRYPTION_KEY_V1", key);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("decrypts retained content and emits only the public allowlisted shape", () => {
    const contextIntake = opener();
    const assistant = chatResponse();
    const mapResponse = {
      type: "clarity_map" as const,
      source: "fallback" as const,
      clarityMap: getFallbackStructuredClarityMap({
        sessionContext: sessionContext(),
        messages: [userMessage()],
      }),
    };
    const exported = buildAnonymousDataExport({
      sessions: [{
        ...sessionRow(),
        onboarding_note_encrypted: encryptSensitiveJson({
          version: "onboarding_context.v1",
          mainConcernText: "retained onboarding text",
        }),
      }],
      consentEvents: [{
        session_id: sessionId,
        consent_type: "sensitive_storage",
        policy_version: "sensitive_storage.v1",
        accepted: true,
        created_at: createdAt,
      }],
      messages: [
        {
          session_id: sessionId,
          source: "context_intake_result",
          content_encrypted: encryptContextIntakeResponse(contextIntake),
          created_at: createdAt,
        },
        {
          session_id: sessionId,
          source: "chat_user",
          content_encrypted: encryptChatUserMessage(userMessage()),
          created_at: createdAt,
        },
        {
          session_id: sessionId,
          source: "chat_fallback",
          content_encrypted: encryptChatAssistantResponse(assistant),
          created_at: createdAt,
        },
      ],
      clarityMaps: [{
        session_id: sessionId,
        source: "fallback",
        schema_version: "clarity_map.v1",
        map_encrypted: encryptClarityMapResponse(mapResponse),
        created_at: createdAt,
      }],
      feedback: [{
        session_id: sessionId,
        clarity_rating: 4,
        helpfulness_rating: 5,
        felt_safe: true,
        unsafe_or_unhelpful: false,
        comment_encrypted: encryptFeedbackComment("retained feedback text"),
        created_at: createdAt,
      }],
      safetyEvents: [safetyEvent()],
      modelEvents: [modelEvent(sessionId), modelEvent(null)],
      auditEvents: [auditEvent(sessionId), auditEvent(null)],
    }, "2026-05-31T12:00:00.000Z");

    expect(exported).toMatchObject({
      schemaVersion: "mindbridge.anonymous-data-export.v1",
      journeys: [{
        session: { sessionId, expiresAt },
        onboardingContext: { mainConcernText: "retained onboarding text" },
        messages: [
          { kind: "context_intake_response" },
          { kind: "chat_user", message: { content: "retained user text" } },
          { kind: "chat_assistant", message: { content: "retained assistant text" } },
        ],
        clarityMaps: [{ response: { type: "clarity_map" } }],
        feedback: [{ comment: "retained feedback text" }],
        safetyEvents: [{ routeKey: "api/chat" }],
        modelEvents: [{ taskCode: "conversation_reply" }],
        auditEvents: [{ eventType: "authorized_session_action" }],
      }],
      ownerEvents: {
        modelEvents: [{ taskCode: "conversation_reply" }],
        auditEvents: [{ eventType: "authorized_session_action" }],
      },
    });

    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain("ciphertext");
    expect(serialized).not.toContain("authTag");
    expect(serialized).not.toContain("owner-id");
    expect(serialized).not.toContain("token_hash");
    expect(serialized).not.toContain("transcript_fingerprint");
  });

  it("includes expired sessions that remain retained before purge", () => {
    const exported = buildAnonymousDataExport(emptyRows([sessionRow()]));

    expect(exported.journeys).toHaveLength(1);
    expect(exported.journeys[0].session.expiresAt).toBe(expiresAt);
  });

  it("fails generically for malformed envelopes and cross-session rows", () => {
    expect(() =>
      buildAnonymousDataExport({
        ...emptyRows([sessionRow()]),
        feedback: [{
          session_id: sessionId,
          clarity_rating: 4,
          helpfulness_rating: 5,
          felt_safe: true,
          unsafe_or_unhelpful: false,
          comment_encrypted: {
            kid: "v1",
            algorithm: "aes-256-gcm",
            iv: "bad",
            authTag: "bad",
            ciphertext: "bad",
          },
          created_at: createdAt,
        }],
      }),
    ).toThrow("Please try again later.");

    expect(() =>
      buildAnonymousDataExport({
        ...emptyRows([sessionRow()]),
        consentEvents: [{
          session_id: "22222222-2222-4222-8222-222222222222",
          consent_type: "sensitive_storage",
          policy_version: "sensitive_storage.v1",
          accepted: true,
          created_at: createdAt,
        }],
      }),
    ).toThrow("Please try again later.");
  });
});

function emptyRows(sessions: unknown[] = []) {
  return {
    sessions,
    consentEvents: [],
    messages: [],
    clarityMaps: [],
    feedback: [],
    safetyEvents: [],
    modelEvents: [],
    auditEvents: [],
  };
}

function sessionRow() {
  return {
    id: sessionId,
    created_at: createdAt,
    expires_at: expiresAt,
    storage_consent_accepted: true,
    storage_policy_version: "sensitive_storage.v1",
    country_code: "US",
    main_concern_category: "overwhelmed",
    current_risk_level: "low",
    current_safety_state: "normal_support",
    onboarding_note_encrypted: null,
  };
}

function sessionContext() {
  return {
    sessionId,
    countryCode: "US" as const,
    ageConfirmed: true as const,
    consentAccepted: true as const,
    mainConcernCategory: "overwhelmed" as const,
    mainConcernLabel: "Overwhelmed",
  };
}

function userMessage() {
  return {
    id: "user-message",
    role: "user" as const,
    content: "retained user text",
    createdAt,
  };
}

function opener() {
  return {
    type: "opener" as const,
    assistantMessage: {
      id: "opener",
      role: "assistant" as const,
      content: "retained opener text",
      createdAt,
    },
    contextIntake: {
      schemaVersion: "context_intake.v1" as const,
      openingMessage: "What feels most pressing today?",
      inferredFocusAreas: ["overwhelm" as const],
      firstQuestionType: "clarify_main_pressure" as const,
      tone: "warm_grounded" as const,
      safetyNoteNeeded: false,
      shouldMentionProfessionalSupport: false,
      confidence: "medium" as const,
    },
    source: "fallback" as const,
  };
}

function chatResponse() {
  return {
    assistantMessage: {
      id: "assistant-message",
      role: "assistant" as const,
      content: "retained assistant text",
      createdAt,
    },
    risk: {
      level: "low" as const,
      categories: [],
      requiresCrisisResponse: false,
    },
    nextRecommendedAction: "continue_chat" as const,
    mode: "normal" as const,
    safety: null,
    resources: [],
    source: "fallback" as const,
  };
}

function safetyEvent() {
  return {
    session_id: sessionId,
    route_key: "api/chat",
    risk_level: "low",
    categories: [],
    action_taken: "continue_chat",
    safety_state: "normal_support",
    response_source: "normal",
    policy_action: "allow",
    policy_categories: [],
    signal_tags: [],
    requires_crisis_response: false,
    ai_triage_available: false,
    ai_triage_used: false,
    ai_triage_escalated: false,
    ai_triage_confidence: null,
    ai_triage_rationale_code: null,
    created_at: createdAt,
  };
}

function modelEvent(eventSessionId: string | null) {
  return {
    session_id: eventSessionId,
    task_code: "conversation_reply",
    source_code: "fallback",
    model_identifier: null,
    fallback_reason_code: "agent_fallback",
    post_validation_outcome_code: "passed",
    store_disabled: true,
    created_at: createdAt,
  };
}

function auditEvent(eventSessionId: string | null) {
  return {
    session_id: eventSessionId,
    event_type: "authorized_session_action",
    route_key: "api/chat",
    outcome_code: "completed",
    error_code: null,
    created_at: createdAt,
  };
}
