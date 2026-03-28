import { describe, expect, test } from "bun:test";
import { mobileTabs, offdexTagline } from "../src/app-config";

describe("mobile app config", () => {
  test("keeps the product tagline stable", () => {
    expect(offdexTagline).toBe("Offdex: Codex mobile app.");
  });

  test("exposes the three primary shell tabs", () => {
    expect(mobileTabs).toEqual(["Chats", "Pairing", "Settings"]);
  });
});
