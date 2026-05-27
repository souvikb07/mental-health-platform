import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type SafetyNoticeProps = {
  tone?: "standard" | "urgent";
  className?: string;
};

export function SafetyNotice({ tone = "standard", className }: SafetyNoticeProps) {
  const isUrgent = tone === "urgent";

  return (
    <Alert
      className={cn(
        "border-emerald-900/15 bg-white text-slate-800",
        isUrgent && "border-red-900/20 bg-red-50 text-red-950",
        className,
      )}
    >
      {isUrgent ? (
        <AlertTriangle className="size-4" aria-hidden="true" />
      ) : (
        <ShieldCheck className="size-4" aria-hidden="true" />
      )}
      <AlertTitle>{isUrgent ? "Immediate support" : "Safety boundary"}</AlertTitle>
      <AlertDescription>
        {isUrgent
          ? "If you might be in immediate danger, contact emergency services now or reach a local crisis helpline. If you can, move closer to another person and tell them you may not be safe alone."
          : "MindBridge is for reflection and support routing. It is not therapy, diagnosis, treatment, medical advice, emergency support, or a replacement for professional care."}
      </AlertDescription>
    </Alert>
  );
}
