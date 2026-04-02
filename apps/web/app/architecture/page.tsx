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
      "The machine stays authoritative. Codex authentication, session state, and live thread truth remain on the user’s Mac instead of being mirrored into a mystery backend.",
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
    <main className="min-h-screen bg-canvas text-ink">
      <section className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
        <div className="rounded-[36px] border border-line bg-panel p-7 md:p-9">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-lime">
                Architecture
              </div>
              <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-accent-serif)] text-4xl leading-none tracking-[-0.05em] md:text-6xl">
                Build trust into the transport, then let the interface stay calm.
              </h1>
            </div>
            <a
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-soft transition hover:bg-white/8"
            >
              Back home
            </a>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {layers.map((layer, index) => (
              <div
                key={layer.name}
                className="rounded-[28px] border border-white/10 bg-panel-strong p-6"
              >
                <div className="font-mono text-xs text-amber">{`0${index + 1}`}</div>
                <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">
                  {layer.name}
                </h2>
                <p className="mt-3 text-base leading-8 text-ink-soft">{layer.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-[36px] border border-white/10 bg-[#0d1513] p-7 md:p-9">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-amber">
            Product rules
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {architecturePrinciples.map((rule) => (
              <div
                key={rule}
                className="rounded-[22px] border border-white/8 bg-black/10 px-4 py-4 text-sm leading-7 text-ink-soft"
              >
                {rule}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
