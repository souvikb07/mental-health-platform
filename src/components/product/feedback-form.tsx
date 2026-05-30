"use client";

import { useState } from "react";
import { CheckCircle2, MessageSquareText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/lib/api/client";
import { loadLastSessionId } from "@/lib/session/journey-storage";
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
      <div className="mindbridge-ambient-shadow rounded-[2rem] border border-primary/15 bg-card p-6 text-foreground sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-foreground">
              Feedback received for this MVP run.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The feedback endpoint accepted it. Anonymous ratings may be
              retained. No account, analytics provider, clinical review,
              emergency follow-up, or human response is implied.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      className="mindbridge-ambient-shadow space-y-7 rounded-[2rem] border border-border/60 bg-card p-5 sm:p-7"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
          await submitFeedback({
            sessionId: loadLastSessionId() ?? "mock_session_demo",
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
      <div className="flex items-start gap-3 rounded-[1.5rem] border border-border/60 bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquareText className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-foreground">
            Share product feedback, not urgent needs.
          </p>
          <p className="mt-1">
            This form helps improve the MVP experience. It is not monitored as
            emergency support. Anonymous ratings may be retained. Optional notes
            are encrypted only when you chose journey storage during onboarding.
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
          className="mt-2 min-h-32 rounded-[1.5rem] border-border/70 bg-background/70 px-4 py-3 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What would make this clearer or more supportive?"
        />
      </label>
      {error ? (
        <p className="rounded-[1.25rem] border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-full bg-primary px-5 text-primary-foreground shadow-[0_15px_30px_-12px_rgba(45,90,67,0.5)] hover:bg-primary/90"
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
    <fieldset className="rounded-[1.5rem] border border-border/60 bg-background/60 p-4">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={
              rating === value
                ? "flex size-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                : "flex size-11 items-center justify-center rounded-full border border-border/70 bg-card text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
