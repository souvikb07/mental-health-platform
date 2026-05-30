import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("0006 raw-free event metadata migration", () => {
  const migration = readFileSync(
    "supabase/migrations/0006_sprint1_event_metadata.sql",
    "utf8",
  );

  it("hardens owner-linked safety events without adding arbitrary metadata storage", () => {
    expect(migration).toContain("add column owner_id uuid references public.anonymous_owners(id) on delete cascade");
    expect(migration).toContain("constraint safety_events_session_owner_fk");
    expect(migration).toContain("metadata = '{}'::jsonb");
    expect(migration).toContain("idx_safety_events_owner_created");
    expect(migration).not.toMatch(/add column (payload|metadata|request|response|prompt|output|excerpt) /);
  });

  it("uses strict ephemeral event bundles and decomposes them into scalar tables", () => {
    expect(migration).toContain("public.record_sprint1_event_bundle");
    expect(migration).toContain("Invalid event bundle.");
    expect(migration).toContain("insert into public.safety_events");
    expect(migration).toContain("insert into public.model_events");
    expect(migration).toContain("insert into public.audit_events");
    expect(migration).not.toContain("insert into public.event_bundles");
  });

  it("adds transactional wrappers and removes direct service-role mutation paths", () => {
    expect(migration).toContain("public.persist_context_intake_result_with_events");
    expect(migration).toContain("public.complete_chat_turn_with_events");
    expect(migration).toContain("public.persist_clarity_map_result_with_events");
    expect(migration).toContain("public.merge_owned_session_safety_state_with_events");
    expect(migration).toContain("public.persist_feedback_with_audit");
    expect(migration).toContain("public.record_authorized_audit_event");
    expect(migration).toContain("revoke insert, update, delete on table");
    expect(migration).toContain("from service_role");
    expect(migration).toContain("set search_path = public");
  });
});
