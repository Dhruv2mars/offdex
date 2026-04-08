import Link from "next/link";
import {
  androidApkDownloadUrl,
  bridgeStartCommand,
  cliInstallCommand,
  githubRepoUrl,
  githubReleasesUrl,
} from "../site-content";
import { TerminalBlock } from "../../components/terminal-block";

export default function DownloadPage() {
  return (
    <main className="flex-1 pb-32">
      {/* Hero Section */}
      <section className="relative mx-auto w-full max-w-[1200px] overflow-hidden px-6 pt-24 text-center md:px-8 md:pt-32">
        <div className="animate-fade-in relative z-10 mx-auto max-w-[900px]">
          <h1 className="text-[56px] font-semibold leading-[1.05] tracking-[-2.4px] md:text-[76px] md:tracking-[-2.88px] lg:text-[88px]">
            Download <br className="hidden md:block" /> Offdex.
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-[1.6] text-muted-foreground md:text-[20px]">
            Install the bridge CLI on your Mac, then get the mobile app to control Codex from anywhere.
          </p>
        </div>
      </section>

      {/* The Download Pipeline */}
      <section className="mx-auto w-full max-w-[1200px] mt-20 md:mt-32 px-6 md:px-8">
        <div className="grid gap-12 md:grid-cols-3 md:gap-8 lg:gap-12">
          
          {/* Bridge CLI */}
          <div className="relative group">
            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-[28px] items-center rounded-full bg-[#ebf5ff] px-3 font-mono text-[12px] font-semibold text-[#0a72ef]">01</span>
              <h3 className="text-[20px] font-semibold tracking-[-0.96px] text-foreground">Bridge CLI</h3>
              <div className="hidden h-[1px] flex-1 border-t border-dashed border-[#ebebeb] md:block" />
            </div>
            <p className="mb-8 text-[15px] leading-[1.6] text-muted-foreground">
              The global npm package is the public entrypoint. It downloads the matching native bridge runtime from GitHub Releases for your platform.
            </p>
            <div className="rounded-[12px] bg-background shadow-border overflow-hidden">
              <div className="flex h-10 items-center gap-2 border-b border-[#ebebeb] bg-[#fafafa] px-4">
                <div className="flex gap-2">
                  <div className="h-[10px] w-[10px] rounded-full bg-[#ff5f56]" />
                  <div className="h-[10px] w-[10px] rounded-full bg-[#ffbd2e]" />
                  <div className="h-[10px] w-[10px] rounded-full bg-[#27c93f]" />
                </div>
              </div>
              <div className="p-4 font-mono text-[13px] leading-[1.8] text-foreground">
                <span className="text-[#0a72ef]">$ </span>
                {cliInstallCommand}
                <br />
                <span className="text-[#0a72ef]">$ </span>
                {bridgeStartCommand}
              </div>
            </div>
            <a
              href={githubReleasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-foreground transition-colors hover:text-muted-foreground"
            >
              View GitHub Releases &rarr;
            </a>
          </div>

          {/* Android App */}
          <div className="relative group">
            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-[28px] items-center rounded-full bg-[#fff0f7] px-3 font-mono text-[12px] font-semibold text-[#de1d8d]">02</span>
              <h3 className="text-[20px] font-semibold tracking-[-0.96px] text-foreground">Android APK</h3>
              <div className="hidden h-[1px] flex-1 border-t border-dashed border-[#ebebeb] md:block" />
            </div>
            <p className="mb-8 text-[15px] leading-[1.6] text-muted-foreground">
              Pull the latest signed Android build directly from GitHub Releases. Once installed, simply scan the QR code from the Bridge CLI to pair.
            </p>
            <a
              href={androidApkDownloadUrl}
              className="group/card flex h-[120px] flex-col items-center justify-center rounded-[12px] bg-[#fafafa] shadow-border transition-all hover:-translate-y-1 hover:shadow-card focus-ring"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#de1d8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span className="font-medium text-foreground">Download latest APK</span>
            </a>
          </div>

          {/* iOS Beta */}
          <div className="relative group">
            <div className="mb-6 flex items-center gap-4">
              <span className="flex h-[28px] items-center rounded-full bg-[#ffefe5] px-3 font-mono text-[12px] font-semibold text-[#ff5b4f]">03</span>
              <h3 className="text-[20px] font-semibold tracking-[-0.96px] text-foreground">iOS Beta</h3>
            </div>
            <p className="mb-8 text-[15px] leading-[1.6] text-muted-foreground">
              The native iOS app exists in the repo, but there is no public TestFlight link yet. You can build it locally from the source.
            </p>
            <a
              href={`${githubRepoUrl}/tree/main/apps/mobile`}
              target="_blank"
              rel="noopener noreferrer"
              className="group/card flex h-[120px] flex-col items-center justify-center rounded-[12px] bg-[#fafafa] shadow-border transition-all hover:-translate-y-1 hover:shadow-card focus-ring"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5b4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
              <span className="font-medium text-foreground">View iOS source</span>
            </a>
          </div>

        </div>
      </section>
    </main>
  );
}
