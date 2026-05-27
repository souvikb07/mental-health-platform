import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/onboarding", label: "Start" },
  { href: "/demo", label: "Demo" },
  { href: "/resources", label: "Resources" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-emerald-950/10 bg-white/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" aria-label="MindBridge home">
          <span className="flex size-8 items-center justify-center rounded-md bg-emerald-900 text-white">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight text-emerald-950">
            MindBridge
          </span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="h-9 px-3">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <Button asChild className="h-9 bg-emerald-900 px-3 text-white hover:bg-emerald-800">
          <Link href="/onboarding">
            Start
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
