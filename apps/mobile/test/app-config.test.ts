import { describe, expect, test } from "bun:test";
import {
  appBuildNumber,
  appVersion,
  mobileShellSections,
  offdexDocsUrl,
  offdexFeedbackUrl,
  offdexIssuesUrl,
  offdexRepositoryUrl,
  offdexTagline,
} from "../src/app-config";
import appJson from "../app.json";
import packageJson from "../package.json";

describe("mobile app config", () => {
  test("keeps the product tagline stable", () => {
    expect(offdexTagline).toBe("Offdex: Codex mobile app.");
  });

  test("exposes the chat-first mobile shell sections", () => {
    expect(mobileShellSections).toEqual(["New thread", "Projects", "Threads", "Settings"]);
  });

  test("keeps app metadata aligned with the shipped build", () => {
    expect(appVersion).toBe(packageJson.version);
    expect(appVersion).toBe(appJson.expo.version);
    expect(appBuildNumber).toBe(String(appJson.expo.android.versionCode));
  });

  test("publishes Offdex support links instead of upstream Codex links", () => {
    expect(offdexRepositoryUrl).toBe("https://github.com/Dhruv2mars/offdex");
    expect(offdexIssuesUrl).toBe("https://github.com/Dhruv2mars/offdex/issues");
    expect(offdexDocsUrl).toBe("https://github.com/Dhruv2mars/offdex#readme");
    expect(offdexFeedbackUrl).toBe("https://github.com/Dhruv2mars/offdex/issues/new");
  });
});
