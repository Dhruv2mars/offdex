import test from "node:test";
import assert from "node:assert/strict";
import {
  patchReactNativeCSSExports,
  patchReactNativeCSSLightningcssLoader,
} from "../../../scripts/patch-react-native-css.mjs";

test("patches react-native-css to export the style-collection subpath", () => {
  const before = JSON.stringify(
    {
      name: "react-native-css",
      exports: {
        ".": {
          default: "./dist/module/index.js",
        },
      },
    },
    null,
    2
  );

  const after = JSON.parse(patchReactNativeCSSExports(before));

  assert.deepEqual(after.exports["./style-collection"], {
    source: "./src/native-internal/style-collection.ts",
    import: {
      types: "./dist/typescript/module/src/native-internal/style-collection.d.ts",
      default: "./dist/module/native-internal/style-collection.js",
    },
    require: {
      types:
        "./dist/typescript/commonjs/src/native-internal/style-collection.d.ts",
      default: "./dist/commonjs/native-internal/style-collection.js",
    },
  });
});

test("leaves react-native-css untouched once the export already exists", () => {
  const current = JSON.stringify(
    {
      exports: {
        "./style-collection": {
          default: "./dist/module/native-internal/style-collection.js",
        },
      },
    },
    null,
    2
  );

  assert.equal(patchReactNativeCSSExports(current), current);
});

test("patches react-native-css to resolve lightningcss directly", () => {
  const before = `
  try {
    lightningcssPath = require.resolve("lightningcss", {
      paths: [require.resolve("@expo/metro-config/package.json").replace("/package.json", "")]
    });
  } catch {
    // Intentionally left empty
  }
  `;

  const after = patchReactNativeCSSLightningcssLoader(before);

  assert.match(after, /lightningcssPath = require\.resolve\("lightningcss"\);/);
  assert.doesNotMatch(after, /@expo\/metro-config/);
});
