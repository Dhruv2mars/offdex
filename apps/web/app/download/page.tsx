import {
  androidApkDownloadUrl,
  cliInstallCommand,
  githubRepoUrl,
} from "../site-content";
import { TerminalBlock } from "../../components/terminal-block";

export default function DownloadPage() {
  return (
    <main className="flex-1 pb-32">
      <section className="mx-auto w-full max-w-[800px] px-6 pt-24 pb-16 md:px-8 md:pt-32">
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
          Download
        </h1>
        <p className="mt-5 text-[18px] leading-[1.6] text-muted-foreground">
          Install the CLI on your host machine, then get the mobile app to connect.
        </p>

        <div className="mt-12 grid gap-6">
          {/* Bridge CLI */}
          <div className="flex flex-col gap-6 rounded-[12px] bg-background p-6 shadow-card md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ebf5ff] shadow-border">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a72ef" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </div>
              <div>
                <h2 className="text-[20px] font-semibold tracking-[-0.8px] text-foreground">Bridge CLI</h2>
                <p className="text-[14px] text-muted-foreground">macOS, Windows, Linux</p>
              </div>
            </div>
            <TerminalBlock command={cliInstallCommand} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Android */}
            <div className="flex flex-col rounded-[12px] bg-background p-6 shadow-card md:p-8">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0f7] shadow-border">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#de1d8d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <h2 className="text-[20px] font-semibold tracking-[-0.8px] text-foreground">Android</h2>
              <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">
                Download the latest signed APK directly to your device.
              </p>
              <div className="mt-8 flex flex-1 flex-col justify-end">
                <a
                  href={androidApkDownloadUrl}
                  className="flex w-full items-center justify-center rounded-[6px] bg-foreground px-4 py-[10px] text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
                >
                  Download APK
                </a>
              </div>
            </div>

            {/* iOS */}
            <div className="flex flex-col rounded-[12px] bg-background p-6 shadow-card md:p-8">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-[#ffefe5] shadow-border">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff5b4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
                  <path d="M10 2c1 .5 2 2 2 5" />
                </svg>
              </div>
              <h2 className="text-[20px] font-semibold tracking-[-0.8px] text-foreground">iOS Beta</h2>
              <p className="mt-2 text-[15px] leading-[1.6] text-muted-foreground">
                Build locally from source. Public TestFlight coming soon.
              </p>
              <div className="mt-8 flex flex-1 flex-col justify-end">
                <a
                  href={`${githubRepoUrl}/tree/main/apps/mobile`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-[6px] bg-[#fafafa] px-4 py-[10px] text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-[#f5f5f5] focus-ring"
                >
                  View Source
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}