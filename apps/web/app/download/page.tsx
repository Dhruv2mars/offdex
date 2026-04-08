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
    title: "Android",
    status: "APK Available",
    description: "Pull the latest signed Android build directly from GitHub Releases.",
    href: androidApkDownloadUrl,
    cta: "Download APK",
    tone: "bg-[#ebf5ff] text-[#0a72ef]",
  },
  {
    title: "iOS",
    status: "Private Beta",
    description: "The native iOS app exists in the repo, but there is no public TestFlight link yet.",
    href: `${githubRepoUrl}/tree/main/apps/mobile`,
    cta: "View Source",
    tone: "bg-[#fff0f7] text-[#de1d8d]",
  },
];

export default function DownloadPage() {
  return (
    <main className="flex-1 pb-32">
      <div className="mx-auto w-full max-w-[1000px] px-6 pt-24 text-center md:px-8 md:pt-32">
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
          Download Offdex
        </h1>
        <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-[1.65] text-muted-foreground">
          Install the local bridge CLI to authorize your machine, then pair your clients to securely access Codex from anywhere.
        </p>
      </div>

      <div className="mx-auto mt-16 w-full max-w-[1000px] px-6 md:mt-24 md:px-8">
        
        {/* CLI Terminal Hero Card */}
        <section className="overflow-hidden rounded-[16px] bg-background shadow-card">
          <div className="flex h-12 items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-5">
            <div className="flex gap-2">
              <div className="h-[10px] w-[10px] rounded-full bg-[#ff5f56]" />
              <div className="h-[10px] w-[10px] rounded-full bg-[#ffbd2e]" />
              <div className="h-[10px] w-[10px] rounded-full bg-[#27c93f]" />
            </div>
          </div>
          
          <div className="flex flex-col gap-8 p-6 md:flex-row md:items-center md:justify-between md:p-12">
            <div className="max-w-[400px]">
              <div className="flex items-center gap-3">
                <h2 className="text-[28px] font-semibold tracking-[-1.12px] text-foreground">Bridge CLI</h2>
              </div>
              <p className="mt-4 text-[16px] leading-[1.65] text-muted-foreground">
                The global npm package is the public entrypoint. It downloads the native bridge runtime for your OS from GitHub.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-2">
                {cliPlatforms.map((platform) => (
                  <span
                    key={platform}
                    className="rounded-[6px] border border-[#ebebeb] bg-[#fafafa] px-3 py-1.5 font-mono text-[11px] font-medium text-muted-foreground"
                  >
                    {platform}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full shrink-0 md:w-[380px]">
              <div className="rounded-[12px] bg-[#fafafa] p-4 shadow-border">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Install Command</p>
                <div className="mt-3 font-mono text-[13px] text-foreground">
                  <span className="text-[#0a72ef]">$ </span>{cliInstallCommand}
                </div>
              </div>
              <div className="mt-3 rounded-[12px] bg-[#fafafa] p-4 shadow-border">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Start Relay</p>
                <div className="mt-3 font-mono text-[13px] text-foreground">
                  <span className="text-[#de1d8d]">$ </span>{bridgeStartCommand}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <a
                  href={githubReleasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-[14px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-ring"
                >
                  View GitHub Releases &rarr;
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Mobile App Cards */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-8">
          {mobileCards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-[16px] bg-background p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover md:p-8 focus-ring"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">
                  {card.title}
                </h3>
                <span className={`rounded-full px-3 py-[4px] font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${card.tone}`}>
                  {card.status}
                </span>
              </div>
              <p className="mt-4 text-[16px] leading-[1.65] text-muted-foreground">
                {card.description}
              </p>
              <div className="mt-8 flex items-center font-medium text-foreground">
                <span className="group-hover:underline">{card.cta}</span>
                <span className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
