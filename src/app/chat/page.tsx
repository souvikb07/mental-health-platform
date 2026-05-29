import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { ChatPanel } from "@/components/product/chat-panel";

export default function ChatPage() {
  return (
    <PageContainer size="wide" className="py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/onboarding"
          className="mb-4 inline-flex min-h-10 items-center rounded-full px-3 text-sm font-semibold text-primary transition hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        >
          Back to setup
        </Link>
      </div>
      <ChatPanel />
    </PageContainer>
  );
}
