import Link from "next/link";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { label: "Landing", href: "/" },
  { label: "Onboarding", href: "/onboarding" },
  { label: "Chat", href: "/chat" },
  { label: "Clarity Map", href: "/clarity-map" },
  { label: "Resources", href: "/resources" },
  { label: "Feedback", href: "/feedback" },
];

type JourneyStepperProps = {
  current: string;
};

export function JourneyStepper({ current }: JourneyStepperProps) {
  const currentIndex = steps.findIndex((step) => step.href === current);

  return (
    <nav aria-label="MindBridge journey" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2 rounded-lg border border-emerald-950/10 bg-white p-2">
        {steps.map((step, index) => {
          const isComplete = currentIndex > index;
          const isCurrent = step.href === current;

          return (
            <li key={step.href} className="flex items-center gap-2">
              <Link
                href={step.href}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-md px-3 text-xs font-medium text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-950",
                  isCurrent && "bg-emerald-900 text-white hover:bg-emerald-900 hover:text-white",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border border-current text-[10px]",
                    isComplete && "bg-emerald-100 text-emerald-900",
                  )}
                >
                  {isComplete ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                </span>
                {step.label}
              </Link>
              {index < steps.length - 1 ? (
                <span className="h-px w-4 bg-emerald-950/15" aria-hidden="true" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
