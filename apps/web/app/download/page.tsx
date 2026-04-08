import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubRepoUrl,
  githubReleasesUrl,
} from "../site-content";

const cliPlatforms = ["macOS arm64/x64", "Linux arm64/x64", "Windows x64"];

const mobileCards = [
  {
    title: "Android APK",
    status: "Live",
    description:
      "Pull the latest signed Android build directly from GitHub Releases.",
    href: androidApkDownloadUrl,
    cta: "Download APK",
    tone: "bg-[#ebf5ff] text-[#0a72ef]",
  },
  {
    title: "iOS beta",
    status: "Private beta",
    description:
      "The native iOS app exists in the repo, but there is no public TestFlight link wired into the site yet.",
    href: `${githubRepoUrl}/tree/main/apps/mobile`,
    cta: "View mobile source",
    tone: "bg-[#fff0f7] text-[#de1d8d]",
  },
];

export default function DownloadPage() {
  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-[1200px] px-6 py-20 md:px-8 md:py-24">
        <div className="max-w-3xl">
          <span className="rounded-full bg-[#fafafa] px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-border">
            Download
          </span>
          <h1 className="mt-8 text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[64px] md:tracking-[-2.56px]">
            Install the bridge. Ship the clients.
          </h1>
          <p className="mt-6 text-[18px] leading-[1.7] text-muted-foreground">
            The landing page promises a local-first Codex workflow. This page is
            the direct install surface for the bridge CLI and the mobile clients
            that pair into it.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <section className="rounded-[24px] bg-background p-6 shadow-card md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Bridge CLI
                </p>
                <h2 className="mt-4 text-[30px] font-semibold tracking-[-1.2px] text-foreground">
                  Install once, then start on the machine that runs Codex.
                </h2>
                <p className="mt-4 text-[16px] leading-[1.7] text-muted-foreground">
                  The npm package is the public entrypoint. It downloads the
                  matching native bridge runtime from GitHub Releases for the
                  user&apos;s platform, then exposes the `offdex` command locally.
                </p>
              </div>
              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-[10px] bg-foreground px-4 py-3 text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
              >
                View release binaries
              </a>
            </div>

            <div className="mt-8 rounded-[18px] bg-[#fafafa] p-5 shadow-border">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Install command
              </p>
              <code className="mt-4 block overflow-x-auto text-[15px] leading-[1.8] text-foreground">
                {cliInstallCommand}
              </code>
              <p className="mt-4 text-[14px] leading-[1.65] text-muted-foreground">
                Then run <code>{bridgeStartCommand}</code> to expose pairing.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {cliPlatforms.map((platform) => (
                <span
                  key={platform}
                  className="rounded-full bg-[#fafafa] px-3 py-2 text-[13px] text-muted-foreground shadow-border"
                >
                  {platform}
                </span>
              ))}
            </div>
          </section>

          <aside className="rounded-[24px] bg-[#fafafa] p-6 shadow-card md:p-8">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Quick links
            </p>
            <div className="mt-5 space-y-3">
              <Link
                href="/docs"
                className="block rounded-[12px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
              >
                Read setup docs
              </Link>
              <Link
                href="/changelog"
                className="block rounded-[12px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
              >
                Track releases
              </Link>
              <a
                href={githubRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-[12px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
              >
                Open repository
              </a>
            </div>
          </aside>
        </div>

        <section className="mt-8 rounded-[24px] bg-background p-6 shadow-card md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Mobile apps
              </p>
              <h2 className="mt-4 text-[30px] font-semibold tracking-[-1.2px] text-foreground">
                Pair the bridge from your phone.
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-muted-foreground">
                Android ships as a direct release artifact today. iOS is still
                a private beta, so the page sets expectation instead of linking
                to a dead install target.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {mobileCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[20px] bg-[#fafafa] p-6 shadow-border"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">
                    {card.title}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${card.tone}`}
                  >
                    {card.status}
                  </span>
                </div>
                <p className="mt-4 text-[15px] leading-[1.7] text-muted-foreground">
                  {card.description}
                </p>
                <a
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex rounded-[10px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
                >
                  {card.cta}
                </a>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
