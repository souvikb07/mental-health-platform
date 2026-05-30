-- MindBridge Sprint 1 persisted Clarity Maps and feedback.
-- Keep retained map and comment content encrypted while making map replay
-- claims atomic and feedback writes owner-scoped.

alter table public.clarity_maps
  add column transcript_fingerprint text
    check (
      transcript_fingerprint is null
      or transcript_fingerprint ~ '^[0-9a-f]{64}$'
    ),
  add constraint clarity_maps_id_session_unique unique (id, session_id);

create unique index idx_clarity_maps_session_transcript_fingerprint
  on public.clarity_maps(session_id, transcript_fingerprint)
  where transcript_fingerprint is not null;

create index idx_feedback_session_created
  on public.feedback(session_id, created_at desc);

create table public.clarity_map_claims (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  transcript_fingerprint text not null
    check (transcript_fingerprint ~ '^[0-9a-f]{64}$'),
  status text not null
    check (status in ('processing', 'completed')),
  lease_token_hash text
    check (
      lease_token_hash is null
      or lease_token_hash ~ '^[0-9a-f]{64}$'
    ),
  lease_expires_at timestamptz,
  clarity_map_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint clarity_map_claims_session_transcript_unique
    unique (session_id, transcript_fingerprint),
  constraint clarity_map_claims_session_map_fk
    foreign key (clarity_map_id, session_id)
    references public.clarity_maps(id, session_id)
    on delete cascade,
  constraint clarity_map_claims_status_shape_check
    check (
      (
        status = 'processing'
        and lease_token_hash is not null
        and lease_expires_at is not null
        and clarity_map_id is null
        and completed_at is null
      )
      or (
        status = 'completed'
        and lease_token_hash is null
        and lease_expires_at is null
        and clarity_map_id is not null
        and completed_at is not null
      )
    )
);

create index idx_clarity_map_claims_session_created
  on public.clarity_map_claims(session_id, created_at desc);
create index idx_clarity_map_claims_processing_expiry
  on public.clarity_map_claims(lease_expires_at)
  where status = 'processing';

alter table public.clarity_map_claims enable row level security;

revoke all on table public.clarity_map_claims from public, anon, authenticated;
grant select, insert, update, delete on table public.clarity_map_claims
  to service_role;

