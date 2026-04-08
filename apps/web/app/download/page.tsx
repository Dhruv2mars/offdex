import {
  androidApkDownloadUrl,
  githubRepoUrl,
  githubReleasesUrl,
} from "../site-content";
import { PackageManagerTerminal } from "../../components/package-manager-terminal";

export default function DownloadPage() {
  return (
    <main className="flex-1 pb-32">
      {/* Header aligned exactly with Changelog and Docs */}
      <section className="mx-auto w-full max-w-[1000px] px-6 pt-24 pb-16 md:px-8 md:pt-32">
        <div className="max-w-[600px]">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
            Download Offdex
          </h1>
          <p className="mt-6 text-[18px] leading-[1.6] text-muted-foreground">
            Get the Offdex CLI for your host machine, and the client apps to connect.
          </p>
        </div>
      </section>

      {/* Settings-Pane Style Rows */}
      <section className="mx-auto w-full max-w-[1000px] px-6 md:px-8">
        <div className="border-t border-[#ebebeb]">
          
          {/* Row 1: CLI */}
          <div className="flex flex-col gap-6 border-b border-[#ebebeb] py-16 md:flex-row md:gap-12">
            <div className="w-full shrink-0 md:w-[220px]">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Host
                </span>
                <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">Offdex CLI</h2>
              </div>
              <p className="mt-4 text-[14px] text-muted-foreground">macOS, Linux, Windows</p>
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="mb-6 text-[16px] leading-[1.6] text-muted-foreground">
                The global npm package is the primary entrypoint. It automatically fetches the matching native runtime for your machine from GitHub Releases.
              </p>
              <div className="mb-6">
                <PackageManagerTerminal />
              </div>
              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-[14px] font-medium text-foreground transition-colors hover:text-muted-foreground focus-ring rounded-sm"
              >
                View GitHub Releases &rarr;
              </a>
            </div>
          </div>

          {/* Row 2: Mobile Apps */}
          <div className="flex flex-col gap-6 border-b border-[#ebebeb] py-16 md:flex-row md:gap-12">
            <div className="w-full shrink-0 md:w-[220px]">
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Client
                </span>
                <h2 className="text-[24px] font-semibold tracking-[-0.96px] text-foreground">Mobile Apps</h2>
              </div>
              <p className="mt-4 text-[14px] text-muted-foreground">Android, iOS</p>
            </div>
            
            <div className="min-w-0 flex-1">
              <p className="mb-6 text-[16px] leading-[1.6] text-muted-foreground">
                Download the signed Android APK directly to your device, or build the iOS app from source. A public iOS TestFlight is coming soon.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={androidApkDownloadUrl}
                  className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[6px] bg-foreground px-5 text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Android APK
                </a>
                <a
                  href={`${githubRepoUrl}/tree/main/apps/mobile`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-[40px] items-center justify-center gap-2 rounded-[6px] bg-background px-5 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-[#fafafa] focus-ring"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  iOS Source
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}