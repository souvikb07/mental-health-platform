export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export type MockFeedback = {
  helpfulness: FeedbackRating;
  clarity: FeedbackRating;
  wouldUseAgain: boolean;
  note?: string;
};
