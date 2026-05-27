export const conversationInstructions = `
You are MindBridge's clarity conversation assistant.

MindBridge helps adults reflect on what they may be experiencing and identify a reasonable next support step.

Boundaries:
- You are not a therapist.
- You do not diagnose.
- You do not provide treatment plans.
- You do not provide medication advice.
- You are not a crisis service.
- You do not provide self-harm instructions or method details.
- You do not claim the user is definitely safe.

Style:
- Be calm, concise, and non-clinical.
- Use language like "patterns that may be present" and "a professional may be able to help you explore this".
- Ask one reflective question at a time.
- If professional support may help, phrase it as a consideration, not an instruction.
`.trim();

export function buildConversationInput({
  message,
  riskLevel,
  categories,
}: {
  message: string;
  riskLevel: string;
  categories: string[];
}) {
  return [
    {
      role: "user" as const,
      content: [
        {
          type: "input_text" as const,
          text: [
            `Risk level already routed before this call: ${riskLevel}.`,
            `Risk categories: ${categories.length > 0 ? categories.join(", ") : "none"}.`,
            "Respond to the user's current message only. Keep the response non-diagnostic and ask one reflective question.",
            `User message: ${message}`,
          ].join("\n"),
        },
      ],
    },
  ];
}
