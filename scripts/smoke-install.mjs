#!/usr/bin/env node
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

import {
  assetNameFor,
  checksumsAssetNameFor,
  targetForPlatform,
} from "../packages/npm/bin/install-lib.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const tempRoot = mkdtempSync(join(tmpdir(), "offdex-install-smoke-"));
const releaseDir = join(tempRoot, "release");
const packageDir = join(tempRoot, "package");
const packDir = join(tempRoot, "pack");
const globalPrefix = join(tempRoot, "global");
const installRoot = join(tempRoot, "install");
const npmPackageRoot = join(repoRoot, "packages", "npm");
const packageJsonPath = join(npmPackageRoot, "package.json");
const packageVersion = JSON.parse(readFileSync(packageJsonPath, "utf8")).version;
const tarballEnv = {
  ...process.env,
  OFFDEX_INSTALL_ROOT: installRoot,
};
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const bunCommand = process.platform === "win32" ? "bun.exe" : "bun";
const target = targetForPlatform();
const ext = process.platform === "win32" ? ".exe" : "";
const builtBinary = join(tempRoot, `offdex${ext}`);
const assetName = assetNameFor();
const checksumName = checksumsAssetNameFor();
const assetPath = join(releaseDir, assetName);
let globalLauncher = null;
let bridgeProcess = null;

mkdirSync(releaseDir, { recursive: true });
mkdirSync(packageDir, { recursive: true });
mkdirSync(packDir, { recursive: true });
mkdirSync(globalPrefix, { recursive: true });

run(
  bunCommand,
  [
    "build",
    "--compile",
    `--target=${target}`,
    "packages/bridge/src/cli.ts",
    `--outfile=${builtBinary}`,
  ],
  { cwd: repoRoot }
);

copyFileSync(builtBinary, assetPath);
writeFileSync(`${assetPath}.gz`, gzipSync(readFileSync(assetPath)));
writeFileSync(
  join(releaseDir, checksumName),
  `${sha256(assetPath)} *${assetName}\n${sha256(`${assetPath}.gz`)} *${assetName}.gz\n`
);

const packed = run(npmCommand, ["pack", ".", "--pack-destination", packDir], { cwd: npmPackageRoot, capture: true });
const tarball = lastNonEmptyLine(packed.stdout);
if (!tarball) {
  fail("npm pack did not return a tarball path");
}
run("tar", ["-xzf", join(packDir, tarball), "-C", packageDir], { cwd: npmPackageRoot });

const extractedRoot = join(packageDir, "package");
const launcher = join(extractedRoot, "bin", "offdex.js");
const installer = join(extractedRoot, "bin", "install.js");
const tarballPath = join(packDir, tarball);

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1");
  const path = join(releaseDir, decodeURIComponent(url.pathname.slice(1)));
  if (!existsSync(path)) {
    response.writeHead(404);
    response.end("not found");
    return;
  }
  response.writeHead(200);
  response.end(readFileSync(path));
});

await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
const { port } = server.address();
const releaseBaseUrl = `http://127.0.0.1:${port}`;

