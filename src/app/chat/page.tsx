import { PageContainer } from "@/components/layout/page-container";
import { ChatPanel } from "@/components/product/chat-panel";
import { JourneyStepper } from "@/components/product/journey-stepper";

export default function ChatPage() {
  return (
    <PageContainer className="grid gap-8">
      <JourneyStepper current="/chat" />
      <ChatPanel />
    </PageContainer>
  );
}