create or replace function public.claim_clarity_map_generation(
  p_owner_id uuid,
  p_session_id uuid,
  p_transcript_fingerprint text,
  p_lease_token_hash text
)
returns table(
  claim_status text,
  map_encrypted jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_time timestamptz := now();
  owned_session public.sessions%rowtype;
  claimed_map public.clarity_map_claims%rowtype;
  retained_map public.clarity_maps%rowtype;
  inserted_count integer;
begin
  if p_transcript_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid transcript fingerprint.';
  end if;

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

  if not owned_session.storage_consent_accepted then
    raise exception 'Clarity Map replay claims require storage consent.';
  end if;

  insert into public.clarity_map_claims (
    session_id,
    transcript_fingerprint,
    status,
    lease_token_hash,
    lease_expires_at
  )
  values (
    p_session_id,
    p_transcript_fingerprint,
    'processing',
    p_lease_token_hash,
    current_time + interval '5 minutes'
  )
  on conflict (session_id, transcript_fingerprint) do nothing;
  get diagnostics inserted_count = row_count;

  select *
    into claimed_map
    from public.clarity_map_claims
    where session_id = p_session_id
      and transcript_fingerprint = p_transcript_fingerprint
    for update;

  if inserted_count = 1 then
    return query select 'claimed'::text, null::jsonb;
    return;
  end if;

  if claimed_map.status = 'completed' then
    select *
      into retained_map
      from public.clarity_maps
      where id = claimed_map.clarity_map_id
        and session_id = p_session_id
        and transcript_fingerprint = p_transcript_fingerprint;

    if not found or retained_map.map_encrypted is null then
      raise exception 'Completed Clarity Map claim is inconsistent.';
    end if;

    return query select 'completed'::text, retained_map.map_encrypted;
    return;
  end if;

  if claimed_map.lease_expires_at <= current_time then
    update public.clarity_map_claims
      set lease_token_hash = p_lease_token_hash,
          lease_expires_at = current_time + interval '5 minutes'
      where id = claimed_map.id;

    return query select 'claimed'::text, null::jsonb;
    return;
  end if;

  return query select 'in_progress'::text, null::jsonb;
end;
$$;

create or replace function public.persist_clarity_map_result(
  p_owner_id uuid,
  p_session_id uuid,
  p_map_encrypted jsonb,
  p_source text,
  p_schema_version text,
  p_transcript_fingerprint text,
  p_lease_token_hash text,
  p_risk_level text,
  p_safety_state text
)
returns table(map_encrypted jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_session public.sessions%rowtype;
  claimed_map public.clarity_map_claims%rowtype;
  retained_map public.clarity_maps%rowtype;
begin
  if not public.is_valid_encrypted_envelope(p_map_encrypted) then
    raise exception 'Encrypted Clarity Map is required.';
  end if;

  if p_source !~ '^[a-z0-9][a-z0-9_.:-]{0,119}$' then
    raise exception 'Invalid Clarity Map source.';
  end if;

  if p_schema_version !~ '^[a-z0-9][a-z0-9_.:-]{0,119}$' then
    raise exception 'Invalid Clarity Map schema version.';
  end if;

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

  if not owned_session.storage_consent_accepted then
    raise exception 'Clarity Map retention requires storage consent.';
  end if;

  if p_transcript_fingerprint is null then
    if p_lease_token_hash is not null then
      raise exception 'Unclaimed Clarity Map writes cannot include a lease.';
    end if;

    insert into public.clarity_maps (
      session_id,
      map_json,
      map_encrypted,
      source,
      schema_version,
      transcript_fingerprint
    )
    values (
      p_session_id,
      null,
      p_map_encrypted,
      p_source,
      p_schema_version,
      null
    )
    returning * into retained_map;
  else
    if p_transcript_fingerprint !~ '^[0-9a-f]{64}$'
      or p_lease_token_hash !~ '^[0-9a-f]{64}$'
    then
      raise exception 'Claimed Clarity Map writes require valid hashes.';
    end if;

    select *
      into claimed_map
      from public.clarity_map_claims
      where session_id = p_session_id
        and transcript_fingerprint = p_transcript_fingerprint
        and status = 'processing'
        and lease_token_hash = p_lease_token_hash
      for update;

    if not found then
      raise exception 'Clarity Map claim not found.';
    end if;

    insert into public.clarity_maps (
      session_id,
      map_json,
      map_encrypted,
      source,
      schema_version,
      transcript_fingerprint
    )
    values (
      p_session_id,
      null,
      p_map_encrypted,
      p_source,
      p_schema_version,
      p_transcript_fingerprint
    )
    returning * into retained_map;

    update public.clarity_map_claims
      set status = 'completed',
          lease_token_hash = null,
          lease_expires_at = null,
          clarity_map_id = retained_map.id,
          completed_at = now()
      where id = claimed_map.id;
  end if;

  update public.sessions
    set current_safety_state = public.merge_sprint1_safety_state(
          current_safety_state,
          p_safety_state
        ),
        current_risk_level = coalesce(p_risk_level, current_risk_level),
        updated_at = now()
    where id = p_session_id;

  return query select retained_map.map_encrypted;
end;
$$;

create or replace function public.merge_owned_session_safety_state(
  p_owner_id uuid,
  p_session_id uuid,
  p_risk_level text,
  p_safety_state text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_risk_level is not null
    and p_risk_level not in ('none', 'low', 'medium', 'high', 'imminent')
  then
    raise exception 'Invalid risk level.';
  end if;

  update public.sessions
    set current_safety_state = public.merge_sprint1_safety_state(
          current_safety_state,
          p_safety_state
        ),
        current_risk_level = coalesce(p_risk_level, current_risk_level),
        updated_at = now()
    where id = p_session_id
      and owner_id = p_owner_id
      and expires_at > now();

  if not found then
    raise exception 'Owned session not found.';
  end if;
end;
$$;

create or replace function public.persist_feedback(
  p_owner_id uuid,
  p_session_id uuid,
  p_clarity_rating integer,
  p_helpfulness_rating integer,
  p_felt_safe boolean,
  p_unsafe_or_unhelpful boolean,
  p_comment_encrypted jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_session public.sessions%rowtype;
begin
  if p_clarity_rating is null
    or p_clarity_rating not between 1 and 5
    or p_helpfulness_rating is null
    or p_helpfulness_rating not between 1 and 5
  then
    raise exception 'Feedback ratings must be between 1 and 5.';
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

  if p_comment_encrypted is not null
    and (
      not owned_session.storage_consent_accepted
      or not public.is_valid_encrypted_envelope(p_comment_encrypted)
    )
  then
    raise exception 'Encrypted feedback comments require storage consent.';
  end if;

  insert into public.feedback (
    session_id,
    clarity_rating,
    helpfulness_rating,
    felt_safe,
    unsafe_or_unhelpful,
    comment,
    comment_encrypted
  )
  values (
    p_session_id,
    p_clarity_rating,
    p_helpfulness_rating,
    p_felt_safe,
    coalesce(p_unsafe_or_unhelpful, false),
    null,
    p_comment_encrypted
  );
end;
$$;

revoke all on function public.claim_clarity_map_generation(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.persist_clarity_map_result(uuid, uuid, jsonb, text, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.merge_owned_session_safety_state(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.persist_feedback(uuid, uuid, integer, integer, boolean, boolean, jsonb)
  from public, anon, authenticated;

grant execute on function public.claim_clarity_map_generation(uuid, uuid, text, text)
  to service_role;
grant execute on function public.persist_clarity_map_result(uuid, uuid, jsonb, text, text, text, text, text, text)
  to service_role;
grant execute on function public.merge_owned_session_safety_state(uuid, uuid, text, text)
  to service_role;
grant execute on function public.persist_feedback(uuid, uuid, integer, integer, boolean, boolean, jsonb)
  to service_role;
