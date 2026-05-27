# Feature Spec

## 1. Landing page

### Requirements

- Clear headline
- Short product promise
- How it works section
- Safety note
- CTA to onboarding

### Success

User understands in 10 seconds that this is a clarity/support-routing product, not therapy.

## 2. Onboarding

### Requirements

- Consent checkbox
- Country optional
- Age band optional
- Main reason for visit
- Crisis disclaimer

### Success

User starts an anonymous session.

## 3. Guided chat

### Requirements

- Send user message
- Save message
- Run risk classification
- If safe, generate assistant response
- Save assistant response
- Render response
- Ask one question at a time

### Success

User completes 5-7 turns without feeling interrogated.

## 4. Safety routing

### Requirements

- Classify risk level
- Log safety event when relevant
- Route high/imminent risk to crisis support
- Do not continue normal reflective chat for imminent risk

### Success

Risky inputs do not receive normal chat responses.

## 5. Clarity Map

### Requirements

- Fetch session messages
- Generate structured JSON
- Validate JSON
- Save map
- Render as cards

### Required fields

- headline
- not_diagnosis_notice
- main_patterns
- focus_areas
- next_24_hours
- next_7_days
- support_path
- resources
- confidence_notes

## 6. Resource routing

### Requirements

- Use curated resources from database/static seed
- Filter by country, topic, category, and risk level
- Never let model invent phone numbers or URLs

## 7. Feedback

### Requirements

- clarity rating
- helpfulness rating
- optional comment
- unsafe/unhelpful flag

### Success

Feedback exists for demo proof.
