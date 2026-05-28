import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/onboarding", label: "Start" },
  { href: "/resources", label: "Resources" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex min-h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2"
          aria-label="MindBridge home"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight text-primary">
            MindBridge
          </span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className="h-10 rounded-full px-4 text-muted-foreground hover:bg-muted hover:text-primary"
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <Button asChild className="h-11 rounded-full bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90">
          <Link href="/onboarding">
            Start
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
