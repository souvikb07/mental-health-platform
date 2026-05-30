-- MindBridge Sprint 1 persisted context-intake and chat turns.
-- Keep journey text encrypted and make chat retry claims atomic.

create table public.chat_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  client_message_id uuid not null,
  status text not null
    check (status in ('processing', 'completed')),
  lease_token_hash text
    check (
      lease_token_hash is null
      or lease_token_hash ~ '^[0-9a-f]{64}$'
    ),
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint chat_turns_session_client_message_unique
    unique (session_id, client_message_id),
  constraint chat_turns_status_shape_check
    check (
      (
        status = 'processing'
        and lease_token_hash is not null
        and lease_expires_at is not null
        and completed_at is null
      )
      or (
        status = 'completed'
        and lease_token_hash is null
        and lease_expires_at is null
        and completed_at is not null
      )
    )
);

create index idx_chat_turns_session_created
  on public.chat_turns(session_id, created_at desc);

create unique index idx_messages_session_context_intake_result
  on public.messages(session_id)
  where source = 'context_intake_result';

alter table public.chat_turns enable row level security;

revoke all on table public.chat_turns from public, anon, authenticated;
grant select, insert, update, delete on table public.chat_turns to service_role;

create or replace function public.merge_sprint1_safety_state(
  existing_state text,
  candidate_state text
)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  preserving_states constant text[] := array[
    'passive_suicidal_ideation',
    'active_suicidal_ideation',
    'third_party_self_harm',
    'imminent_risk',
    'self_harm_method_request',
    'medical_emergency',
    'harm_to_others',
    'abuse_or_coercion'
  ];
  existing_severity integer;
  candidate_severity integer;
begin
  if candidate_state is null then
    return existing_state;
  end if;

  if candidate_state not in (
    'normal_support',
    'elevated_distress',
    'passive_suicidal_ideation',
    'active_suicidal_ideation',
    'third_party_self_harm',
    'imminent_risk',
    'self_harm_method_request',
    'medical_emergency',
    'harm_to_others',
    'abuse_or_coercion',
    'policy_boundary'
  ) then
    raise exception 'Invalid safety state.';
  end if;

  if existing_state is null or not (existing_state = any(preserving_states)) then
    return candidate_state;
  end if;

  existing_severity := case existing_state
    when 'normal_support' then 0
    when 'elevated_distress' then 1
    when 'policy_boundary' then 2
    when 'passive_suicidal_ideation' then 3
    when 'active_suicidal_ideation' then 4
    when 'third_party_self_harm' then 4
    when 'abuse_or_coercion' then 4
    when 'medical_emergency' then 5
    when 'harm_to_others' then 5
    when 'self_harm_method_request' then 5
    when 'imminent_risk' then 5
  end;
  candidate_severity := case candidate_state
    when 'normal_support' then 0
    when 'elevated_distress' then 1
    when 'policy_boundary' then 2
    when 'passive_suicidal_ideation' then 3
    when 'active_suicidal_ideation' then 4
    when 'third_party_self_harm' then 4
    when 'abuse_or_coercion' then 4
    when 'medical_emergency' then 5
    when 'harm_to_others' then 5
    when 'self_harm_method_request' then 5
    when 'imminent_risk' then 5
  end;

  if candidate_severity < existing_severity then
    return existing_state;
  end if;

  return candidate_state;
end;
$$;

