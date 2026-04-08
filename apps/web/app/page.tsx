import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubReleasesUrl,
} from "./site-content";
import { InstallCommand } from "./install-command";

const features = [
  {
    title: "Live sync",
    description: "Real-time streaming from your Mac. Not a delayed mirror.",
  },
  {
    title: "Secure pairing",
    description: "QR code once, trusted session forever. Local-first.",
  },
  {
    title: "Same threads",
    description: "Pick up exactly where you left off. No sync conflicts.",
  },
] as const;

const steps = [
  { step: "01", label: "Install bridge", description: "npm install -g @dhruv2mars/offdex" },
  { step: "02", label: "Scan QR code", description: `Run ${bridgeStartCommand} on your Mac` },
  { step: "03", label: "Start coding", description: "Same threads, anywhere" },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Subtle radial gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_50%)]" />
        
        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 md:pt-32 md:pb-24">
          {/* Header */}
          <header className="flex items-center justify-between mb-20 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#09090b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-sm font-semibold tracking-tight">Offdex</span>
            </div>
            <nav className="flex items-center gap-6">
              <a 
                href={githubReleasesUrl}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Releases
              </a>
              <Link 
                href="/architecture"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Architecture
              </Link>
            </nav>
          </header>

          {/* Hero content */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1.5 mb-8 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground">Live on Android</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6 animate-fade-in-delay">
              Codex on your phone
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl animate-fade-in-delay-2">
              A proper mobile client for OpenAI Codex. Pair with your Mac once, then access your threads from anywhere with real-time sync.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mb-12 animate-fade-in-delay-3">
              <a
                href={androidApkDownloadUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download APK
              </a>
              <a
                href={githubReleasesUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/50 px-5 py-3 text-sm font-medium text-foreground hover:bg-card transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>

            {/* Install command */}
            <InstallCommand command={cliInstallCommand} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={feature.title} className="group">
                <div className="h-10 w-10 rounded-lg border border-border bg-card/50 flex items-center justify-center mb-4 group-hover:border-muted-foreground/50 transition-colors">
                  <span className="text-xs font-mono text-muted-foreground">0{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-card/20">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <div className="mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl">Three steps to get Codex on your phone. Your Mac stays the source of truth.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((item) => (
              <div 
                key={item.step}
                className="rounded-xl border border-border bg-card/50 p-6 hover:border-muted-foreground/30 transition-colors"
              >
                <span className="text-xs font-mono text-muted-foreground">{item.step}</span>
                <h3 className="text-base font-semibold mt-3 mb-2">{item.label}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture callout */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <div className="rounded-2xl border border-border bg-card/30 p-8 md:p-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h2 className="text-xl md:text-2xl font-semibold mb-3">Local-first architecture</h2>
                <p className="text-muted-foreground max-w-lg">
                  No cloud intermediary. Your Mac bridges directly to your phone over local network or secure relay. Codex auth never leaves your machine.
                </p>
              </div>
              <Link
                href="/architecture"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/50 px-5 py-3 text-sm font-medium hover:bg-card transition-colors whitespace-nowrap"
              >
                Read architecture docs
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-xs text-muted-foreground">Offdex</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <a href={githubReleasesUrl} className="hover:text-foreground transition-colors">Releases</a>
              <Link href="/architecture" className="hover:text-foreground transition-colors">Architecture</Link>
              <span>Built for Codex</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
