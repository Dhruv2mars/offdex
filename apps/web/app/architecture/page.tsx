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
      "Pair once with QR, trust the client as a device, then use the local bridge when nearby or the encrypted Cloudflare relay when away.",
  },
  {
    name: "Web and product shell",
    detail:
      "The public site, browser client, and phone app use one quiet surface so transport state stays readable.",
  },
] as const;

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/90 shadow-border backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="focus-ring rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Back home
          </Link>
          <div className="flex items-center gap-3">
            <span className="grid h-6 w-6 place-items-center rounded bg-foreground text-xs font-semibold text-background">
              O
            </span>
            <span className="text-xs font-medium text-muted-foreground">Offdex</span>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-6 py-20 md:py-28">
        <div>
          <span className="font-mono text-xs font-medium uppercase text-muted-foreground">
            Architecture
          </span>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-2.4px] md:text-5xl">
            Build trust into the transport, then let the interface stay calm.
          </h1>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-2">
          {layers.map((layer, index) => (
            <article
              className="rounded-lg bg-card p-6 shadow-card transition-shadow hover:shadow-card-hover"
              key={layer.name}
            >
              <span className="font-mono text-xs font-medium text-muted-foreground">
                0{index + 1}
              </span>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.96px]">{layer.name}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{layer.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-16 rounded-lg bg-card p-8 shadow-card">
          <span className="font-mono text-xs font-medium uppercase text-muted-foreground">
            Product rules
          </span>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {architecturePrinciples.map((rule) => (
              <div
                className="rounded-md bg-background px-4 py-3 text-sm text-muted-foreground shadow-border"
                key={rule}
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="shadow-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8">
          <span className="text-xs text-muted-foreground">Offdex</span>
          <span className="text-xs text-muted-foreground">Built for Codex</span>
        </div>
      </footer>
    </main>
  );
}
