import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const MOBILE_WORKSPACE = fileURLToPath(
  new URL("../apps/mobile/package.json", import.meta.url)
);
const MOBILE_PACKAGE = JSON.parse(readFileSync(MOBILE_WORKSPACE, "utf8"));

export function patchFoojayResolverVersion(source) {
  return source.replace(
    'id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0")',
    'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")'
  );
}

export function patchReactNativeGradlePlugin() {
  const packageJsonPath = resolve(
    dirname(MOBILE_WORKSPACE),
    "../../node_modules/.bun",
    `@react-native+gradle-plugin@${MOBILE_PACKAGE.dependencies["react-native"]}`,
    "node_modules/@react-native/gradle-plugin/package.json"
  );
  const settingsPath = join(dirname(packageJsonPath), "settings.gradle.kts");
  const current = readFileSync(settingsPath, "utf8");
  const patched = patchFoojayResolverVersion(current);

  if (patched === current) {
    return {
      changed: false,
      settingsPath,
    };
  }

  writeFileSync(settingsPath, patched);

  return {
    changed: true,
    settingsPath,
  };
}

if (import.meta.main) {
  const result = patchReactNativeGradlePlugin();
  console.log(
    result.changed
      ? `[offdex] patched React Native Gradle plugin Foojay resolver in ${result.settingsPath}`
      : `[offdex] React Native Gradle plugin already patched in ${result.settingsPath}`
  );
}
