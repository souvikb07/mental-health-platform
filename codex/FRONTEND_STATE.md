# Frontend State

Last updated: 2026-05-31.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS v4 with CSS variables in `src/app/globals.css`
- shadcn/ui-style primitives in `src/components/ui`
- lucide-react icons in current product UI
- Vitest, Testing Library, and jsdom for tests

## Important Frontend Structure

- `src/app/layout.tsx`: root layout using `AppShell`.
- `src/app/globals.css`: Tailwind imports, shadcn variables, MindBridge FE-2 tokens, ambient utility classes.
- `src/app/page.tsx`: landing page.
- `src/app/onboarding/page.tsx`: onboarding route shell.
- `src/app/chat/page.tsx`: chat route shell.
- `src/app/clarity-map/page.tsx`: Clarity Map route shell.
- `src/app/resources/page.tsx`: resources route shell.
- `src/app/feedback/page.tsx`: feedback route shell.
- `src/app/demo/page.tsx`: safety/routing preview page.
- `src/components/layout`: app shell, header, footer, page container.
- `src/components/product`: route-level product components.
- `src/components/ui`: reusable shadcn-style primitives.
- `src/lib/api/client.ts`: frontend API helper and frontend-known response types.
- `src/lib/session`: session context and browser journey storage.
- `src/lib/mock`: app-owned mock/fallback data used by backend/frontend fallbacks.
- `reference/stitch`: visual design references only.

## Current Routes And Screens

- `/`: Stitch-style landing page with real product story, CTA to `/onboarding`, secondary CTA to `/resources`, and local hero image.
- `/onboarding`: creates anonymous session, saves journey context, then routes to `/chat`.
- `/chat`: hydrates session/messages from `sessionStorage`, calls context-intake once when needed, sends chat messages with stable per-submission UUIDs, renders safety/resources, and can generate a Clarity Map.
- `/clarity-map`: reads generated map from `sessionStorage`; shows empty CTA when no generated map exists.
- `/resources`: fetches app-owned resources through `/api/resources`; falls back to `mockResources` on failure.
- `/feedback`: submits MVP feedback to `/api/feedback`; explains anonymous
  ratings retention and does not imply review.
- `/demo`: safety and routing preview; not exposed in main header.

## Styling And Design Conventions

- Use FE-2 tokens and semantic classes: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `border-border`.
- Use warm clay page backgrounds, soft white surfaces, sage primary actions, ink foreground, rounded organic cards, and subtle ambient depth.
- `mindbridge-ambient-shadow` and `mindbridge-soft-border` are available utilities.
- Prefer route-local visual changes for polish blocks.
- Do not edit `globals.css` unless the task is explicitly about shared tokens or shared utilities.
- Keep mobile layouts single-column, tappable, and free of horizontal overflow.

## Stitch Reference Rules

- `reference/stitch/README.md` and `reference/stitch/DESIGN.md` define visual direction.
- Stitch HTML must not be copied, imported, iframed, embedded, or rendered with `dangerouslySetInnerHTML`.
- Translate the visual direction into real React/Next.js components.
- Do not add external Stitch fonts, scripts, icon CDNs, or remote assets.
- Stitch `user-profile` is reference-only; do not add auth/profile/account/history.

## State Management

- Onboarding saves session context through `saveSessionContext`.
- Current journey keys:
  - `mindbridge:session-context`
  - `mindbridge:last-session-id`
  - `mindbridge:chat:<sessionId>`
  - `mindbridge:chat-meta:<sessionId>`
- Clarity Map keys:
  - `mindbridge:clarity-map:<sessionId>`
  - `mindbridge:last-clarity-map-session`
- Legacy localStorage session keys remain read-only migration fallbacks:
  - `mindbridge.sessionId`
  - `mindbridge.sessionContext`
- Raw chat content must not be stored in localStorage.
- After storage opt-in, server-retained context-intake/chat, Clarity Map, and
  feedback-comment copies are encrypted before database writes. Browser
  `sessionStorage` remains the active UX cache.
- Onboarding sends an optional unchecked `storageConsentAccepted` choice and
  writes active context through the existing `sessionStorage` cache only.
- Browser storage is not authorization.

## API And Mock Data

- Frontend API expectations are documented in `codex/API_CONTRACT.md`.
- API helpers live in `src/lib/api/client.ts`.
- Resource cards must render backend/app-owned resource data, not invented client-side resources.
- Feedback retains its receipt-only response. UI must remain honest about
  anonymous rating retention and no implied review.
- Do not change request/response shapes from UI polish tasks.

## Frontend Safety Behavior

- Follow `codex/SAFETY_RULES.md`.
- Render backend safety messages, safety cards, disabled next-step states, resources, and boundary/insufficient-context messages.
- Do not infer safety client-side.
- Do not soften, hide, summarize, or replace backend safety copy.
- Do not render model/user text as HTML.

## Known TODOs And Limitations

- Final full journey QA is still recommended after the latest polish work.
- Feedback has no durable human review workflow.
- Resources are app-owned/static and not exhaustive.
- The app is anonymous-session MVP. Backend export/delete endpoints now exist,
  but frontend controls and server hydration remain pending Block 1K.
- Lint warning exists for the landing plain `<img>` local hero asset.

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
git diff --check
RUN_REAL_AI_EVALS=true EVAL_BASE_URL=http://localhost:3000 npm run eval:ai:smoke
```

Real AI eval requires a local dev server and appropriate server-only environment variables.

## Rules For Future Frontend Changes

- Read `codex/CURRENT_STATUS.md` and this file before changing frontend code.
- Keep changes narrow and route/component-scoped.
- Preserve API contracts, storage keys, route behavior, and safety rendering.
- Add or update tests when behavior changes.
- Update `codex/CURRENT_STATUS.md` before finishing.
