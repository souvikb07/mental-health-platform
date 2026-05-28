export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/80">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-2 px-5 py-6 text-xs leading-6 text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <p>MindBridge is a Phase 1 MVP for reflection and support routing.</p>
        <p>Not therapy, diagnosis, treatment, medical advice, or emergency support.</p>
      </div>
    </footer>
  );
}
