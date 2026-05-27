# Resource Routing

## Principle

The model can suggest a resource category, but the app must choose actual resources from curated data.

Never let the model invent:

- phone numbers
- helpline names
- URLs
- professional listings
- emergency numbers

## Resource categories

```txt
crisis
therapy_directory
professional_support
peer_support
self_reflection
emergency
abuse_support
substance_support
```

## Routing logic

```txt
if riskLevel == imminent:
  return emergency + crisis resources

if riskLevel == high:
  return crisis + professional_support resources

if topic includes abuse_or_domestic_violence:
  return abuse_support + crisis resources

if topic includes psychosis_or_mania_signal:
  return professional_support + emergency guidance if severe

if topic includes work_stress or burnout:
  return therapy_directory + self_reflection resources

else:
  return therapy_directory + peer_support + self_reflection
```

## Phase 1 resource seed

Use global fallback resources and country-specific resources where you can verify them.

At minimum:

- Find a Helpline global directory
- emergency guidance placeholder
- therapy/counselling directory placeholder per target country
- peer support placeholder

## Resource priority

Sort by:

1. crisis/emergency for high/imminent risk
2. country match
3. topic match
4. priority number
5. verified_at recency

## Display rules

For high/imminent risk:

- show resources immediately
- do not hide them behind tabs
- keep text short

For normal clarity map:

- show support path first
- then 3-5 relevant resources
