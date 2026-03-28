export default function Home() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-6 py-8 md:px-10 md:py-10">
        <div className="flex items-center justify-between">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.25em] text-lime uppercase">
            Offdex
          </div>
          <div className="text-sm text-ink-soft">Codex mobile app</div>
        </div>

        <div className="grid gap-12 pb-10 pt-16 md:grid-cols-[1.35fr_0.9fr] md:items-end">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="max-w-xl text-sm leading-6 text-ink-soft md:text-base">
                Local-first control for Codex, built for the device you actually
                carry all day.
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-balance md:text-7xl">
                Offdex: Codex on your phone, without the companion-app feel.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-ink-muted md:text-xl">
                Expo for speed. Native modules where they matter. Android-first
                reality, cross-platform discipline, and a product bar that aims
                for the feeling of an official OpenAI app.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm font-medium">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-ink">
                UX first
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-ink">
                Performance first
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-ink">
                Expo + native escape hatches
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-ink">
                Open source, no paywall
              </span>
            </div>
          </div>

          <div className="grid gap-4">
            <ValueCard
              title="Mobile-first core"
              body="The main app is React Native with Expo. Native code is fair game when it clearly improves speed, feel, or reliability."
            />
            <ValueCard
              title="Web in the same system"
              body="The web app starts as the landing surface now and leaves room for a fuller browser UI later without splitting the product in two."
            />
            <ValueCard
              title="Clean reset"
              body="This repo is the real start. No fork-driven product baggage, no paywall code, no pretending stale sync is good enough."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function ValueCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-panel p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-ink">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-ink-soft">{body}</p>
    </div>
  );
}
