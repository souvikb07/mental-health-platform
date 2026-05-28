import { PageContainer } from "@/components/layout/page-container";
import { ChatPanel } from "@/components/product/chat-panel";
import { JourneyStepper } from "@/components/product/journey-stepper";

export default function ChatPage() {
  return (
    <PageContainer size="wide" className="grid gap-8 py-10 sm:py-14">
      <JourneyStepper current="/chat" />
      <ChatPanel />
    </PageContainer>
  );
}