try {
  await runAsync(npmCommand, ["install", "-g", "--prefix", globalPrefix, tarballPath], {
    cwd: repoRoot,
    env: {
      ...tarballEnv,
      OFFDEX_RELEASE_BASE_URL: releaseBaseUrl,
    },
  });

  await runAsync(process.execPath, [installer], {
    cwd: repoRoot,
    env: {
      ...tarballEnv,
      OFFDEX_RELEASE_BASE_URL: releaseBaseUrl,
    },
  });

  const installedApp = join(installRoot, "bin", process.platform === "win32" ? "offdex.exe" : "offdex");
  const metaPath = join(installRoot, "install-meta.json");
  if (!existsSync(installedApp)) fail(`missing installed binary at ${installedApp}`);
  if (!existsSync(metaPath)) fail(`missing install metadata at ${metaPath}`);

  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  if (meta.version !== packageVersion) {
    fail(`expected installed version ${packageVersion}, got ${meta.version}`);
  }

  globalLauncher = process.platform === "win32"
    ? join(globalPrefix, "offdex.cmd")
    : join(globalPrefix, "bin", "offdex");

  if (!existsSync(globalLauncher)) fail(`missing global launcher at ${globalLauncher}`);

  const help = await runAsyncCapture(globalLauncher, ["--help"], {
    cwd: repoRoot,
    env: tarballEnv,
  });
  if (!help.stdout.includes("Offdex CLI") || !help.stdout.includes("offdex start")) {
    fail(`help output was not clear\n${help.stdout}\n${help.stderr}`);
  }

  const directHelp = await runAsyncCapture(process.execPath, [launcher, "start", "--help"], {
    cwd: repoRoot,
    env: tarballEnv,
  });
  if (!directHelp.stdout.includes("--control-plane-url")) {
    fail(`launcher help output missing CLI options\n${directHelp.stdout}\n${directHelp.stderr}`);
  }

  const bridgePort = await getFreePort();
  bridgeProcess = spawn(globalLauncher, ["start", "--mode", "demo", "--host", "127.0.0.1", "--port", String(bridgePort)], {
    cwd: repoRoot,
    env: tarballEnv,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32",
    shell: process.platform === "win32" && /\.cmd$/i.test(globalLauncher),
  });

  let stdout = "";
  let stderr = "";
  bridgeProcess.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });
  bridgeProcess.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  await waitFor(async () => {
    const response = await fetch(`http://127.0.0.1:${bridgePort}/health`);
    return response.ok;
  }, 10000);

  await waitFor(() => {
    return stdout.includes(`[offdex] started on http://127.0.0.1:${bridgePort}`) && stdout.includes("Pairing page:");
  }, 10000);

  if (!stdout.includes(`[offdex] started on http://127.0.0.1:${bridgePort}`) || !stdout.includes("Pairing page:")) {
    fail(`bridge startup output missing expected details\n${stdout}\n${stderr}`);
  }
} finally {
  if (bridgeProcess) {
    await stopProcess(bridgeProcess);
  }
  await new Promise((resolvePromise, rejectPromise) =>
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
  );
  cleanup();
}

console.log(`install smoke ok: ${process.platform}/${process.arch}`);

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function lastNonEmptyLine(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env || process.env,
    shell: process.platform === "win32" && /\.cmd$/i.test(command),
    stdio: options.capture ? "pipe" : "inherit",
  });
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed with code ${result.status ?? 1}\n${result.stderr || ""}`);
  }
  return result;
}

function runAsync(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: "inherit",
      shell: process.platform === "win32" && /\.cmd$/i.test(command),
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`${command} ${args.join(" ")} failed with code ${code ?? 1}`));
    });
  });
}

function runAsyncCapture(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: process.platform === "win32" && /\.cmd$/i.test(command),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", rejectPromise);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise({ stdout, stderr });
        return;
      }
      rejectPromise(new Error(`${command} ${args.join(" ")} failed with code ${code ?? 1}\n${stderr}`));
    });
  });
}

function stopProcess(child) {
  return new Promise((resolvePromise) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolvePromise();
      return;
    }

    const timeout = setTimeout(() => {
      if (process.platform !== "win32" && child.pid) {
        try {
          process.kill(-child.pid, "SIGKILL");
          return;
        } catch {
          // Fall through to the direct child kill.
        }
      }
      child.kill("SIGKILL");
    }, 2000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolvePromise();
    });
    if (process.platform !== "win32" && child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
      return;
    }
    child.kill("SIGTERM");
  });
}

async function waitFor(fn, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await fn()) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 200));
  }
  throw lastError || new Error(`timeout_after:${timeoutMs}`);
}

async function getFreePort() {
  const server = http.createServer((_request, response) => {
    response.writeHead(204);
    response.end();
  });
  await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : null;
  await new Promise((resolvePromise, rejectPromise) =>
    server.close((error) => (error ? rejectPromise(error) : resolvePromise()))
  );
  if (!port) {
    throw new Error("failed_port_allocation");
  }
  return port;
}

function cleanup() {
  try {
    rmSync(tempRoot, { force: true, recursive: true });
  } catch {}
}

function fail(message) {
  if (bridgeProcess) {
    try {
      bridgeProcess.kill("SIGTERM");
    } catch {}
  }
  cleanup();
  console.error(`offdex install smoke: ${message}`);
  process.exit(1);
}
