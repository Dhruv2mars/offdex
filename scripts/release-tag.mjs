import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const args = new Set(process.argv.slice(2));
const mobilePackage = JSON.parse(
  readFileSync(new URL("../apps/mobile/package.json", import.meta.url), "utf8")
);
const appConfig = JSON.parse(
  readFileSync(new URL("../apps/mobile/app.json", import.meta.url), "utf8")
);
const npmPackage = JSON.parse(
  readFileSync(new URL("../packages/npm/package.json", import.meta.url), "utf8")
);
const packageVersion = mobilePackage.version;
const appVersion = appConfig.expo?.version;
const npmVersion = npmPackage.version;

if (!packageVersion || packageVersion !== appVersion) {
  throw new Error(
    `apps/mobile/package.json version (${packageVersion}) must match apps/mobile/app.json version (${appVersion})`
  );
}

if (!packageVersion || packageVersion !== npmVersion) {
  throw new Error(
    `apps/mobile/package.json version (${packageVersion}) must match packages/npm/package.json version (${npmVersion})`
  );
}

const tag = `v${packageVersion}`;

if (args.has("--print")) {
  process.stdout.write(`${tag}\n`);
  process.exit(0);
}

execFileSync("git", ["tag", tag], { stdio: "inherit" });
execFileSync("git", ["push", "origin", tag], { stdio: "inherit" });
