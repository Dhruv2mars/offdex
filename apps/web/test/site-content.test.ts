import { describe, expect, test } from "bun:test";
import { architecturePrinciples, siteTagline } from "../app/site-content";

describe("web site content", () => {
  test("keeps the public tagline aligned", () => {
    expect(siteTagline).toBe("Offdex: Codex mobile app.");
  });

  test("publishes four architecture principles", () => {
    expect(architecturePrinciples).toHaveLength(4);
  });
});
