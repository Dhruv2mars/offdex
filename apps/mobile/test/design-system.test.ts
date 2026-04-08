import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

const mobileRoot = join(import.meta.dir, "..");

function readMobileFile(path: string) {
  return readFileSync(join(mobileRoot, path), "utf8");
}

function readPngSize(path: string) {
  const buffer = readFileSync(join(mobileRoot, path));
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

describe("mobile DESIGN.md system", () => {
  test("uses the light Vercel-style theme tokens", () => {
    const globals = readMobileFile("global.css");

    expect(globals).toContain("--background: #ffffff");
    expect(globals).toContain("--foreground: #171717");
    expect(globals).toContain("--shadow-border");
    expect(globals).toContain("rgba(0, 0, 0, 0.08) 0px 0px 0px 1px");
    expect(globals).not.toContain("#09090b");
    expect(globals).not.toContain("#22c55e");
  });

  test("loads Geist fonts for the native shell", () => {
    const rootLayout = readMobileFile("app/_layout.tsx");
    const packageJson = JSON.parse(readMobileFile("package.json"));

    expect(rootLayout).toContain("useFonts");
    expect(rootLayout).toContain("Geist_400Regular");
    expect(rootLayout).toContain("GeistMono_500Medium");
    expect(packageJson.dependencies).toHaveProperty("expo-font");
    expect(packageJson.dependencies).toHaveProperty("@expo-google-fonts/geist");
    expect(packageJson.dependencies).toHaveProperty("@expo-google-fonts/geist-mono");
  });

  test("uses light native app chrome and removes the stale App.tsx entry", () => {
    const appJson = JSON.parse(readMobileFile("app.json"));
    const tsconfig = readMobileFile("tsconfig.json");

    expect(appJson.expo.userInterfaceStyle).toBe("light");
    expect(appJson.expo.splash.backgroundColor).toBe("#ffffff");
    expect(appJson.expo.android.adaptiveIcon.backgroundColor).toBe("#ffffff");
    expect(existsSync(join(mobileRoot, "App.tsx"))).toBe(false);
    expect(tsconfig).not.toContain("App.tsx");
  });

  test("ships deterministic app assets with expected dimensions", () => {
    expect(existsSync(join(mobileRoot, "assets/offdex-mark.svg"))).toBe(true);
    expect(readPngSize("assets/icon.png")).toEqual({ width: 1024, height: 1024 });
    expect(readPngSize("assets/splash-icon.png")).toEqual({ width: 1024, height: 1024 });
    expect(readPngSize("assets/android-icon-background.png")).toEqual({ width: 512, height: 512 });
    expect(readPngSize("assets/android-icon-foreground.png")).toEqual({ width: 512, height: 512 });
    expect(readPngSize("assets/android-icon-monochrome.png")).toEqual({ width: 432, height: 432 });
    expect(readPngSize("assets/favicon.png")).toEqual({ width: 48, height: 48 });
  });

  test("uses the rebuilt app structure instead of the first-pass tab copy", () => {
    const tabs = readMobileFile("app/(tabs)/_layout.tsx");
    const runScreen = readMobileFile("app/(tabs)/index.tsx");
    const trustScreen = readMobileFile("app/(tabs)/machines.tsx");
    const controlScreen = readMobileFile("app/(tabs)/settings.tsx");

    expect(tabs).toContain('title: "Run"');
    expect(tabs).toContain('title: "Trust"');
    expect(tabs).toContain('title: "Control"');
    expect(tabs).not.toContain('title: "Chats"');
    expect(runScreen).toContain("Command deck");
    expect(runScreen).toContain("Resume active thread");
    expect(trustScreen).toContain("Trust center");
    expect(trustScreen).toContain("Pair a new machine");
    expect(controlScreen).toContain("Control room");
  });
});
