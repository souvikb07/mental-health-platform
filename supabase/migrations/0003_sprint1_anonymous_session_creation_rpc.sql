-- MindBridge Sprint 1 server-owned anonymous session creation.
-- Keep owner creation, session creation, and initial consent events atomic.

create or replace function public.create_anonymous_session(
  p_token_hash text,
  p_country_code text,
  p_main_concern_category text,
  p_storage_consent_accepted boolean,
  p_onboarding_note_encrypted jsonb
)
returns table(
  owner_id uuid,
  session_id uuid,
  storage_consent_accepted boolean,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  created_owner_id uuid;
  created_session public.sessions%rowtype;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid anonymous owner token hash.';
  end if;

  if p_country_code is null
    or p_country_code not in ('US', 'IN', 'GLOBAL')
  then
    raise exception 'Invalid country code.';
  end if;

  if p_main_concern_category is null
    or p_main_concern_category not in (
      'overwhelmed',
      'anxious_worried',
      'low_numb_disconnected',
      'work_study_stress',
      'relationship_family',
      'sleep_energy',
      'not_sure'
    )
  then
    raise exception 'Invalid main concern category.';
  end if;

  if p_storage_consent_accepted is null then
    raise exception 'Storage consent choice is required.';
  end if;

  if p_onboarding_note_encrypted is not null
    and (
      not p_storage_consent_accepted
      or not public.is_valid_encrypted_envelope(p_onboarding_note_encrypted)
    )
  then
    raise exception 'Encrypted onboarding context requires storage consent.';
  end if;

  insert into public.anonymous_owners (token_hash)
  values (p_token_hash)
  on conflict (token_hash) do update
    set token_hash = excluded.token_hash
  returning id into created_owner_id;

  insert into public.sessions (
    anonymous_id,
    owner_id,
    country,
    age_band,
    main_reason,
    country_code,
    main_concern_category,
    storage_consent_accepted,
    storage_policy_version,
    onboarding_note_encrypted,
    consented_at
  )
  values (
    created_owner_id::text,
    created_owner_id,
    null,
    null,
    null,
    p_country_code,
    p_main_concern_category,
    p_storage_consent_accepted,
    'sensitive_storage.v1',
    p_onboarding_note_encrypted,
    now()
  )
  returning * into created_session;

  insert into public.consent_events (
    owner_id,
    session_id,
    consent_type,
    policy_version,
    accepted
  )
  values
    (
      created_owner_id,
      created_session.id,
      'product_boundary',
      'product_boundary.v1',
      true
    ),
    (
      created_owner_id,
      created_session.id,
      'sensitive_storage',
      'sensitive_storage.v1',
      p_storage_consent_accepted
    );

  return query
    select
      created_owner_id,
      created_session.id,
      created_session.storage_consent_accepted,
      created_session.created_at,
      created_session.expires_at;
end;
$$;

revoke all on function public.create_anonymous_session(text, text, text, boolean, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_anonymous_session(text, text, text, boolean, jsonb)
  to service_role;
