# API Contracts

All request bodies must be validated with Zod.

## POST /api/session

Creates an anonymous session.

Request:

```json
{
  "country": "india",
  "ageBand": "18-24",
  "mainReason": "overwhelmed",
  "consented": true
}
```

Response:

```json
{
  "sessionId": "uuid",
  "anonymousId": "string"
}
```

## POST /api/chat

Sends a message and returns either normal assistant response or safety response.

Request:

```json
{
  "sessionId": "uuid",
  "message": "I feel exhausted and I do not know why."
}
```

Response:

```json
{
  "messageId": "uuid",
  "assistantMessage": "That sounds heavy...",
  "risk": {
    "riskLevel": "low",
    "categories": [],
    "requiresCrisisResponse": false
  },
  "mode": "normal"
}
```

Safety response:

```json
{
  "assistantMessage": "I am really sorry you are dealing with this...",
  "risk": {
    "riskLevel": "imminent",
    "categories": ["self_harm"],
    "requiresCrisisResponse": true
  },
  "mode": "crisis",
  "resources": []
}
```

## POST /api/clarity-map

Generates and stores a Clarity Map.

Request:

```json
{
  "sessionId": "uuid"
}
```

Response:

```json
{
  "clarityMapId": "uuid",
  "clarityMap": {}
}
```

## GET /api/resources

Returns deterministic resources.

Query:

```txt
/api/resources?country=india&topic=self_harm&riskLevel=high
```

Response:

```json
{
  "resources": []
}
```

## POST /api/feedback

Request:

```json
{
  "sessionId": "uuid",
  "clarityRating": 4,
  "helpfulnessRating": 5,
  "feltSafe": true,
  "unsafeOrUnhelpful": false,
  "comment": "I know what to do next."
}
```

Response:

```json
{
  "ok": true
}
```

## Error shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please check your input."
  }
}
```

Do not expose raw internal errors to the frontend.
