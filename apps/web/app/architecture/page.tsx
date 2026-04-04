import Link from "next/link";
import { architecturePrinciples } from "../site-content";

const layers = [
  {
    name: "Phone shell",
    detail:
      "Expo SDK 55 for speed, adaptive layouts for phone and desktop widths, and native-feeling feedback where it improves confidence instead of adding noise.",
  },
  {
    name: "Bridge and Codex runtime",
    detail:
      "The machine stays authoritative. Codex authentication, session state, and live thread truth remain on the user's Mac instead of being mirrored into a mystery backend.",
  },
  {
    name: "Managed remote path",
    detail:
      "Pair once with QR, trust the phone as a device, then reconnect through direct-first transport with encrypted relay fallback when the network gets in the way.",
  },
  {
    name: "Web and product shell",
    detail:
      "The landing page and future browser UI use the same visual language as the app: dense enough to feel serious, quiet enough to feel official.",
  },
] as const;

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto w-full max-w-5xl px-6 py-16 md:py-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back home
          </Link>
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
        </div>

        {/* Title */}
        <div className="mb-16">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Architecture</span>
          <h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight leading-tight max-w-3xl">
            Build trust into the transport, then let the interface stay calm.
          </h1>
        </div>

        {/* Layers grid */}
        <div className="grid gap-4 md:grid-cols-2 mb-16">
          {layers.map((layer, index) => (
            <div
              key={layer.name}
              className="rounded-xl border border-border bg-card/50 p-6 hover:border-muted-foreground/30 transition-colors"
            >
              <span className="text-xs font-mono text-muted-foreground">0{index + 1}</span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">
                {layer.name}
              </h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{layer.detail}</p>
            </div>
          ))}
        </div>

        {/* Principles */}
        <div className="rounded-xl border border-border bg-card/30 p-8">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Product rules</span>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {architecturePrinciples.map((rule) => (
              <div
                key={rule}
                className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground"
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Offdex</span>
            <span className="text-xs text-muted-foreground">Built for Codex</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
