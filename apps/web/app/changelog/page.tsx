import { githubReleasesUrl } from "../site-content";
import { fetchGitHubReleases, formatReleaseDate } from "./releases";
import ReactMarkdown from "react-markdown";

export const revalidate = 3600;

function cleanReleaseBody(body: string) {
  if (!body) return "No release notes provided.";

  return body
    // Remove "Full Changelog" section completely
    .replace(/\*\*Full Changelog\*\*:.*$/is, "")
    // Remove "What's Changed" heading as it is redundant
    .replace(/## What's Changed\n/g, "")
    // Remove "New Contributors" section
    .replace(/## New Contributors.*$/is, "")
    // Strip contributor mentions ("by @username")
    .replace(/\s*by @[\w-]+\s*/g, " ")
    // Strip PR numbers ("in #123" or "(#123)")
    .replace(/\s*in #\d+/g, "")
    .replace(/\s*\(#\d+\)/g, "")
    // Strip direct PR URLs
    .replace(/\s*in https:\/\/github\.com\/[^\s]+/g, "")
    // Remove markdown links but keep their text label
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    // Clean up empty bullets or trailing spaces
    .replace(/(\* |- )\s*$/gm, "")
    .replace(/ +/g, " ") // Collapse multiple spaces
    .replace(/\n\s*\n\s*\n/g, "\n\n") // Max 2 newlines
    .trim();
}

export default async function ChangelogPage() {
  const releases = await fetchGitHubReleases();
  const latestRelease = releases[0] ?? null;

  return (
    <main className="flex-1 pb-32">
      {/* Header */}
      <section className="mx-auto w-full max-w-[800px] px-6 pt-24 pb-16 text-center md:px-8 md:pt-32">
        <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
          Changelog
        </h1>
        <p className="mx-auto mt-6 max-w-[600px] text-[18px] leading-[1.6] text-muted-foreground">
          Offdex release notes ship directly from GitHub. Every new tag lands here automatically, ensuring you stay aligned with the latest binaries.
        </p>
      </section>

      {/* Timeline */}
      <section className="mx-auto w-full max-w-[800px] px-6 md:px-8">
        {releases.length > 0 ? (
          <div className="relative border-l border-[#ebebeb] pl-8 ml-3 md:ml-4">
            {releases.map((release, index) => {
              const isLatest = index === 0;

              return (
                <article key={release.tag} className="relative mb-16 last:mb-0">
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[41px] top-1.5 h-4 w-4 rounded-full border-[3px] border-background shadow-border ${
                      isLatest ? "bg-[#0a72ef]" : "bg-[#ebebeb]"
                    }`}
                  />

                  {/* Release Content */}
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className={`text-[24px] font-semibold tracking-[-0.96px] ${isLatest ? "text-foreground" : "text-[#4d4d4d]"}`}>
                        {release.title}
                      </h2>
                      {release.isPrerelease ? (
                        <span className="rounded-full bg-[#fff0f7] px-[10px] py-[2px] font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#de1d8d]">
                          Prerelease
                        </span>
                      ) : null}
                      {isLatest ? (
                        <span className="rounded-full bg-[#ebf5ff] px-[10px] py-[2px] font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-[#0a72ef]">
                          Latest
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[14px] font-medium text-muted-foreground">
                    <span className="font-mono">{release.tag}</span>
                    <span>&middot;</span>
                    <span>{formatReleaseDate(release.publishedAt)}</span>
                  </div>

                  <div className={`mt-6 overflow-hidden rounded-[16px] bg-background shadow-card ${isLatest ? "ring-1 ring-[#0a72ef]/10" : ""}`}>
                    <div className="p-6 md:p-8">
                      <div className="font-sans text-[15px] leading-[1.65] text-muted-foreground [&_h1]:text-[18px] [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:tracking-[-0.8px] [&_h1]:mb-3 [&_h1]:mt-6 first:[&_h1]:mt-0 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:tracking-[-0.6px] [&_h2]:mb-3 [&_h2]:mt-6 first:[&_h2]:mt-0 [&_h3]:text-[15px] [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mb-2 [&_h3]:mt-4 [&_p]:mb-4 last:[&_p]:mb-0 [&_ul]:list-none [&_ul]:mb-4 [&_ul]:space-y-2 [&_li]:relative [&_li]:pl-4 before:[&_li]:absolute before:[&_li]:left-0 before:[&_li]:top-[0.6em] before:[&_li]:h-[4px] before:[&_li]:w-[4px] before:[&_li]:rounded-full before:[&_li]:bg-[#cccccc] [&_code]:rounded-[4px] [&_code]:bg-[#fafafa] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground [&_code]:border [&_code]:border-[#ebebeb] [&_pre]:bg-[#fafafa] [&_pre]:p-4 [&_pre]:rounded-[8px] [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#ebebeb] [&_pre]:mb-4 [&_pre_code]:border-none [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                        <ReactMarkdown>
                          {cleanReleaseBody(release.body)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[16px] bg-background p-12 text-center shadow-card">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ffefe5] shadow-border">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5b4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="mt-6 text-[20px] font-semibold tracking-[-0.8px] text-foreground">
              Release feed unavailable
            </h3>
            <p className="mt-3 text-[15px] text-muted-foreground">
              We couldn't load the releases from GitHub. You can still view them directly.
            </p>
            <a
              href={githubReleasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex rounded-[8px] bg-foreground px-5 py-[10px] text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
            >
              Go to GitHub
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
