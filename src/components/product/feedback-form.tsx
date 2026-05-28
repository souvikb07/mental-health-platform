"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/api/client";
import type { FeedbackRating } from "@/types/feedback";

const ratings: FeedbackRating[] = [1, 2, 3, 4, 5];

export function FeedbackForm() {
  const [helpfulness, setHelpfulness] = useState<FeedbackRating>(4);
  const [clarity, setClarity] = useState<FeedbackRating>(4);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submitted) {
    return (
      <div className="rounded-3xl border border-primary/15 bg-primary/10 p-5 text-foreground">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
          Feedback received for this MVP run.
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The feedback endpoint accepted it. No account, database record,
          analytics provider, clinical review, or emergency follow-up is
          implied.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
          await submitFeedback({
            sessionId:
              window.localStorage.getItem("mindbridge.sessionId") ??
              "mock_session_demo",
            clarityRating: clarity,
            helpfulnessRating: helpfulness,
            feltSafe: true,
            unsafeOrUnhelpful: false,
            comment: comment || null,
          });
          setSubmitted(true);
        } catch {
          setError("The feedback service did not respond. Please try again.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex items-start gap-3 rounded-3xl border border-border/60 bg-muted/60 p-4 text-sm leading-6 text-muted-foreground">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MessageSquareText className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            Share product feedback, not urgent needs.
          </p>
          <p className="mt-1">
            This form helps improve the MVP experience. It is not monitored as
            emergency support.
          </p>
        </div>
      </div>
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
      <label className="block" htmlFor="feedback-comment">
        <span className="text-sm font-semibold text-foreground">
          Optional note
        </span>
        <Textarea
          id="feedback-comment"
          className="mt-2 min-h-28 rounded-3xl border-border/70 bg-background/70 px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What would make this clearer or more supportive?"
        />
      </label>
      {error ? (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-11 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
      >
        {isSubmitting ? "Submitting..." : "Submit feedback"}
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
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={
              rating === value
                ? "flex size-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm"
                : "flex size-10 items-center justify-center rounded-full border border-border/70 bg-card text-sm font-semibold text-muted-foreground hover:bg-muted"
            }
            aria-pressed={rating === value}
            aria-label={`${label} ${rating} out of 5`}
          >
            {rating}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
