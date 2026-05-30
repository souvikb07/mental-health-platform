-- MindBridge Sprint 1 raw-free safety, model, and audit metadata.
-- Event bundles are strict RPC transport only. They are decomposed into
-- allowlisted scalar columns and are never retained as arbitrary JSON.

alter table public.safety_events
  add column owner_id uuid references public.anonymous_owners(id) on delete cascade,
  add column route_key text,
  add column response_source text,
  add constraint safety_events_session_owner_fk
    foreign key (session_id, owner_id)
    references public.sessions(id, owner_id)
    on delete cascade,
  add constraint safety_events_owner_shape_check
    check (
      owner_id is null
      or (
        metadata = '{}'::jsonb
        and route_key in (
          'api/context-intake',
          'api/chat',
          'api/clarity-map'
        )
        and response_source in ('normal', 'safety', 'boundary')
        and categories <@ array[
          'self_harm',
          'harm_to_others',
          'abuse',
          'psychosis_or_mania_signal',
          'substance_use',
          'minor_safety',
          'medical_emergency'
        ]::text[]
        and action_taken in (
          'continue_chat',
          'continue_with_supportive_nudge',
          'show_resources',
          'urgent_support'
        )
        and safety_state is not null
        and policy_action is not null
        and ai_triage_available is not null
        and ai_triage_used is not null
        and ai_triage_escalated is not null
        and (not ai_triage_used or ai_triage_available)
        and (not ai_triage_escalated or ai_triage_used)
        and (
          ai_triage_used
          or (
            ai_triage_confidence is null
            and ai_triage_rationale_code is null
          )
        )
        and (
          not ai_triage_used
          or (
            ai_triage_confidence is not null
            and ai_triage_rationale_code is not null
          )
        )
      )
    );

create index idx_safety_events_owner_created
  on public.safety_events(owner_id, created_at desc);

