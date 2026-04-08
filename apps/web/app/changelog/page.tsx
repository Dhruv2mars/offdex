import { githubReleasesUrl } from "../site-content";
import { fetchGitHubReleases, formatReleaseDate } from "./releases";

export const revalidate = 3600;

export default async function ChangelogPage() {
  const releases = await fetchGitHubReleases();
  const latestRelease = releases[0] ?? null;

  return (
    <main className="flex-1">
      <section className="mx-auto w-full max-w-[1200px] px-6 py-20 md:px-8 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="max-w-3xl">
            <span className="rounded-full bg-[#fafafa] px-[12px] py-[4px] font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-border">
              Changelog
            </span>
            <h1 className="mt-8 text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[64px] md:tracking-[-2.56px]">
              Latest releases
            </h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-[1.65] text-muted-foreground">
              Offdex release notes ship directly from GitHub. Every new tag lands
              here automatically, so this page stays aligned with the binaries
              and npm package users actually install.
            </p>
          </div>

          <aside className="rounded-[20px] bg-[#fafafa] p-6 shadow-card">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
              Release feed
            </p>
            <div className="mt-6 space-y-4">
              <div className="rounded-[14px] bg-background p-4 shadow-border">
                <p className="text-[14px] font-semibold text-foreground">
                  Source of truth
                </p>
                <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">
                  GitHub Releases drive the changelog and the Android download
                  target at the same time.
                </p>
              </div>
              <div className="rounded-[14px] bg-background p-4 shadow-border">
                <p className="text-[14px] font-semibold text-foreground">
                  Refresh window
                </p>
                <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">
                  The page revalidates every hour and falls back to GitHub if the
                  API is unavailable.
                </p>
              </div>
              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-[10px] bg-foreground px-4 py-3 text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
              >
                View all releases
              </a>
            </div>
          </aside>
        </div>

        {latestRelease ? (
          <div className="mt-12 rounded-[20px] bg-[#fafafa] p-6 shadow-card md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#0a72ef]">
                  Latest shipped
                </p>
                <h2 className="mt-3 text-[28px] font-semibold tracking-[-1.12px] text-foreground">
                  {latestRelease.title}
                </h2>
                <p className="mt-2 text-[15px] text-muted-foreground">
                  {latestRelease.tag} · {formatReleaseDate(latestRelease.publishedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href={latestRelease.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[10px] bg-background px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
                >
                  Read release
                </a>
                {latestRelease.androidDownloadUrl ? (
                  <a
                    href={latestRelease.androidDownloadUrl}
                    className="rounded-[10px] bg-foreground px-4 py-3 text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
                  >
                    Download APK
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-12 space-y-6">
          {releases.length > 0 ? (
            releases.map((release) => (
              <article
                key={release.tag}
                className="rounded-[20px] bg-background p-6 shadow-card md:p-8"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[26px] font-semibold tracking-[-1.04px] text-foreground">
                        {release.title}
                      </h2>
                      {release.isPrerelease ? (
                        <span className="rounded-full bg-[#fff0f7] px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#de1d8d]">
                          Prerelease
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[14px] text-muted-foreground">
                      {release.tag} · {formatReleaseDate(release.publishedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={release.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[10px] bg-[#fafafa] px-4 py-3 text-[14px] font-medium text-foreground shadow-border transition-colors hover:bg-white focus-ring"
                    >
                      Open on GitHub
                    </a>
                    {release.androidDownloadUrl ? (
                      <a
                        href={release.androidDownloadUrl}
                        className="rounded-[10px] bg-foreground px-4 py-3 text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
                      >
                        Download APK
                      </a>
                    ) : null}
                  </div>
                </div>
                <pre className="mt-6 whitespace-pre-wrap text-[15px] leading-[1.75] text-muted-foreground font-sans">
                  {release.body}
                </pre>
              </article>
            ))
          ) : (
            <div className="rounded-[20px] bg-[#fafafa] p-8 shadow-card">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-[#ff5b4f]">
                Release feed unavailable
              </p>
              <h2 className="mt-4 text-[28px] font-semibold tracking-[-1.12px] text-foreground">
                GitHub is still the canonical changelog
              </h2>
              <p className="mt-4 max-w-2xl text-[16px] leading-[1.65] text-muted-foreground">
                The live GitHub API did not return releases right now. Users can
                still read every published note and download artifacts from the
                release index.
              </p>
              <a
                href={githubReleasesUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex rounded-[10px] bg-foreground px-4 py-3 text-[14px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
              >
                View all releases
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
