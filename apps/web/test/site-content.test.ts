import { describe, expect, test } from "bun:test";
import {
  androidApkDownloadUrl,
  architecturePrinciples,
  githubReleasesUrl,
  siteTagline,
} from "../app/site-content";

describe("web site content", () => {
  test("keeps the public tagline aligned", () => {
    expect(siteTagline).toBe("Offdex: Codex mobile app.");
  });

  test("publishes four architecture principles", () => {
    expect(architecturePrinciples).toHaveLength(4);
  });

  test("publishes stable public Android download links", () => {
    expect(androidApkDownloadUrl).toBe(
      "https://github.com/Dhruv2mars/offdex/releases/latest/download/offdex-android.apk"
    );
    expect(githubReleasesUrl).toBe("https://github.com/Dhruv2mars/offdex/releases");
  });
});
