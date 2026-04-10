import { githubReleasesUrl } from "../site-content";
import { fetchGitHubReleases, formatReleaseDate } from "./releases";
import ReactMarkdown from "react-markdown";

export const revalidate = 3600;

function cleanReleaseBody(body: string) {
  if (!body) return "No release notes provided.";

  const cleaned = body
    // Remove "Full Changelog" section completely
    .replace(/\*\*Full Changelog\*\*:[\s\S]*$/i, "")
    // Remove "What's Changed" heading as it is redundant
    .replace(/## What's Changed\n/g, "")
    // Remove "New Contributors" section
    .replace(/## New Contributors[\s\S]*$/i, "")
    // Strip contributor mentions ("by @username")
    .replace(/\s*by @[\w-]+\s*/g, " ")
    // Strip PR numbers ("in #123" or "(#123)")
    .replace(/\s*in #\d+/g, "")
    .replace(/\s*\(#\d+\)/g, "")
    // Strip direct PR URLs
    .replace(/\s*in https:\/\/github\.com\/[^\s]+/g, "")
    // Remove markdown links but keep their text label
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .trim();

  // Extract list items to categorize them
  const lines = cleaned.split('\n');
  const introLines: string[] = [];
  const listItems: string[] = [];

  for (const line of lines) {
    if (/^[\*\-]\s+/.test(line.trim())) {
      listItems.push(line.trim().replace(/^[\*\-]\s+/, ''));
    } else if (line.trim() !== '' && !/^#+\s/.test(line.trim())) {
      introLines.push(line.trim());
    }
  }

  // Categories
  const categories = {
    feat: { title: "### Features", items: [] as string[] },
    fix: { title: "### Bug Fixes", items: [] as string[] },
    perf: { title: "### Performance", items: [] as string[] },
    polish: { title: "### Polish", items: [] as string[] },
    chore: { title: "### Under the Hood", items: [] as string[] },
    other: { title: "### Other Updates", items: [] as string[] }
  };

  for (const item of listItems) {
    // Match conventional commit prefix (e.g. "feat(ui): message" or "feat: message")
    const match = item.match(/^([a-zA-Z]+)(?:\([^)]+\))?!?:(.*)$/);
    if (match) {
      const type = match[1].toLowerCase();
      const scopeMatch = item.match(/^[a-zA-Z]+\(([^)]+)\)!?:/);
      const scope = scopeMatch ? scopeMatch[1] : "";
      const desc = match[2].trim();
      const capitalizedDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
      
      let formattedItem = "* ";
      if (scope) {
        formattedItem += `**${scope}**: `;
      }
      formattedItem += capitalizedDesc;

      if (['feat', 'feature'].includes(type)) categories.feat.items.push(formattedItem);
      else if (['fix', 'bug'].includes(type)) categories.fix.items.push(formattedItem);
      else if (['perf', 'performance'].includes(type)) categories.perf.items.push(formattedItem);
      else if (['style', 'ui', 'design'].includes(type)) categories.polish.items.push(formattedItem);
      else if (['refactor', 'chore', 'ci', 'test', 'docs', 'build'].includes(type)) categories.chore.items.push(formattedItem);
      else categories.other.items.push(`* ${item}`);
    } else {
      categories.other.items.push(`* ${item}`);
    }
  }

  let result = introLines.join('\n\n');
  if (result) result += '\n\n';

  for (const key of ['feat', 'fix', 'perf', 'polish', 'chore', 'other'] as const) {
    const cat = categories[key];
    if (cat.items.length > 0) {
      result += `${cat.title}\n${cat.items.join('\n')}\n\n`;
    }
  }

  return result.trim() || "No release notes provided.";
}

const markdownStyles = [
  "font-sans text-[15px] leading-[1.6] text-muted-foreground break-words",
  // Headings
  "[&_h1]:text-[20px] [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:tracking-[-0.96px] [&_h1]:mb-4 [&_h1]:mt-8 first:[&_h1]:mt-0",
  "[&_h2]:text-[18px] [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:tracking-[-0.8px] [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:border-t [&_h2]:border-[#ebebeb] [&_h2]:pt-4 first:[&_h2]:mt-0 first:[&_h2]:border-t-0 first:[&_h2]:pt-0",
  "[&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:tracking-[-0.64px] [&_h3]:text-foreground [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:border-t [&_h3]:border-[#ebebeb] [&_h3]:pt-4 first:[&_h3]:mt-0 first:[&_h3]:border-t-0 first:[&_h3]:pt-0",
  // Paragraphs
  "[&_p]:mb-3 last:[&_p]:mb-0",
  // Lists
  "[&_ul]:list-none [&_ul]:mb-4 [&_ul]:space-y-1.5",
  "[&_li]:relative [&_li]:pl-4 before:[&_li]:absolute before:[&_li]:left-0 before:[&_li]:top-[0.6em] before:[&_li]:h-[4px] before:[&_li]:w-[4px] before:[&_li]:rounded-full before:[&_li]:bg-[#cccccc]",
  // Code & Pre
  "[&_code]:rounded-[4px] [&_code]:bg-[#fafafa] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-foreground [&_code]:border [&_code]:border-[#ebebeb]",
  "[&_pre]:bg-[#fafafa] [&_pre]:p-4 [&_pre]:rounded-[6px] [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[#ebebeb] [&_pre]:mb-6",
  "[&_pre_code]:border-none [&_pre_code]:bg-transparent [&_pre_code]:p-0"
].join(" ");

export default async function ChangelogPage() {
  const releases = await fetchGitHubReleases();

  return (
    <main className="flex-1 pb-32">
      {/* Header */}
      <section className="mx-auto w-full max-w-[1000px] px-6 pt-24 pb-16 md:px-8 md:pt-32">
        <div className="max-w-[600px]">
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-[-1.92px] md:text-[56px] md:tracking-[-2.4px]">
            Changelog
          </h1>
          <p className="mt-6 text-[18px] leading-[1.6] text-muted-foreground">
            Offdex release notes ship directly from GitHub. Every new tag lands here automatically, ensuring you stay aligned with the latest binaries.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="mx-auto w-full max-w-[1000px] px-6 md:px-8">
        {releases.length > 0 ? (
          <div className="relative">
            {/* The continuous faded line */}
            <div className="absolute top-2 bottom-0 left-[7px] w-[1px] bg-[#ebebeb] md:left-[180px] [mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_80%,transparent_100%)]" />

            {releases.map((release, index) => {
              const isLatest = index === 0;

              return (
                <article key={release.tag} className="relative mb-16 grid gap-6 last:mb-0 md:mb-24 md:grid-cols-[180px_1fr] md:gap-12">
                  {/* Left: Date & Tag (Desktop) */}
                  <div className="hidden pt-[6px] text-right pr-12 md:block">
                    <div className="text-[14px] font-medium text-foreground">
                      {formatReleaseDate(release.publishedAt)}
                    </div>
                    <div className="mt-1 font-mono text-[12px] text-muted-foreground">
                      {release.tag}
                    </div>
                  </div>

                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-[3px] top-[10px] h-[9px] w-[9px] rounded-full ring-[4px] ring-background md:left-[176px] ${
                      isLatest ? "bg-[#0a72ef]" : "bg-[#cccccc]"
                    }`}
                  />

                  {/* Right: Content */}
                  <div className="pl-8 md:pl-0">
                    {/* Mobile Date & Tag */}
                    <div className="mb-4 flex items-center gap-3 text-[13px] font-medium text-muted-foreground md:hidden">
                      <span className="font-mono">{release.tag}</span>
                      <span>&middot;</span>
                      <span>{formatReleaseDate(release.publishedAt)}</span>
                    </div>

                    {/* Title & Badges */}
                    <div className="flex flex-wrap items-center gap-3">
                      <h2
                        className={`text-[24px] font-semibold tracking-[-0.96px] ${
                          isLatest ? "text-foreground" : "text-[#4d4d4d]"
                        }`}
                      >
                        {release.title}
                      </h2>
                      {release.isPrerelease ? (
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#de1d8d]">
                          Prerelease
                        </span>
                      ) : null}
                      {isLatest ? (
                        <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#0a72ef]">
                          Latest
                        </span>
                      ) : null}
                    </div>

                    {/* Markdown Body */}
                    <div
                      className={`mt-6 overflow-hidden rounded-[12px] bg-background shadow-card ${
                        isLatest ? "ring-1 ring-[#0a72ef]/10" : ""
                      }`}
                    >
                      <div className="p-5 md:p-6">
                        <div className={markdownStyles}>
                          <ReactMarkdown>
                            {cleanReleaseBody(release.body)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[12px] bg-background p-12 text-center shadow-card md:ml-[180px]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ffefe5] shadow-border">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5b4f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="mt-6 text-[20px] font-semibold tracking-[-0.96px] text-foreground">
              Release feed unavailable
            </h3>
            <p className="mt-3 text-[15px] text-muted-foreground">
              We couldn&apos;t load the releases from GitHub. You can still view them directly.
            </p>
            <a
              href={githubReleasesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex rounded-[6px] bg-foreground px-6 py-[12px] text-[15px] font-medium text-background transition-colors hover:bg-[#333333] focus-ring"
            >
              Go to GitHub
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
