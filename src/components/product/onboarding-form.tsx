"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

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
      className="mindbridge-ambient-shadow grid gap-6 rounded-[2rem] border border-border/60 bg-card p-5 sm:p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!supportLocation || !mainConcernCategory || !consented || !isAdult) {
          setError("Please complete the required onboarding fields before continuing.");
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
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold text-primary">Quick context check</p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          A few details before guided chat.
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Based only on what you share here, MindBridge can tailor the first
          reflection prompt and support options.
        </p>
      </div>

      <label className="grid gap-2 rounded-3xl border border-border/60 bg-muted p-4">
        <span className="text-sm font-semibold text-foreground">
          Support location
        </span>
        <select
          className="h-12 rounded-2xl border border-border/70 bg-card px-4 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          value={supportLocation}
          onChange={(event) => setSupportLocation(event.target.value)}
          required
        >
          <option value="">Select a support location</option>
          <option value="USA">USA</option>
          <option value="India">India</option>
        </select>
        <span className="text-xs leading-5 text-muted-foreground">
          This helps MindBridge show support options for the right location.
        </span>
      </label>

      <fieldset className="grid gap-3 rounded-3xl border border-border/60 bg-muted p-4">
        <legend className="text-sm font-semibold text-foreground">
          Main reason for visit
        </legend>
        <p className="-mt-2 text-xs leading-5 text-muted-foreground">
          Choose the closest fit. This is not a diagnosis.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {mainConcernOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              aria-pressed={mainConcernCategory === option.id}
              className={cn(
                "h-auto min-h-12 justify-start whitespace-normal rounded-2xl border-border/70 bg-card px-4 py-3 text-left text-sm leading-5 text-foreground shadow-sm hover:bg-background",
                mainConcernCategory === option.id &&
                  "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              onClick={() => setMainConcernCategory(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <label className="grid gap-2 rounded-3xl border border-border/60 bg-muted p-4">
        <span className="text-sm font-semibold text-foreground">
          Add anything else you want to share, optional
        </span>
        <Textarea
          className="min-h-28 rounded-2xl border-border/70 bg-card text-foreground placeholder:text-muted-foreground"
          value={mainConcernText}
          onChange={(event) => setMainConcernText(event.target.value)}
          placeholder="A short note is okay, or leave this blank."
        />
        <span className="text-xs leading-5 text-muted-foreground">
          Keep it brief. You can share more during guided chat.
        </span>
      </label>

      <div className="grid gap-3">
        <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted p-4 text-sm leading-6 text-muted-foreground">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-border text-primary accent-primary"
            checked={consented}
            onChange={(event) => setConsented(event.target.checked)}
          />
          <span>
            I understand this tool is for reflection and support routing. It is
            not a crisis service, therapy, diagnosis, treatment, or a
            replacement for professional care.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted p-4 text-sm leading-6 text-muted-foreground">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-border text-primary accent-primary"
            checked={isAdult}
            onChange={(event) => setIsAdult(event.target.checked)}
          />
          <span>I confirm I am 18 or older.</span>
        </label>
      </div>

      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
          {error}
        </p>
      ) : null}

      <div className="pt-1">
        <Button
          type="submit"
          disabled={!canContinue}
          className="h-12 w-full rounded-full bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isSubmitting ? "Creating session..." : "Continue to guided chat"}
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
