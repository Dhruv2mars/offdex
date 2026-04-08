import { githubReleasesUrl } from "../site-content";
import { fetchGitHubReleases, formatReleaseDate } from "./releases";

export const revalidate = 3600;

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
        <div className="mt-8">
          <a
            href={githubReleasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-[6px] bg-background px-6 py-[12px] text-[15px] font-medium text-foreground shadow-border transition-colors hover:bg-[#fafafa] focus-ring"
          >
            View on GitHub
          </a>
        </div>
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
                      <div className="font-sans text-[15px] leading-[1.7] text-muted-foreground whitespace-pre-wrap break-words">
                        {release.body || "No release notes provided."}
                      </div>
                      
                      <div className="mt-8 flex flex-wrap gap-3">
                        <a
                          href={release.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[8px] bg-foreground px-4 py-[10px] text-[13px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
                        >
                          View on GitHub &rarr;
                        </a>
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
