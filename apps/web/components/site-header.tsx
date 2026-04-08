import Link from "next/link";
import { githubReleasesUrl } from "../app/site-content";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 shadow-border backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-6 md:px-8">
        <Link href="/" className="flex items-center gap-2 rounded-md focus-ring">
          <img src="/logo.svg" alt="Offdex Logo" className="h-5 w-auto" />
          <span className="font-semibold tracking-[-0.32px]">Offdex</span>
        </Link>
        <nav className="flex items-center gap-6 text-[14px] font-medium">
          <Link href="/changelog" className="text-muted-foreground transition-colors hover:text-foreground focus-ring rounded-md">Changelog</Link>
          <Link href="/docs" className="text-muted-foreground transition-colors hover:text-foreground focus-ring rounded-md">Documentation</Link>
          <Link href="/download" className="text-muted-foreground transition-colors hover:text-foreground focus-ring rounded-md">Download</Link>
          <a
            href="https://github.com/Dhruv2mars/offdex"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground focus-ring rounded-md"
          >
            <span className="sr-only">GitHub</span>
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
        </nav>
      </div>
    </header>
  );
}
