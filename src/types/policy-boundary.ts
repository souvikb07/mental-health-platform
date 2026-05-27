export type PolicyBoundaryCategory =
  | "diagnosis_request"
  | "medication_request"
  | "treatment_protocol_request"
  | "medical_advice_request"
  | "therapy_replacement_request"
  | "self_harm_method_request"
  | "prompt_injection"
  | "dependency_request"
  | "out_of_scope";

export type PolicyBoundaryAction =
  | "allow"
  | "answer_with_boundary"
  | "route_to_safety";

export type PolicyBoundaryResult = {
  action: PolicyBoundaryAction;
  categories: PolicyBoundaryCategory[];
  reason?: string;
};
