import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { JourneyStepper } from "@/components/product/journey-stepper";
import { SafetyNotice } from "@/components/product/safety-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function OnboardingPage() {
  return (
    <PageContainer size="narrow" className="grid gap-8">
      <JourneyStepper current="/onboarding" />
      <div>
        <p className="text-sm font-medium text-emerald-800">Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-emerald-950">
          Set the context for this reflection.
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Share only what you want to include. This demo does not save or send
          your answers anywhere.
        </p>
      </div>
      <SafetyNotice />
      <form className="grid gap-5 rounded-lg border border-emerald-950/10 bg-white p-5 shadow-sm">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-950">Country optional</span>
          <Input className="h-10 bg-white" placeholder="United States" />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-950">Age band optional</span>
          <select className="h-10 rounded-md border border-input bg-white px-3 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
            <option>Prefer not to say</option>
            <option>18-24</option>
            <option>25-34</option>
            <option>35-44</option>
            <option>45-54</option>
            <option>55+</option>
          </select>
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-950">Main reason for visit</span>
          <Textarea
            className="min-h-28 bg-white"
            placeholder="I feel off and want help organizing what might be going on."
          />
        </label>
        <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <input type="checkbox" className="mt-1 size-4 rounded border-slate-300" defaultChecked />
          <span>
            I understand this tool is for reflection and support routing. It is
            not a crisis service, therapy, diagnosis, treatment, or a replacement
            for professional care.
          </span>
        </label>
        <div>
          <Button asChild className="h-10 bg-emerald-900 px-4 text-white hover:bg-emerald-800">
            <Link href="/chat">
              Continue to guided chat
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
