-- MindBridge Sprint 1 production data foundation
-- Keep 0001 immutable. Preserve ownerless legacy rows while enforcing strict
-- encrypted-only sensitive writes for new owner-linked anonymous sessions.

create or replace function public.is_valid_encrypted_envelope(payload jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select
    payload is not null
    and jsonb_typeof(payload) = 'object'
    and payload ?& array['kid', 'algorithm', 'iv', 'authTag', 'ciphertext']
    and payload->>'kid' = 'v1'
    and payload->>'algorithm' = 'aes-256-gcm'
    and coalesce(payload->>'iv', '') ~ '^[A-Za-z0-9+/]+={0,2}$'
    and coalesce(payload->>'authTag', '') ~ '^[A-Za-z0-9+/]+={0,2}$'
    and coalesce(payload->>'ciphertext', '') ~ '^[A-Za-z0-9+/]+={0,2}$';
$$;

create table public.anonymous_owners (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique
    check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.sessions
  add column owner_id uuid references public.anonymous_owners(id) on delete cascade,
  add column country_code text
    check (country_code in ('US', 'IN', 'GLOBAL')),
  add column main_concern_category text
    check (
      main_concern_category in (
        'overwhelmed',
        'anxious_worried',
        'low_numb_disconnected',
        'work_study_stress',
        'relationship_family',
        'sleep_energy',
        'not_sure'
      )
    ),
  add column storage_consent_accepted boolean not null default false,
  add column storage_policy_version text,
  add column current_safety_state text
    check (
      current_safety_state in (
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
      )
    ),
  add column onboarding_note_encrypted jsonb,
  add column expires_at timestamptz,
  add constraint sessions_owner_legacy_locator_check
    check (owner_id is null or anonymous_id = owner_id::text),
  add constraint sessions_owner_raw_free_check
    check (
      owner_id is null
      or (country is null and age_band is null and main_reason is null)
    ),
  add constraint sessions_owner_storage_policy_check
    check (
      owner_id is null
      or storage_policy_version = 'sensitive_storage.v1'
    ),
  add constraint sessions_owner_expiry_check
    check (owner_id is null or expires_at = created_at + interval '30 days'),
  add constraint sessions_onboarding_note_encrypted_check
    check (
      onboarding_note_encrypted is null
      or (
        storage_consent_accepted
        and public.is_valid_encrypted_envelope(onboarding_note_encrypted)
      )
    ),
  add constraint sessions_id_owner_unique unique (id, owner_id);

create or replace function public.set_sprint1_session_retention()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.owner_id is null
    and new.owner_id is not null
  then
    raise exception 'Legacy sessions cannot be converted to owner-linked sessions.';
  end if;

  if tg_op = 'UPDATE' and old.owner_id is not null then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Owner-linked sessions cannot be detached or reassigned.';
    end if;

    if new.created_at is distinct from old.created_at then
      raise exception 'Owner-linked session creation time is immutable.';
    end if;

    if old.storage_consent_accepted
      and not new.storage_consent_accepted
      and (
        new.onboarding_note_encrypted is not null
        or exists (
          select 1 from public.messages
            where session_id = new.id
              and content_encrypted is not null
        )
        or exists (
          select 1 from public.clarity_maps
            where session_id = new.id
              and map_encrypted is not null
        )
        or exists (
          select 1 from public.feedback
            where session_id = new.id
              and comment_encrypted is not null
        )
      )
    then
      raise exception 'Delete retained sensitive content before withdrawing storage consent.';
    end if;
  end if;

  if new.owner_id is not null then
    new.expires_at := new.created_at + interval '30 days';
  end if;

  return new;
end;
$$;

create trigger set_sprint1_session_retention
  before insert or update of owner_id, created_at, expires_at
  on public.sessions
  for each row
  execute function public.set_sprint1_session_retention();

alter table public.messages
  alter column content drop not null,
  add column content_encrypted jsonb,
  add column source text
    check (source is null or source ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  add column client_message_id text
    check (
      client_message_id is null
      or length(client_message_id) between 1 and 120
    ),
  add column reply_to_client_message_id text
    check (
      reply_to_client_message_id is null
      or length(reply_to_client_message_id) between 1 and 120
    ),
  add constraint messages_content_encrypted_check
    check (
      content_encrypted is null
      or public.is_valid_encrypted_envelope(content_encrypted)
    );

alter table public.clarity_maps
  alter column map_json drop not null,
  add column map_encrypted jsonb,
  add column source text
    check (source is null or source ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  add column schema_version text
    check (
      schema_version is null
      or schema_version ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
    ),
  add constraint clarity_maps_map_encrypted_check
    check (
      map_encrypted is null
      or public.is_valid_encrypted_envelope(map_encrypted)
    );

alter table public.feedback
  add column comment_encrypted jsonb,
  add constraint feedback_comment_encrypted_check
    check (
      comment_encrypted is null
      or public.is_valid_encrypted_envelope(comment_encrypted)
    );

alter table public.safety_events
  add column safety_state text
    check (
      safety_state in (
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
      )
    ),
  add column policy_action text
    check (policy_action in ('allow', 'answer_with_boundary', 'route_to_safety')),
  add column policy_categories text[] not null default '{}'
    check (
      policy_categories <@ array[
        'diagnosis_request',
        'medication_request',
        'treatment_protocol_request',
        'medical_advice_request',
        'therapy_replacement_request',
        'self_harm_method_request',
        'prompt_injection',
        'dependency_request',
        'out_of_scope'
      ]::text[]
    ),
  add column signal_tags text[] not null default '{}'
    check (
      signal_tags <@ array[
        'third_party_self_harm',
        'third_party_self_harm_imminent'
      ]::text[]
    ),
  add column requires_crisis_response boolean not null default false,
  add column ai_triage_available boolean,
  add column ai_triage_used boolean,
  add column ai_triage_escalated boolean,
  add column ai_triage_confidence text
    check (ai_triage_confidence in ('low', 'medium', 'high')),
  add column ai_triage_rationale_code text
    check (
      ai_triage_rationale_code is null
      or ai_triage_rationale_code ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
    );

create or replace function public.enforce_sprint1_sensitive_write()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  session_owner_id uuid;
  session_storage_consent_accepted boolean;
  session_expires_at timestamptz;
begin
  select owner_id, storage_consent_accepted, expires_at
    into session_owner_id, session_storage_consent_accepted, session_expires_at
    from public.sessions
    where id = new.session_id;

  if session_owner_id is null then
    return new;
  end if;

  if session_expires_at <= now() then
    raise exception 'Expired owner-linked sessions cannot accept writes.';
  end if;

  if tg_table_name = 'messages' then
    if not session_storage_consent_accepted then
      raise exception 'Owner-linked messages require storage consent.';
    end if;

    if new.content is not null
      or not public.is_valid_encrypted_envelope(new.content_encrypted)
      or new.metadata <> '{}'::jsonb
    then
      raise exception 'Owner-linked messages require encrypted-only content and raw-free metadata.';
    end if;
  elsif tg_table_name = 'clarity_maps' then
    if not session_storage_consent_accepted then
      raise exception 'Owner-linked clarity maps require storage consent.';
    end if;

    if new.map_json is not null
      or not public.is_valid_encrypted_envelope(new.map_encrypted)
    then
      raise exception 'Owner-linked clarity maps require encrypted-only content.';
    end if;
  elsif tg_table_name = 'feedback' then
    if new.comment is not null then
      raise exception 'Owner-linked feedback comments must not use plaintext storage.';
    end if;

    if new.comment_encrypted is not null
      and (
        not session_storage_consent_accepted
        or not public.is_valid_encrypted_envelope(new.comment_encrypted)
      )
    then
      raise exception 'Encrypted feedback comments require storage consent.';
    end if;
  elsif tg_table_name = 'safety_events' and new.metadata <> '{}'::jsonb then
    raise exception 'Owner-linked safety events require raw-free structured metadata.';
  end if;

  return new;
end;
$$;

create trigger enforce_sprint1_message_write
  before insert or update on public.messages
  for each row
  execute function public.enforce_sprint1_sensitive_write();

create trigger enforce_sprint1_clarity_map_write
  before insert or update on public.clarity_maps
  for each row
  execute function public.enforce_sprint1_sensitive_write();

create trigger enforce_sprint1_feedback_write
  before insert or update on public.feedback
  for each row
  execute function public.enforce_sprint1_sensitive_write();

create trigger enforce_sprint1_safety_event_write
  before insert or update on public.safety_events
  for each row
  execute function public.enforce_sprint1_sensitive_write();

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.anonymous_owners(id) on delete cascade,
  session_id uuid not null,
  consent_type text not null
    check (consent_type in ('product_boundary', 'sensitive_storage')),
  policy_version text not null
    check (policy_version ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  accepted boolean not null,
  created_at timestamptz not null default now(),
  constraint consent_events_storage_policy_check
    check (
      consent_type <> 'sensitive_storage'
      or policy_version = 'sensitive_storage.v1'
    ),
  constraint consent_events_session_owner_fk
    foreign key (session_id, owner_id)
    references public.sessions(id, owner_id)
    on delete cascade
);

create table public.model_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.anonymous_owners(id) on delete cascade,
  session_id uuid,
  task_code text not null
    check (task_code ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  source_code text not null
    check (source_code ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  model_identifier text
    check (
      model_identifier is null
      or model_identifier ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$'
    ),
  fallback_reason_code text
    check (
      fallback_reason_code is null
      or fallback_reason_code ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
    ),
  post_validation_outcome_code text
    check (
      post_validation_outcome_code is null
      or post_validation_outcome_code ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
    ),
  store_disabled boolean not null default true
    check (store_disabled),
  created_at timestamptz not null default now(),
  constraint model_events_session_owner_fk
    foreign key (session_id, owner_id)
    references public.sessions(id, owner_id)
    on delete cascade
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.anonymous_owners(id) on delete cascade,
  session_id uuid,
  event_type text not null
    check (event_type ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  route_key text
    check (route_key is null or route_key ~ '^[a-z0-9][a-z0-9_.:/-]{0,159}$'),
  outcome_code text
    check (
      outcome_code is null
      or outcome_code ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'
    ),
  error_code text
    check (
      error_code is null
      or error_code ~ '^[A-Z0-9][A-Z0-9_:-]{0,119}$'
    ),
  created_at timestamptz not null default now(),
  constraint audit_events_session_owner_fk
    foreign key (session_id, owner_id)
    references public.sessions(id, owner_id)
    on delete cascade
);

create table public.rate_limit_buckets (
  route_key text not null
    check (route_key ~ '^[a-z0-9][a-z0-9_.:-]{0,119}$'),
  subject_kind text not null
    check (subject_kind in ('owner_hmac', 'ip_hmac')),
  bucket_key text not null
    check (bucket_key ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  expires_at timestamptz not null,
  request_count integer not null default 1
    check (request_count >= 1),
  primary key (route_key, bucket_key, window_started_at),
  constraint rate_limit_window_check
    check (
      expires_at > window_started_at
      and expires_at <= window_started_at + interval '24 hours'
    )
);

create index idx_sessions_owner_created
  on public.sessions(owner_id, created_at desc);
create index idx_sessions_owner_expiry
  on public.sessions(expires_at)
  where owner_id is not null;
create unique index idx_messages_session_client_message
  on public.messages(session_id, client_message_id)
  where client_message_id is not null;
create unique index idx_messages_session_reply_to_client_message
  on public.messages(session_id, reply_to_client_message_id)
  where reply_to_client_message_id is not null;
create index idx_clarity_maps_session_created
  on public.clarity_maps(session_id, created_at desc);
create index idx_consent_events_owner_created
  on public.consent_events(owner_id, created_at desc);
create index idx_model_events_owner_created
  on public.model_events(owner_id, created_at desc);
create index idx_model_events_session_created
  on public.model_events(session_id, created_at desc);
create index idx_audit_events_owner_created
  on public.audit_events(owner_id, created_at desc);
create index idx_audit_events_session_created
  on public.audit_events(session_id, created_at desc);
create index idx_rate_limit_buckets_expires
  on public.rate_limit_buckets(expires_at);

alter table public.anonymous_owners enable row level security;
alter table public.consent_events enable row level security;
alter table public.model_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.rate_limit_buckets enable row level security;

drop policy if exists "Public can read resources" on public.resources;

revoke all on table
  public.sessions,
  public.messages,
  public.clarity_maps,
  public.safety_events,
  public.resources,
  public.feedback,
  public.anonymous_owners,
  public.consent_events,
  public.model_events,
  public.audit_events,
  public.rate_limit_buckets
from public, anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update, delete on table
  public.sessions,
  public.messages,
  public.clarity_maps,
  public.safety_events,
  public.feedback,
  public.anonymous_owners,
  public.consent_events,
  public.model_events,
  public.audit_events,
  public.rate_limit_buckets
to service_role;

create or replace function public.consume_rate_limit(
  p_route_key text,
  p_subject_kind text,
  p_bucket_key text,
  p_window_seconds integer,
  p_limit integer
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_time timestamptz := now();
  window_start timestamptz;
  window_expiry timestamptz;
  updated_count integer;
begin
  if p_route_key !~ '^[a-z0-9][a-z0-9_.:-]{0,119}$' then
    raise exception 'Invalid route key.';
  end if;

  if p_subject_kind not in ('owner_hmac', 'ip_hmac') then
    raise exception 'Invalid rate-limit subject kind.';
  end if;

  if p_bucket_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid rate-limit bucket key.';
  end if;

  if p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Rate-limit window must be between 1 and 86400 seconds.';
  end if;

  if p_limit < 1 then
    raise exception 'Rate-limit limit must be positive.';
  end if;

  window_start := to_timestamp(
    floor(extract(epoch from current_time) / p_window_seconds)
    * p_window_seconds
  );
  window_expiry := window_start + make_interval(secs => p_window_seconds);

  insert into public.rate_limit_buckets (
    route_key,
    subject_kind,
    bucket_key,
    window_started_at,
    expires_at,
    request_count
  )
  values (
    p_route_key,
    p_subject_kind,
    p_bucket_key,
    window_start,
    window_expiry,
    1
  )
  on conflict (route_key, bucket_key, window_started_at) do update
  set request_count = public.rate_limit_buckets.request_count + 1
  where public.rate_limit_buckets.subject_kind = excluded.subject_kind
  returning request_count into updated_count;

  if updated_count is null then
    raise exception 'Rate-limit bucket subject kind mismatch.';
  end if;

  return query
    select
      updated_count <= p_limit,
      greatest(
        1,
        ceil(extract(epoch from (window_expiry - current_time)))::integer
      );
end;
$$;

create or replace function public.purge_expired_anonymous_data()
returns table(
  deleted_sessions integer,
  deleted_owners integer,
  deleted_rate_limit_buckets integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.sessions
    where owner_id is not null
      and expires_at <= now();
  get diagnostics deleted_sessions = row_count;

  delete from public.anonymous_owners owner
    where not exists (
      select 1
        from public.sessions session
        where session.owner_id = owner.id
    );
  get diagnostics deleted_owners = row_count;

  delete from public.rate_limit_buckets
    where expires_at <= now();
  get diagnostics deleted_rate_limit_buckets = row_count;

  return next;
end;
$$;

revoke all on function public.is_valid_encrypted_envelope(jsonb) from public, anon, authenticated;
revoke all on function public.set_sprint1_session_retention() from public, anon, authenticated;
revoke all on function public.enforce_sprint1_sensitive_write() from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, text, text, integer, integer) from public, anon, authenticated;
revoke all on function public.purge_expired_anonymous_data() from public, anon, authenticated;

grant execute on function public.is_valid_encrypted_envelope(jsonb) to service_role;
grant execute on function public.consume_rate_limit(text, text, text, integer, integer) to service_role;
grant execute on function public.purge_expired_anonymous_data() to service_role;
