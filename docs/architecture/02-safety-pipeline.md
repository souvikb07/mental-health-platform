# Safety Pipeline

## Safety is the product boundary

MindBridge works only if users understand that it is for reflection and support routing, not diagnosis or crisis care.

## Risk levels

```txt
none
low
medium
high
imminent
```

## Categories

```txt
self_harm
harm_to_others
abuse_or_domestic_violence
psychosis_or_mania_signal
substance_use
minor_safety
medical_emergency
eating_disorder_signal
none
```

## Message pipeline

```txt
1. Receive user message
2. Validate request shape
3. Run basic keyword/heuristic checks
4. Run AI risk classifier
5. Store risk classification
6. Branch:
   - none/low/medium -> normal clarity conversation
   - high -> supportive safety response + crisis/support resources
   - imminent -> urgent crisis flow, no normal chat
7. Validate assistant response
8. Return response
```

## High-risk behavior

If risk is `high`, response should:

- acknowledge distress
- ask user to contact a trusted person or professional support
- provide crisis resources
- avoid long reflective questioning
- avoid self-harm details

## Imminent-risk behavior

If risk is `imminent`, response should:

- be short and direct
- encourage immediate emergency help
- encourage moving away from means if possible, without detailed means discussion
- encourage contacting a trusted person now
- provide crisis resources based on country if available
- stop normal clarity conversation

## Copy template: imminent risk

```txt
I am really sorry you are dealing with this. I cannot help with anything that could hurt you. If you might act on this now, please contact emergency services immediately or go to the nearest emergency room.

If you can, move closer to another person right now and tell them: "I might not be safe alone." You can also contact a crisis helpline in your country.
```

## Prohibited outputs

Never output:

- diagnosis as fact
- medication dosage or prescribing advice
- self-harm instructions or lethality comparisons
- reassurance that the user is definitely safe
- encouragement to keep secrets from trusted people/professionals
- confirmation of delusions

## Safety events

Log only what is needed:

- session_id
- risk_level
- categories
- action_taken
- created_at

Do not log sensitive excerpts unless explicitly needed for debugging in a protected environment.
