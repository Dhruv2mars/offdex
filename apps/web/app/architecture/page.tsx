import { architecturePrinciples } from "../site-content";

const layers = [
  {
    name: "Mobile app",
    detail:
      "Expo + React Native for the main product surface, with native modules added only where they clearly improve feel or reliability.",
  },
  {
    name: "Shared protocol",
    detail:
      "A single typed language for threads, local pairing, runtime state, and live session updates across mobile, web, bridge, and relay.",
  },
  {
    name: "Bridge",
    detail:
      "The local machine control layer that runs Codex CLI, keeps thread truth fresh, and exposes stable local connection paths for the phone.",
  },
  {
    name: "Relay",
    detail:
      "A replaceable transport hop that keeps the system local-first and honest instead of quietly turning into a hosted black box.",
  },
];

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="mx-auto w-full max-w-5xl px-6 py-10 md:px-10 md:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-lime">
              Architecture
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em] md:text-6xl">
              Build the app around trust, not around temporary hacks.
            </h1>
          </div>
          <a
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-ink-soft transition hover:bg-white/10"
          >
            Back home
          </a>
        </div>

        <div className="mt-12 grid gap-4">
          {layers.map((layer) => (
            <div
              key={layer.name}
              className="rounded-[28px] border border-white/10 bg-panel p-6"
            >
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">
                {layer.name}
              </h2>
              <p className="mt-3 max-w-3xl text-base leading-8 text-ink-soft">
                {layer.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-[32px] border border-white/10 bg-[#101413] p-7">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-lime">
            Product rules
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {architecturePrinciples.map((rule) => (
              <div
                key={rule}
                className="rounded-[22px] border border-white/8 bg-black/15 px-4 py-4 text-sm leading-7 text-ink-soft"
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
