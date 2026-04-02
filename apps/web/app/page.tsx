const machineSignals = [
  "Trusted phone session survives backgrounding",
  "Direct path first, relay fallback only when needed",
  "Mac remains the source of truth for live Codex state",
];

const shellColumns = [
  {
    label: "Machine",
    title: "Your Mac keeps the real session.",
    body: "Codex stays local on the machine you already trust. Offdex only carries the live control surface.",
    items: ["Codex auth stays on the Mac", "QR pair once", "Reconnect forever until you disconnect"],
  },
  {
    label: "Threads",
    title: "Live thread state, not a lagging companion view.",
    body: "Thread truth streams from the bridge. The phone follows the same session instead of pretending with stale cached UI.",
    items: ["Streaming turns", "Honest reconnect state", "Machine list with real readiness"],
  },
  {
    label: "Phone",
    title: "Built like the app OpenAI forgot to ship.",
    body: "Android-first, cross-platform, and ruthless about speed. Expo where it helps. Native escape hatches where they win.",
    items: ["Expo SDK 55 base", "Native-feeling pairing flow", "Performance-first shell"],
  },
] as const;

const workflow = [
  "Open the bridge on your machine.",
  "Scan the QR from Offdex once.",
  "Leave the Mac online and pick up the same threads anywhere.",
] as const;

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(208,255,95,0.13),transparent_30%),radial-gradient(circle_at_75%_0%,rgba(255,207,118,0.09),transparent_24%)]" />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-10 px-6 py-8 md:px-10 md:py-10">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="rounded-full border border-line bg-panel px-4 py-2 text-[11px] font-semibold tracking-[0.28em] uppercase text-lime">
              Offdex
            </div>
            <div className="flex items-center gap-3 text-sm text-ink-soft">
              <span>{`Offdex: Codex mobile app.`}</span>
              <a
                href="/architecture"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/8"
              >
                Architecture
              </a>
            </div>
          </header>

          <div className="grid flex-1 gap-10 xl:grid-cols-[1.15fr_0.95fr]">
            <div className="flex flex-col justify-between gap-10">
              <div className="space-y-8">
                <div className="inline-flex rounded-full border border-line bg-panel px-4 py-2 text-xs font-medium text-amber">
                  Codex, carried properly
                </div>
                <div className="space-y-5">
                  <p className="max-w-xl text-sm leading-7 text-ink-soft md:text-base">
                    Offdex turns your phone into a real Codex surface, not a remote-control toy.
                  </p>
                  <h1 className="max-w-5xl font-[family-name:var(--font-accent-serif)] text-5xl leading-none tracking-[-0.055em] md:text-7xl">
                    Codex on your phone,
                    <br />
                    with the same confidence as your Mac.
                  </h1>
                  <p className="max-w-2xl text-lg leading-8 text-ink-muted md:text-xl">
                    The app is built around live trust: pair once, keep the Mac online, and stay on the same real thread from anywhere without the fake companion-app feel.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[34px] border border-line bg-panel p-6 shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-lime">
                    Why it feels right
                  </div>
                  <div className="mt-5 space-y-4">
                    {machineSignals.map((signal) => (
                      <div
                        key={signal}
                        className="rounded-[20px] border border-white/8 bg-panel-strong px-4 py-4 text-sm leading-7 text-ink-soft"
                      >
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[34px] border border-white/10 bg-[#0d1513] p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber">
                    Workflow
                  </div>
                  <div className="mt-5 space-y-4">
                    {workflow.map((step, index) => (
                      <div
                        key={step}
                        className="flex gap-4 border-white/8 border-b pb-4 last:border-b-0 last:pb-0"
                      >
                        <div className="mt-0.5 font-mono text-xs text-lime">{`0${index + 1}`}</div>
                        <p className="text-sm leading-7 text-ink-soft">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[36px] border border-line bg-panel p-4 shadow-[0_35px_100px_rgba(0,0,0,0.35)]">
              <div className="grid gap-4 lg:grid-cols-3">
                {shellColumns.map((column) => (
                  <article
                    key={column.label}
                    className="flex min-h-[360px] flex-col rounded-[28px] border border-white/8 bg-panel-strong p-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-lime">
                        {column.label}
                      </div>
                      <div className="h-2.5 w-2.5 rounded-full bg-lime/70" />
                    </div>
                    <h2 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-ink">
                      {column.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-ink-soft">{column.body}</p>
                    <div className="mt-auto space-y-3 pt-8">
                      {column.items.map((item) => (
                        <div
                          key={item}
                          className="rounded-[18px] border border-white/8 bg-black/10 px-3 py-3 text-sm text-ink-soft"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
