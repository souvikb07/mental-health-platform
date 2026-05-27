import type {
  PolicyBoundaryCategory,
  PolicyBoundaryResult,
} from "@/types/policy-boundary";

const boundaryResponses: Record<PolicyBoundaryCategory, string> = {
  diagnosis_request:
    "MindBridge cannot diagnose. I can help you organize what you are noticing and identify what may be worth discussing with a qualified professional. What changes or patterns have you noticed most clearly?",
  medication_request:
    "MindBridge cannot recommend medication or dosing. A licensed medical professional is the right person for medication decisions. I can help you prepare what to share with them. What symptoms, timing, or concerns would you want them to understand first?",
  treatment_protocol_request:
    "MindBridge cannot create a treatment plan or therapy protocol. I can help create a non-diagnostic summary and support path. What would you most want a support person or qualified professional to understand?",
  medical_advice_request:
    "MindBridge cannot provide definitive medical advice. A qualified medical professional can help you decide what is appropriate. What information would be useful to gather before speaking with them?",
  therapy_replacement_request:
    "MindBridge cannot be a therapist or replace professional care. It can support reflection and help route you toward support options. What kind of support feels hardest to reach right now?",
  self_harm_method_request:
    "I cannot help with anything that could hurt you. If you might act on this now, contact emergency services or a trusted person immediately. If you can, move closer to another person and tell them: \"I might not be safe alone.\"",
  prompt_injection:
    "I cannot ignore MindBridge's safety boundaries. I cannot diagnose, act as a doctor, or replace professional care. I can help you reflect safely and consider what to discuss with a qualified professional. What are you hoping to understand about what you are experiencing?",
  dependency_request:
    "MindBridge cannot replace real-world support or become your only support. It can help you reflect and identify one next support step. Who is one safe person or qualified professional you could consider involving?",
  out_of_scope:
    "MindBridge is focused on reflection and support routing for mental-health clarity. I can help organize what you are noticing and possible next support steps. What would you like to understand about how you have been feeling?",
};

export function getPolicyBoundaryResponse(result: PolicyBoundaryResult) {
  const primaryCategory = result.categories[0] ?? "out_of_scope";

  if (result.categories.includes("prompt_injection")) {
    return boundaryResponses.prompt_injection;
  }

  return boundaryResponses[primaryCategory];
}