create or replace function public.record_sprint1_event_bundle(
  p_owner_id uuid,
  p_session_id uuid,
  p_event_bundle jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  safety_event jsonb;
  model_event jsonb;
  audit_event jsonb;
begin
  perform 1
    from public.sessions
    where id = p_session_id
      and owner_id = p_owner_id
      and expires_at > now();

  if not found then
    raise exception 'Owned session not found.';
  end if;

  if p_event_bundle is null
    or jsonb_typeof(p_event_bundle) <> 'object'
    or not p_event_bundle ? 'safety_events'
    or not p_event_bundle ? 'model_events'
    or not p_event_bundle ? 'audit_event'
    or p_event_bundle - array['safety_events', 'model_events', 'audit_event'] <> '{}'::jsonb
    or jsonb_typeof(p_event_bundle->'safety_events') <> 'array'
    or jsonb_typeof(p_event_bundle->'model_events') <> 'array'
    or jsonb_typeof(p_event_bundle->'audit_event') <> 'object'
  then
    raise exception 'Invalid event bundle.';
  end if;

  for safety_event in
    select value from jsonb_array_elements(p_event_bundle->'safety_events')
  loop
    if jsonb_typeof(safety_event) <> 'object'
      or safety_event - array[
        'route_key',
        'risk_level',
        'categories',
        'action_taken',
        'safety_state',
        'response_source',
        'policy_action',
        'policy_categories',
        'signal_tags',
        'requires_crisis_response',
        'ai_triage_available',
        'ai_triage_used',
        'ai_triage_escalated',
        'ai_triage_confidence',
        'ai_triage_rationale_code'
      ] <> '{}'::jsonb
      or not safety_event ?& array[
        'route_key',
        'risk_level',
        'categories',
        'action_taken',
        'safety_state',
        'response_source',
        'policy_action',
        'policy_categories',
        'signal_tags',
        'requires_crisis_response',
        'ai_triage_available',
        'ai_triage_used',
        'ai_triage_escalated',
        'ai_triage_confidence',
        'ai_triage_rationale_code'
      ]
      or jsonb_typeof(safety_event->'categories') <> 'array'
      or jsonb_typeof(safety_event->'policy_categories') <> 'array'
      or jsonb_typeof(safety_event->'signal_tags') <> 'array'
      or jsonb_typeof(safety_event->'requires_crisis_response') <> 'boolean'
      or jsonb_typeof(safety_event->'ai_triage_available') <> 'boolean'
      or jsonb_typeof(safety_event->'ai_triage_used') <> 'boolean'
      or jsonb_typeof(safety_event->'ai_triage_escalated') <> 'boolean'
    then
      raise exception 'Invalid safety event.';
    end if;

    insert into public.safety_events (
      owner_id,
      session_id,
      route_key,
      risk_level,
      categories,
      action_taken,
      safety_state,
      response_source,
      policy_action,
      policy_categories,
      signal_tags,
      requires_crisis_response,
      ai_triage_available,
      ai_triage_used,
      ai_triage_escalated,
      ai_triage_confidence,
      ai_triage_rationale_code,
      metadata
    )
    values (
      p_owner_id,
      p_session_id,
      safety_event->>'route_key',
      safety_event->>'risk_level',
      array(select jsonb_array_elements_text(safety_event->'categories')),
      safety_event->>'action_taken',
      safety_event->>'safety_state',
      safety_event->>'response_source',
      safety_event->>'policy_action',
      array(select jsonb_array_elements_text(safety_event->'policy_categories')),
      array(select jsonb_array_elements_text(safety_event->'signal_tags')),
      (safety_event->>'requires_crisis_response')::boolean,
      (safety_event->>'ai_triage_available')::boolean,
      (safety_event->>'ai_triage_used')::boolean,
      (safety_event->>'ai_triage_escalated')::boolean,
      safety_event->>'ai_triage_confidence',
      safety_event->>'ai_triage_rationale_code',
      '{}'::jsonb
    );
  end loop;

  for model_event in
    select value from jsonb_array_elements(p_event_bundle->'model_events')
  loop
    if jsonb_typeof(model_event) <> 'object'
      or model_event - array[
        'task_code',
        'source_code',
        'model_identifier',
        'fallback_reason_code',
        'post_validation_outcome_code',
        'store_disabled'
      ] <> '{}'::jsonb
      or not model_event ?& array[
        'task_code',
        'source_code',
        'model_identifier',
        'fallback_reason_code',
        'post_validation_outcome_code',
        'store_disabled'
      ]
      or model_event->>'task_code' not in (
        'context_intake',
        'conversation_reply',
        'clarity_map_generation',
        'ai_triage'
      )
      or model_event->>'source_code' not in ('openai', 'fallback')
      or (
        model_event->>'fallback_reason_code' is not null
        and model_event->>'fallback_reason_code' <> 'agent_fallback'
      )
      or (
        model_event->>'source_code' = 'openai'
        and model_event->>'fallback_reason_code' is not null
      )
      or (
        model_event->>'source_code' = 'fallback'
        and model_event->>'fallback_reason_code' is distinct from 'agent_fallback'
      )
      or (
        model_event->>'source_code' = 'fallback'
        and model_event->>'model_identifier' is not null
      )
      or (
        model_event->>'task_code' <> 'conversation_reply'
        and model_event->>'post_validation_outcome_code' is not null
      )
      or (
        model_event->>'task_code' = 'ai_triage'
        and model_event->>'source_code' <> 'openai'
      )
      or (
        model_event->>'post_validation_outcome_code' is not null
        and model_event->>'post_validation_outcome_code' not in (
          'passed',
          'blocked_empty_response',
          'blocked_definitive_diagnosis',
          'blocked_medication_advice',
          'blocked_treatment_protocol',
          'blocked_unsafe_reassurance',
          'blocked_therapy_replacement',
          'blocked_self_harm_method_detail'
        )
      )
      or jsonb_typeof(model_event->'store_disabled') <> 'boolean'
      or (model_event->>'store_disabled')::boolean is not true
    then
      raise exception 'Invalid model event.';
    end if;

    insert into public.model_events (
      owner_id,
      session_id,
      task_code,
      source_code,
      model_identifier,
      fallback_reason_code,
      post_validation_outcome_code,
      store_disabled
    )
    values (
      p_owner_id,
      p_session_id,
      model_event->>'task_code',
      model_event->>'source_code',
      model_event->>'model_identifier',
      model_event->>'fallback_reason_code',
      model_event->>'post_validation_outcome_code',
      true
    );
  end loop;

  audit_event := p_event_bundle->'audit_event';

  if audit_event - array[
      'event_type',
      'route_key',
      'outcome_code',
      'error_code'
    ] <> '{}'::jsonb
    or not audit_event ?& array[
      'event_type',
      'route_key',
      'outcome_code',
      'error_code'
    ]
    or audit_event->>'event_type' <> 'authorized_session_action'
    or audit_event->>'route_key' not in (
      'api/context-intake',
      'api/chat',
      'api/clarity-map',
      'api/feedback'
    )
    or audit_event->>'outcome_code' not in (
      'completed',
      'replayed',
      'safety_blocked',
      'boundary_blocked',
      'insufficient_context',
      'legacy_served',
      'received'
    )
    or audit_event->>'error_code' is not null
  then
    raise exception 'Invalid audit event.';
  end if;

  insert into public.audit_events (
    owner_id,
    session_id,
    event_type,
    route_key,
    outcome_code,
    error_code
  )
  values (
    p_owner_id,
    p_session_id,
    audit_event->>'event_type',
    audit_event->>'route_key',
    audit_event->>'outcome_code',
    null
  );
end;
$$;

create or replace function public.persist_context_intake_result_with_events(
  p_owner_id uuid,
  p_session_id uuid,
  p_response_encrypted jsonb,
  p_risk_level text,
  p_safety_state text,
  p_event_bundle jsonb
)
returns table(content_encrypted jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select result.content_encrypted
      from public.persist_context_intake_result(
        p_owner_id,
        p_session_id,
        p_response_encrypted,
        p_risk_level,
        p_safety_state
      ) result;

  perform public.record_sprint1_event_bundle(
    p_owner_id,
    p_session_id,
    p_event_bundle
  );
end;
$$;

create or replace function public.complete_chat_turn_with_events(
  p_owner_id uuid,
  p_session_id uuid,
  p_client_message_id uuid,
  p_lease_token_hash text,
  p_user_content_encrypted jsonb,
  p_assistant_content_encrypted jsonb,
  p_assistant_source text,
  p_risk_level text,
  p_safety_state text,
  p_user_created_at timestamptz,
  p_assistant_created_at timestamptz,
  p_event_bundle jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.complete_chat_turn(
    p_owner_id,
    p_session_id,
    p_client_message_id,
    p_lease_token_hash,
    p_user_content_encrypted,
    p_assistant_content_encrypted,
    p_assistant_source,
    p_risk_level,
    p_safety_state,
    p_user_created_at,
    p_assistant_created_at
  );

  perform public.record_sprint1_event_bundle(
    p_owner_id,
    p_session_id,
    p_event_bundle
  );
end;
$$;

create or replace function public.persist_clarity_map_result_with_events(
  p_owner_id uuid,
  p_session_id uuid,
  p_map_encrypted jsonb,
  p_source text,
  p_schema_version text,
  p_transcript_fingerprint text,
  p_lease_token_hash text,
  p_risk_level text,
  p_safety_state text,
  p_event_bundle jsonb
)
returns table(map_encrypted jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select result.map_encrypted
      from public.persist_clarity_map_result(
        p_owner_id,
        p_session_id,
        p_map_encrypted,
        p_source,
        p_schema_version,
        p_transcript_fingerprint,
        p_lease_token_hash,
        p_risk_level,
        p_safety_state
      ) result;

  perform public.record_sprint1_event_bundle(
    p_owner_id,
    p_session_id,
    p_event_bundle
  );
end;
$$;

create or replace function public.merge_owned_session_safety_state_with_events(
  p_owner_id uuid,
  p_session_id uuid,
  p_risk_level text,
  p_safety_state text,
  p_event_bundle jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.merge_owned_session_safety_state(
    p_owner_id,
    p_session_id,
    p_risk_level,
    p_safety_state
  );

  perform public.record_sprint1_event_bundle(
    p_owner_id,
    p_session_id,
    p_event_bundle
  );
end;
$$;

create or replace function public.persist_feedback_with_audit(
  p_owner_id uuid,
  p_session_id uuid,
  p_clarity_rating integer,
  p_helpfulness_rating integer,
  p_felt_safe boolean,
  p_unsafe_or_unhelpful boolean,
  p_comment_encrypted jsonb,
  p_event_bundle jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.persist_feedback(
    p_owner_id,
    p_session_id,
    p_clarity_rating,
    p_helpfulness_rating,
    p_felt_safe,
    p_unsafe_or_unhelpful,
    p_comment_encrypted
  );

  perform public.record_sprint1_event_bundle(
    p_owner_id,
    p_session_id,
    p_event_bundle
  );
end;
$$;

create or replace function public.record_authorized_audit_event(
  p_owner_id uuid,
  p_session_id uuid,
  p_event_bundle jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.record_sprint1_event_bundle(
    p_owner_id,
    p_session_id,
    p_event_bundle
  );
end;
$$;

revoke insert, update, delete on table
  public.safety_events,
  public.model_events,
  public.audit_events
from service_role;

revoke all on function public.record_sprint1_event_bundle(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.persist_context_intake_result_with_events(uuid, uuid, jsonb, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.complete_chat_turn_with_events(uuid, uuid, uuid, text, jsonb, jsonb, text, text, text, timestamptz, timestamptz, jsonb)
  from public, anon, authenticated;
revoke all on function public.persist_clarity_map_result_with_events(uuid, uuid, jsonb, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.merge_owned_session_safety_state_with_events(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.persist_feedback_with_audit(uuid, uuid, integer, integer, boolean, boolean, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.record_authorized_audit_event(uuid, uuid, jsonb)
  from public, anon, authenticated;

revoke all on function public.persist_context_intake_result(uuid, uuid, jsonb, text, text)
  from service_role;
revoke all on function public.complete_chat_turn(uuid, uuid, uuid, text, jsonb, jsonb, text, text, text, timestamptz, timestamptz)
  from service_role;
revoke all on function public.persist_clarity_map_result(uuid, uuid, jsonb, text, text, text, text, text, text)
  from service_role;
revoke all on function public.merge_owned_session_safety_state(uuid, uuid, text, text)
  from service_role;
revoke all on function public.persist_feedback(uuid, uuid, integer, integer, boolean, boolean, jsonb)
  from service_role;

grant execute on function public.persist_context_intake_result_with_events(uuid, uuid, jsonb, text, text, jsonb)
  to service_role;
grant execute on function public.complete_chat_turn_with_events(uuid, uuid, uuid, text, jsonb, jsonb, text, text, text, timestamptz, timestamptz, jsonb)
  to service_role;
grant execute on function public.persist_clarity_map_result_with_events(uuid, uuid, jsonb, text, text, text, text, text, text, jsonb)
  to service_role;
grant execute on function public.merge_owned_session_safety_state_with_events(uuid, uuid, text, text, jsonb)
  to service_role;
grant execute on function public.persist_feedback_with_audit(uuid, uuid, integer, integer, boolean, boolean, jsonb, jsonb)
  to service_role;
grant execute on function public.record_authorized_audit_event(uuid, uuid, jsonb)
  to service_role;
