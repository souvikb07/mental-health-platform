"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { FeedbackRating } from "@/types/feedback";

const ratings: FeedbackRating[] = [1, 2, 3, 4, 5];

export function FeedbackForm() {
  const [helpfulness, setHelpfulness] = useState<FeedbackRating>(4);
  const [clarity, setClarity] = useState<FeedbackRating>(4);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-900/15 bg-emerald-50 p-5 text-emerald-950">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Feedback noted locally for this demo.
        </div>
        <p className="mt-2 text-sm leading-6">
          No account, database, analytics provider, or external service was used.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
      }}
    >
      <RatingRow
        label="How helpful did this feel?"
        value={helpfulness}
        onChange={setHelpfulness}
      />
      <RatingRow
        label="How clear were the next steps?"
        value={clarity}
        onChange={setClarity}
      />
      <label className="block">
        <span className="text-sm font-medium text-slate-950">Optional note</span>
        <Textarea
          className="mt-2 min-h-28 bg-white"
          placeholder="What would make this clearer or more supportive?"
        />
      </label>
      <Button type="submit" className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
        Submit feedback
      </Button>
    </form>
  );
}

function RatingRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FeedbackRating;
  onChange: (rating: FeedbackRating) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-950">{label}</legend>
      <div className="mt-2 flex gap-2">
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={
              rating === value
                ? "flex size-9 items-center justify-center rounded-md bg-emerald-900 text-sm font-medium text-white"
                : "flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-emerald-50"
            }
            aria-pressed={rating === value}
          >
            {rating}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
