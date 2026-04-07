import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MOBILE_WORKSPACE = fileURLToPath(
  new URL("../apps/mobile/package.json", import.meta.url)
);
const requireFromMobile = createRequire(MOBILE_WORKSPACE);

export function patchReactNativeCSSExports(source) {
  const packageJson = JSON.parse(source);

  if (packageJson.exports["./style-collection"]) {
    return source;
  }

  packageJson.exports["./style-collection"] = {
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
  };

  return `${JSON.stringify(packageJson, null, 2)}\n`;
}

export function patchReactNativeCSSLightningcssLoader(source) {
  return source
    .replace(
      `lightningcssPath = require.resolve("lightningcss", {
      paths: [require.resolve("@expo/metro-config/package.json").replace("/package.json", "")]
    });`,
      'lightningcssPath = require.resolve("lightningcss");'
    )
    .replace(
      `lightningcssPath = require.resolve("lightningcss", {
      paths: [
        require
          .resolve("@expo/metro-config/package.json")
          .replace("/package.json", ""),
      ],
    });`,
      'lightningcssPath = require.resolve("lightningcss");'
    );
}

export function patchReactNativeCSSPackage() {
  const packageJsonPath = requireFromMobile.resolve("react-native-css/package.json");
  const packageRoot = dirname(packageJsonPath);
  const commonjsLoaderPath = join(
    packageRoot,
    "dist/commonjs/compiler/lightningcss-loader.js"
  );
  const moduleLoaderPath = join(
    packageRoot,
    "dist/module/compiler/lightningcss-loader.js"
  );
  const sourceLoaderPath = join(packageRoot, "src/compiler/lightningcss-loader.ts");
  const current = readFileSync(packageJsonPath, "utf8");
  const patched = patchReactNativeCSSExports(current);
  const commonjsLoader = readFileSync(commonjsLoaderPath, "utf8");
  const patchedCommonjsLoader =
    patchReactNativeCSSLightningcssLoader(commonjsLoader);
  const moduleLoader = readFileSync(moduleLoaderPath, "utf8");
  const patchedModuleLoader = patchReactNativeCSSLightningcssLoader(moduleLoader);
  const sourceLoader = readFileSync(sourceLoaderPath, "utf8");
  const patchedSourceLoader = patchReactNativeCSSLightningcssLoader(sourceLoader);

  const changed =
    patched !== current ||
    patchedCommonjsLoader !== commonjsLoader ||
    patchedModuleLoader !== moduleLoader ||
    patchedSourceLoader !== sourceLoader;

  if (!changed) {
    return {
      changed: false,
      packageJsonPath,
    };
  }

  writeFileSync(packageJsonPath, patched);
  writeFileSync(commonjsLoaderPath, patchedCommonjsLoader);
  writeFileSync(moduleLoaderPath, patchedModuleLoader);
  writeFileSync(sourceLoaderPath, patchedSourceLoader);

  return {
    changed: true,
    packageJsonPath,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = patchReactNativeCSSPackage();
  console.log(
    result.changed
      ? `[offdex] patched react-native-css exports in ${result.packageJsonPath}`
      : `[offdex] react-native-css exports already patched in ${result.packageJsonPath}`
  );
}
