import Link from "next/link";

const navItems = [
  { href: "/resources", label: "Resources" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/95 transition-all duration-300 supports-[backdrop-filter]:bg-background/85 supports-[backdrop-filter]:backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-10">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 text-2xl font-extrabold tracking-tight text-[#2d5a43] transition-all duration-300 hover:scale-[1.02] hover:drop-shadow-[0_0_12px_rgba(45,90,67,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="MindBridge home"
        >
          <EcoMark />
          <span>MindBridge</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <nav
            className="hidden items-center gap-3 sm:flex"
            aria-label="Main navigation"
          >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-[#2d5a43] transition-all duration-300 hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {item.label}
            </Link>
          ))}
          </nav>
          <Link
            href="/onboarding"
            className="flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_rgba(45,90,67,0.08)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:bg-[#2d5a43] hover:shadow-[0_15px_30px_-5px_rgba(45,90,67,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0 active:scale-95"
          >
            Start
            <svg
              className="size-4"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 10h11m0 0-4-4m4 4-4 4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}

function EcoMark() {
  return (
    <svg
      className="size-7 shrink-0 text-[#2d5a43] transition-colors duration-300"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M22.75 4.5c-5.52.24-9.9 1.72-13.05 4.42-3.06 2.62-4.55 6.04-4.45 10.2 4.14.1 7.56-1.38 10.18-4.44 2.72-3.16 4.2-6.55 7.32-10.18Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M7.25 20.75c3.8-5.1 7.95-8.9 12.55-11.5"
        stroke="#fdf8f6"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
      <path
        d="M12.35 6.95c-3.2.62-5.63 2.01-7.22 4.12-1.52 2.02-2.08 4.36-1.68 7.02 1.38-2.96 3.48-5.72 6.31-8.28a26.3 26.3 0 0 1 2.59-2.86Z"
        fill="currentColor"
        opacity="0.52"
      />
    </svg>
  );
}
