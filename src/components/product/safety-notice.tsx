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
        "rounded-3xl border-border/60 bg-card p-4 text-foreground shadow-sm",
        isUrgent &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {isUrgent ? (
        <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
      ) : (
        <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
      )}
      <AlertTitle className="font-semibold">
        {isUrgent ? "Immediate support" : "Safety boundary"}
      </AlertTitle>
      <AlertDescription
        className={cn(
          "leading-6 text-muted-foreground",
          isUrgent && "text-destructive",
        )}
      >
        {isUrgent
          ? "If you might be in immediate danger, contact emergency services now or reach a local crisis helpline. If you can, move closer to another person and tell them you may not be safe alone."
          : "MindBridge is for reflection and support routing. It is not therapy, diagnosis, treatment, medical advice, emergency support, or a replacement for professional care."}
      </AlertDescription>
    </Alert>
  );
}
