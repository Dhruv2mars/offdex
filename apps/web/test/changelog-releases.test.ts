import { describe, expect, test } from "bun:test";
import { formatReleaseDate, normalizeGitHubRelease } from "../app/(marketing)/changelog/releases";

describe("changelog release helpers", () => {
  test("normalizes GitHub release payloads for the changelog", () => {
    const release = normalizeGitHubRelease({
      tag_name: "v0.2.0",
      name: "Launch release",
      html_url: "https://github.com/Dhruv2mars/offdex/releases/tag/v0.2.0",
      published_at: "2026-04-09T08:00:00.000Z",
      prerelease: false,
      body: "First public release.",
      assets: [
        {
          name: "offdex-android.apk",
          browser_download_url:
            "https://github.com/Dhruv2mars/offdex/releases/download/v0.2.0/offdex-android.apk",
        },
      ],
    });

    expect(release.tag).toBe("v0.2.0");
    expect(release.title).toBe("Launch release");
    expect(release.publishedAt).toBe("2026-04-09T08:00:00.000Z");
    expect(release.androidDownloadUrl).toContain("offdex-android.apk");
  });

  test("formats release dates for readable changelog cards", () => {
    expect(formatReleaseDate("2026-04-09T08:00:00.000Z")).toBe("Apr 9, 2026");
  });
});
