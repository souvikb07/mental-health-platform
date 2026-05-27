"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createSession } from "@/lib/api/client";
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
      className="grid gap-5 rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!supportLocation || !mainConcernCategory || !consented || !isAdult) {
          setError("Please complete the required onboarding fields.");
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
          router.push("/chat");
        } catch {
          setError("We could not create the mock session. Please try again.");
          setIsSubmitting(false);
        }
      }}
    >
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-950">
          Support location
        </span>
        <select
          className="h-10 rounded-md border border-input bg-white px-3 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          value={supportLocation}
          onChange={(event) => setSupportLocation(event.target.value)}
          required
        >
          <option value="">Select a support location</option>
          <option value="USA">USA</option>
          <option value="India">India</option>
        </select>
        <span className="text-xs leading-5 text-slate-500">
          Used only to show the most relevant support resources.
        </span>
      </label>
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium text-slate-950">
          Main reason for visit
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {mainConcernOptions.map((option) => (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              className={cn(
                "h-auto justify-start whitespace-normal px-3 py-2 text-left text-slate-700",
                mainConcernCategory === option.id &&
                  "border-emerald-900 bg-emerald-50 text-emerald-950",
              )}
              onClick={() => setMainConcernCategory(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-950">
          Add anything else you want to share, optional
        </span>
        <Textarea
          className="min-h-24 bg-white"
          value={mainConcernText}
          onChange={(event) => setMainConcernText(event.target.value)}
          placeholder="A short note is okay, or leave this blank."
        />
      </label>
      <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-slate-300"
          checked={consented}
          onChange={(event) => setConsented(event.target.checked)}
        />
        <span>
          I understand this tool is for reflection and support routing. It is
          not a crisis service, therapy, diagnosis, treatment, or a replacement
          for professional care.
        </span>
      </label>
      <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-slate-300"
          checked={isAdult}
          onChange={(event) => setIsAdult(event.target.checked)}
        />
        <span>I confirm I am 18 or older.</span>
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div>
        <Button
          type="submit"
          disabled={!canContinue}
          className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800"
        >
          {isSubmitting ? "Creating session..." : "Continue to guided chat"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
