export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export type MockFeedback = {
  helpfulness: FeedbackRating;
  clarity: FeedbackRating;
  wouldUseAgain: boolean;
  note?: string;
};

export type FeedbackSubmission = {
  sessionId: string;
  clarityRating: FeedbackRating;
  helpfulnessRating: FeedbackRating;
  feltSafe?: boolean | null;
  unsafeOrUnhelpful?: boolean;
  comment?: string | null;
};
