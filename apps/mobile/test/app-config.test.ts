import { describe, expect, test } from "bun:test";
import {
  appBuildNumber,
  appVersion,
  mobileTabs,
  offdexDocsUrl,
  offdexFeedbackUrl,
  offdexIssuesUrl,
  offdexRepositoryUrl,
  offdexTagline,
} from "../src/app-config";

describe("mobile app config", () => {
  test("keeps the product tagline stable", () => {
    expect(offdexTagline).toBe("Offdex: Codex mobile app.");
  });

  test("exposes the three primary shell tabs", () => {
    expect(mobileTabs).toEqual(["Chats", "Machines", "Settings"]);
  });

  test("keeps app metadata aligned with the shipped build", () => {
    expect(appVersion).toBe("0.0.3");
    expect(appBuildNumber).toBe("3");
  });

  test("publishes Offdex support links instead of upstream Codex links", () => {
    expect(offdexRepositoryUrl).toBe("https://github.com/Dhruv2mars/offdex");
    expect(offdexIssuesUrl).toBe("https://github.com/Dhruv2mars/offdex/issues");
    expect(offdexDocsUrl).toBe("https://github.com/Dhruv2mars/offdex#readme");
    expect(offdexFeedbackUrl).toBe("https://github.com/Dhruv2mars/offdex/issues/new");
  });
});
