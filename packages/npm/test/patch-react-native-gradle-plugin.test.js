import test from "node:test";
import assert from "node:assert/strict";
import { patchFoojayResolverVersion } from "../../../scripts/patch-react-native-gradle-plugin.mjs";

test("patches the React Native Foojay resolver to the Gradle 9 compatible release", () => {
  const before =
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0") }';
  const after = patchFoojayResolverVersion(before);

  assert.match(after, /version\("1\.0\.0"\)/);
  assert.doesNotMatch(after, /version\("0\.5\.0"\)/);
});

test("leaves already-patched content unchanged", () => {
  const current =
    'plugins { id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0") }';

  assert.equal(patchFoojayResolverVersion(current), current);
});
