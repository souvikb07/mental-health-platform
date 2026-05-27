# Data Model

## Phase 1 database tables

### sessions

Stores anonymous session context.

```txt
id uuid primary key
anonymous_id text
country text nullable
age_band text nullable
main_reason text nullable
current_risk_level text default 'none'
consented_at timestamptz nullable
created_at timestamptz
updated_at timestamptz
ended_at timestamptz nullable
```

### messages

Stores chat messages.

```txt
id uuid primary key
session_id uuid references sessions(id)
role text -- user | assistant | system
content text
risk_level text nullable
metadata jsonb
created_at timestamptz
```

### clarity_maps

Stores generated reports.

```txt
id uuid primary key
session_id uuid references sessions(id)
map_json jsonb
created_at timestamptz
```

### safety_events

Stores safety routing decisions.

```txt
id uuid primary key
session_id uuid references sessions(id)
risk_level text
categories text[]
action_taken text
metadata jsonb
created_at timestamptz
```

### resources

Stores curated resources.

```txt
id uuid primary key
country text
topic text
category text
name text
description text
url text nullable
phone text nullable
priority int
verified_at date nullable
created_at timestamptz
```

### feedback

Stores user feedback.

```txt
id uuid primary key
session_id uuid references sessions(id)
clarity_rating int
helpfulness_rating int
felt_safe boolean nullable
unsafe_or_unhelpful boolean default false
comment text nullable
created_at timestamptz
```

## Data minimization

- Anonymous sessions first.
- Store only what Phase 1 needs.
- Do not store unnecessary personal identifiers.
- Add delete-session route in Phase 2.

## TypeScript types

Codex should generate types from either:

1. Supabase generated types, or
2. manually defined `src/types/database.ts` for Phase 1 speed.
