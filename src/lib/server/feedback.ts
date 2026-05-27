import type { FeedbackRequest } from "@/lib/validation/feedback";

export type FeedbackResult = {
  status: "received";
};

export function receiveMockFeedback(request: FeedbackRequest): FeedbackResult {
  void request;

  return {
    status: "received",
  };
}
