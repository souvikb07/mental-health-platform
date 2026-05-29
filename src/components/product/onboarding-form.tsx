"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ShieldCheck, Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createSession } from "@/lib/api/client";
import { saveSessionContext } from "@/lib/session/journey-storage";
import { mainConcernOptions } from "@/lib/session/session-context";
import { cn } from "@/lib/utils";
import type { MainConcernCategory } from "@/types/session-context";

export function OnboardingForm() {
  const router = useRouter();
  const [supportLocation, setSupportLocation] = useState("");
  const [mainConcernCategory, setMainConcernCategory] =
    useState<MainConcernCategory | "">("");
  const [mainConcernText, setMainConcernText] = useState("");
  const [consented, setConsented] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canContinue =
    Boolean(supportLocation) &&
    Boolean(mainConcernCategory) &&
    consented &&
    isAdult &&
    !isSubmitting;

  return (
    <form
      className="grid w-full max-w-2xl gap-6 rounded-[2rem] border border-border/60 bg-card p-5 shadow-[0_10px_30px_rgba(45,90,67,0.08)] sm:p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!supportLocation || !mainConcernCategory || !consented || !isAdult) {
          setError(
            "Please complete the required onboarding fields before continuing.",
          );
          setIsSubmitting(false);
          return;
        }

        try {
          const response = await createSession({
            country: supportLocation,
            ageConfirmed: isAdult,
            consentAccepted: consented,
            mainConcernCategory,
            mainConcernText: mainConcernText.trim() || undefined,
          });
          window.localStorage.setItem("mindbridge.sessionId", response.sessionId);
          window.localStorage.setItem(
            "mindbridge.sessionContext",
            JSON.stringify(response.sessionContext),
          );
          saveSessionContext(response.sessionContext);
          router.push("/chat");
        } catch {
          setError("We could not create the session. Please try again.");
          setIsSubmitting(false);
        }
      }}
    >
      <SafetyBoundaryCard />

      <header className="space-y-3 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary transition-transform duration-500 hover:rotate-6 hover:scale-105">
          <Sprout className="size-8" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Welcome to MindBridge
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Let&apos;s personalize your guided reflection. A few details help
            MindBridge tailor the first prompt and support options.
          </p>
        </div>
      </header>

      <div className="grid gap-2">
        <label
          className="text-sm font-semibold text-foreground"
          htmlFor="support-location"
        >
          Support location
        </label>
        <div className="relative">
          <select
            id="support-location"
            className="h-12 w-full appearance-none rounded-2xl border-2 border-transparent bg-muted px-4 pr-11 text-sm text-foreground outline-none transition hover:bg-muted/80 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20"
            value={supportLocation}
            onChange={(event) => setSupportLocation(event.target.value)}
            required
          >
            <option value="">Select your location</option>
            <option value="USA">USA</option>
            <option value="India">India</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <span className="text-xs leading-5 text-muted-foreground">
          This helps show support options for the right location.
        </span>
      </div>

      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-foreground">
          Main reason for visit
        </legend>
        <p className="text-xs leading-5 text-muted-foreground">
          Choose the closest fit. This is not a diagnosis.
        </p>
        <div className="flex flex-wrap gap-2.5 sm:gap-3">
          {mainConcernOptions.map((option) => (
            <ConcernPill
              key={option.id}
              label={option.label}
              selected={mainConcernCategory === option.id}
              onSelect={() => setMainConcernCategory(option.id)}
            />
          ))}
        </div>
      </fieldset>

      <label className="grid gap-2">
        <span className="text-sm font-semibold text-foreground">
          Add anything else you want to share, optional
        </span>
        <Textarea
          className="min-h-24 rounded-2xl border-2 border-transparent bg-muted px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20"
          value={mainConcernText}
          onChange={(event) => setMainConcernText(event.target.value)}
          placeholder="A short note is okay, or leave this blank."
        />
        <span className="text-xs leading-5 text-muted-foreground">
          A short note is okay, or leave this blank. You can share more in chat.
        </span>
      </label>

      <div className="grid gap-3">
        <AcknowledgementRow
          checked={consented}
          onChange={setConsented}
          label={
            <>
              I understand this tool is for reflection and support routing. It
              is not a crisis service, therapy, diagnosis, treatment, medical
              advice, or a replacement for professional care.
            </>
          }
        />
        <AcknowledgementRow
          checked={isAdult}
          onChange={setIsAdult}
          label="I confirm I am 18 or older."
        />
      </div>

      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          disabled={!canContinue}
          className="h-12 w-full rounded-full bg-primary px-6 text-primary-foreground shadow-[0_4px_12px_rgba(45,90,67,0.15)] transition-all duration-300 hover:bg-[#2d5a43] hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSubmitting ? "Creating session..." : "Continue"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
          A qualified professional may be able to help you explore ongoing
          concerns further.
        </p>
      </div>
    </form>
  );
}

function SafetyBoundaryCard() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted p-4 text-sm leading-5 text-muted-foreground">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <ShieldCheck className="size-4" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="font-semibold text-foreground">Safety boundary</p>
        <p className="text-xs leading-5 text-muted-foreground">
          MindBridge is for reflection and support routing. It is not therapy,
          diagnosis, treatment, medical advice, a crisis service, or a
          replacement for professional care.
        </p>
      </div>
    </div>
  );
}

function ConcernPill({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={selected}
      className={cn(
        "h-auto min-h-11 whitespace-normal rounded-full border-border/70 bg-card px-4 py-2 text-sm font-medium leading-5 text-foreground shadow-none transition-all duration-300 hover:bg-muted focus-visible:ring-4 focus-visible:ring-primary/20 sm:px-5",
        selected &&
          "scale-[1.02] border-primary bg-primary text-primary-foreground hover:bg-primary/90",
      )}
      onClick={onSelect}
    >
      {label}
    </Button>
  );
}

function AcknowledgementRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted p-4 text-sm leading-6 text-muted-foreground transition-colors hover:bg-muted/80">
      <input
        type="checkbox"
        className="mt-1 size-4 rounded border-border text-primary accent-primary focus-visible:ring-4 focus-visible:ring-primary/20"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
