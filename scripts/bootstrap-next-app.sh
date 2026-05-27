#!/usr/bin/env bash
set -euo pipefail

# Run this only in an empty folder before copying this architecture pack.
# If your app already exists, do not run this script.

pnpm dlx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
pnpm add openai @supabase/supabase-js zod lucide-react clsx tailwind-merge
pnpm add -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event prettier eslint-config-prettier
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input textarea badge alert dialog separator progress tabs skeleton toast