create or replace function public.claim_chat_turn(
  p_owner_id uuid,
  p_session_id uuid,
  p_client_message_id uuid,
  p_lease_token_hash text
)
returns table(
  claim_status text,
  storage_consent_accepted boolean,
  current_safety_state text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_time timestamptz := now();
  owned_session public.sessions%rowtype;
  claimed_turn public.chat_turns%rowtype;
  inserted_count integer;
begin
  if p_lease_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid lease token hash.';
  end if;

  select *
    into owned_session
    from public.sessions
    where id = p_session_id
      and owner_id = p_owner_id
      and expires_at > current_time
    for update;

  if not found then
    raise exception 'Owned session not found.';
  end if;

  insert into public.chat_turns (
    session_id,
    client_message_id,
    status,
    lease_token_hash,
    lease_expires_at
  )
  values (
    p_session_id,
    p_client_message_id,
    'processing',
    p_lease_token_hash,
    current_time + interval '5 minutes'
  )
  on conflict (session_id, client_message_id) do nothing;
  get diagnostics inserted_count = row_count;

  select *
    into claimed_turn
    from public.chat_turns
    where session_id = p_session_id
      and client_message_id = p_client_message_id
    for update;

  if inserted_count = 1 then
    return query
      select
        'claimed'::text,
        owned_session.storage_consent_accepted,
        owned_session.current_safety_state;
    return;
  end if;

  if claimed_turn.status = 'completed' then
    return query
      select
        'completed'::text,
        owned_session.storage_consent_accepted,
        owned_session.current_safety_state;
    return;
  end if;

  if claimed_turn.lease_expires_at <= current_time then
    update public.chat_turns
      set lease_token_hash = p_lease_token_hash,
          lease_expires_at = current_time + interval '5 minutes'
      where id = claimed_turn.id;

    return query
      select
        'claimed'::text,
        owned_session.storage_consent_accepted,
        owned_session.current_safety_state;
    return;
  end if;

  return query
    select
      'in_progress'::text,
      owned_session.storage_consent_accepted,
      owned_session.current_safety_state;
end;
$$;

create or replace function public.complete_chat_turn(
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
  p_assistant_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_session public.sessions%rowtype;
  claimed_turn public.chat_turns%rowtype;
begin
  if p_lease_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid lease token hash.';
  end if;

  if p_assistant_source !~ '^[a-z0-9][a-z0-9_.:-]{0,119}$' then
    raise exception 'Invalid assistant source.';
  end if;

  if p_risk_level not in ('none', 'low', 'medium', 'high', 'imminent') then
    raise exception 'Invalid risk level.';
  end if;

  select *
    into owned_session
    from public.sessions
    where id = p_session_id
      and owner_id = p_owner_id
      and expires_at > now()
    for update;

  if not found then
    raise exception 'Owned session not found.';
  end if;

  select *
    into claimed_turn
    from public.chat_turns
    where session_id = p_session_id
      and client_message_id = p_client_message_id
      and status = 'processing'
      and lease_token_hash = p_lease_token_hash
    for update;

  if not found then
    raise exception 'Chat turn claim not found.';
  end if;

  if owned_session.storage_consent_accepted then
    if not public.is_valid_encrypted_envelope(p_user_content_encrypted)
      or not public.is_valid_encrypted_envelope(p_assistant_content_encrypted)
    then
      raise exception 'Encrypted chat messages are required.';
    end if;

    insert into public.messages (
      session_id,
      role,
      content,
      content_encrypted,
      source,
      client_message_id,
      metadata,
      created_at
    )
    values (
      p_session_id,
      'user',
      null,
      p_user_content_encrypted,
      'chat_user',
      p_client_message_id::text,
      '{}'::jsonb,
      p_user_created_at
    );

    insert into public.messages (
      session_id,
      role,
      content,
      content_encrypted,
      source,
      reply_to_client_message_id,
      risk_level,
      metadata,
      created_at
    )
    values (
      p_session_id,
      'assistant',
      null,
      p_assistant_content_encrypted,
      p_assistant_source,
      p_client_message_id::text,
      p_risk_level,
      '{}'::jsonb,
      p_assistant_created_at
    );
  elsif p_user_content_encrypted is not null
    or p_assistant_content_encrypted is not null
  then
    raise exception 'Opted-out sessions cannot retain chat content.';
  end if;

  update public.sessions
    set current_safety_state = public.merge_sprint1_safety_state(
          current_safety_state,
          p_safety_state
        ),
        current_risk_level = p_risk_level,
        updated_at = now()
    where id = p_session_id;

  update public.chat_turns
    set status = 'completed',
        lease_token_hash = null,
        lease_expires_at = null,
        completed_at = now()
    where id = claimed_turn.id;
end;
$$;

create or replace function public.persist_context_intake_result(
  p_owner_id uuid,
  p_session_id uuid,
  p_response_encrypted jsonb,
  p_risk_level text,
  p_safety_state text
)
returns table(content_encrypted jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_session public.sessions%rowtype;
begin
  if p_risk_level is not null
    and p_risk_level not in ('none', 'low', 'medium', 'high', 'imminent')
  then
    raise exception 'Invalid risk level.';
  end if;

  select *
    into owned_session
    from public.sessions
    where id = p_session_id
      and owner_id = p_owner_id
      and expires_at > now()
    for update;

  if not found then
    raise exception 'Owned session not found.';
  end if;

  if owned_session.storage_consent_accepted then
    if not public.is_valid_encrypted_envelope(p_response_encrypted) then
      raise exception 'Encrypted context-intake response is required.';
    end if;

    insert into public.messages (
      session_id,
      role,
      content,
      content_encrypted,
      source,
      risk_level,
      metadata
    )
    values (
      p_session_id,
      'assistant',
      null,
      p_response_encrypted,
      'context_intake_result',
      p_risk_level,
      '{}'::jsonb
    )
    on conflict (session_id) where source = 'context_intake_result'
      do nothing;
  elsif p_response_encrypted is not null then
    raise exception 'Opted-out sessions cannot retain context-intake content.';
  end if;

  update public.sessions
    set current_safety_state = public.merge_sprint1_safety_state(
          current_safety_state,
          p_safety_state
        ),
        current_risk_level = coalesce(p_risk_level, current_risk_level),
        updated_at = now()
    where id = p_session_id;

  return query
    select message.content_encrypted
      from public.messages message
      where message.session_id = p_session_id
        and message.source = 'context_intake_result'
      limit 1;
end;
$$;

revoke all on function public.merge_sprint1_safety_state(text, text)
  from public, anon, authenticated;
revoke all on function public.claim_chat_turn(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.complete_chat_turn(uuid, uuid, uuid, text, jsonb, jsonb, text, text, text, timestamptz, timestamptz)
  from public, anon, authenticated;
revoke all on function public.persist_context_intake_result(uuid, uuid, jsonb, text, text)
  from public, anon, authenticated;

grant execute on function public.merge_sprint1_safety_state(text, text)
  to service_role;
grant execute on function public.claim_chat_turn(uuid, uuid, uuid, text)
  to service_role;
grant execute on function public.complete_chat_turn(uuid, uuid, uuid, text, jsonb, jsonb, text, text, text, timestamptz, timestamptz)
  to service_role;
grant execute on function public.persist_context_intake_result(uuid, uuid, jsonb, text, text)
  to service_role;
