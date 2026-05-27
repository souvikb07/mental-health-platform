"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createSession } from "@/lib/api/client";

export function OnboardingForm() {
  const router = useRouter();
  const [country, setCountry] = useState("United States");
  const [ageBand, setAgeBand] = useState("Prefer not to say");
  const [mainConcern, setMainConcern] = useState("");
  const [consented, setConsented] = useState(true);
  const [isAdult, setIsAdult] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <form
      className="grid gap-5 rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
          const response = await createSession({
            country,
            ageBand,
            mainConcern:
              mainConcern ||
              "I feel off and want help organizing what might be going on.",
          });
          window.localStorage.setItem("mindbridge.sessionId", response.sessionId);
          router.push("/chat");
        } catch {
          setError("We could not create the mock session. Please try again.");
          setIsSubmitting(false);
        }
      }}
    >
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-950">Country optional</span>
        <Input
          className="h-10 bg-white"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          placeholder="United States"
        />
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-950">Age band optional</span>
        <select
          className="h-10 rounded-md border border-input bg-white px-3 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          value={ageBand}
          onChange={(event) => setAgeBand(event.target.value)}
        >
          <option>Prefer not to say</option>
          <option>18-24</option>
          <option>25-34</option>
          <option>35-44</option>
          <option>45-54</option>
          <option>55+</option>
        </select>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-slate-950">Main reason for visit</span>
        <Textarea
          className="min-h-28 bg-white"
          value={mainConcern}
          onChange={(event) => setMainConcern(event.target.value)}
          placeholder="I feel off and want help organizing what might be going on."
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
        <span>
          I understand MindBridge is intended for adults 18+. If I am under 18,
          I should involve a trusted adult or qualified professional.
        </span>
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div>
        <Button
          type="submit"
          disabled={!consented || !isAdult || isSubmitting}
          className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800"
        >
          {isSubmitting ? "Creating session..." : "Continue to guided chat"}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
