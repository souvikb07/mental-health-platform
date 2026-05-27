# Setup Commands

Use this file as the exact command reference for starting the Phase 1 repo.

## Option A: recommended fresh setup

Run these in an empty project folder.

```bash
pnpm dlx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Then copy this starter pack into the repo root.

Install core dependencies:

```bash
pnpm add openai @supabase/supabase-js zod lucide-react clsx tailwind-merge
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier eslint-config-prettier
```

Install shadcn/ui:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input textarea badge alert dialog separator progress tabs skeleton toast
```

Add useful scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create environment file:

```bash
cp .env.example .env.local
```

Start dev server:

```bash
pnpm dev
```

## Option B: if a Next.js repo already exists

Copy only these into the root first:

```txt
AGENTS.md
CODEX_BUILD_LOG.md
PROJECT_TREE.md
SETUP_COMMANDS.md
docs/
codex/
prompts/
schemas/
supabase/
tests/evals/
.env.example
```

Then ask Codex to merge the intended `src/` architecture into the current codebase.

## First Codex command

After setup, open Codex from the repo root and run:

```txt
Read AGENTS.md, PROJECT_TREE.md, docs/product/01-phase-1-scope.md, docs/architecture/00-system-overview.md, docs/architecture/02-safety-pipeline.md, and codex/prompts/001-bootstrap-repo.md. Then propose the first implementation plan without editing files yet.
```

## First implementation command for Codex

After reviewing the plan, run:

```txt
Implement the Phase 1 skeleton from codex/prompts/001-bootstrap-repo.md. Keep route handlers thin, add placeholder pages for the user journey, and update CODEX_BUILD_LOG.md when done.
```

## Supabase setup

Create a Supabase project, then run:

```bash
supabase init
supabase db push
```

Or paste `supabase/migrations/0001_phase1_schema.sql` into the Supabase SQL editor for the hackathon-speed path.

## Vercel setup

```bash
vercel link
vercel env pull .env.local
vercel deploy
```

Required environment variables are documented in `.env.example`.
