#!/usr/bin/env node
/*
 * Downloads and verifies the self-hosted assets used by the browser-local AI
 * column classifier (see src/qidDiscovery/aiSuggestions/).
 *
 *   npm run fetch:ai-assets
 *
 * - Model and tokenizer files are fetched once, from an exact Hugging Face
 *   commit, and verified against pinned SHA-256 hashes.
 * - The ONNX Runtime WASM binary is copied from the onnxruntime-web version
 *   installed with @huggingface/transformers (package-lock.json pins it).
 * - Everything lands in public/ai-assets/, which React Scripts copies verbatim
 *   into build/ and Nginx serves as static files. The browser never contacts
 *   Hugging Face or a CDN at inference time.
 *
 * Files that already exist with the expected hash are kept, so the script is
 * idempotent and works offline once the assets have been placed manually.
 */
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Keep in sync with src/qidDiscovery/aiSuggestions/modelConfig.js.
const MODEL_ID = "Xenova/nli-deberta-v3-xsmall";
const MODEL_REVISION = "2a4f614a701367a02d51389039afc998faeda637";
const MODEL_DTYPE = "q8";
const EXPECTED_ORT_VERSION = "1.22.0-dev.20250409-89f8206ba4";

const MODEL_FILES = [
  {
    file: "config.json",
    sha256: "ec0bd14cc28640326474399cd61d38ccd52b64900228799d0f81debda8c4bc53",
  },
  {
    file: "tokenizer.json",
    sha256: "a86f883318afa11c8c10466f1bf4efaeb6ded28a52cbe57217a8fa0d0a2a87df",
  },
  {
    file: "tokenizer_config.json",
    sha256: "d8d3bb123b99317634d5ee3d1d2d8b2ddb01510a0654687fc2639a5347a7291f",
  },
  {
    file: "onnx/model_quantized.onnx",
    sha256: "3fac2500c45c75af42c7711de0d1b93d59577456100208be0dc1f9e8811946b6",
  },
];

// onnxruntime-web's default ESM bundle (ort.bundle.min.mjs, which webpack
// resolves for @huggingface/transformers' web build) embeds the JSEP loader
// and fetches only this WASM binary. The .mjs loader is copied as well for
// configurations that load it separately.
const ORT_FILES = [
  {
    file: "ort-wasm-simd-threaded.jsep.wasm",
    sha256: "c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39",
  },
  {
    file: "ort-wasm-simd-threaded.jsep.mjs",
    sha256: "08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9",
  },
];

const FRONTEND_DIR = path.resolve(__dirname, "..");
const ASSET_DIR = path.join(FRONTEND_DIR, "public", "ai-assets");
const MODEL_DIR = path.join(ASSET_DIR, "models", ...MODEL_ID.split("/"));
const ORT_DIR = path.join(ASSET_DIR, "ort");
const HF_HOST = process.env.HF_ENDPOINT || "https://huggingface.co";

function sha256OfFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(filePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

async function hasExpectedHash(filePath, sha256) {
  if (!fs.existsSync(filePath)) return false;
  return (await sha256OfFile(filePath)) === sha256;
}

async function verifyOrThrow(filePath, sha256) {
  const actual = await sha256OfFile(filePath);
  if (actual !== sha256) {
    fs.rmSync(filePath, { force: true });
    throw new Error(
      `SHA-256 mismatch for ${path.relative(FRONTEND_DIR, filePath)}: ` +
        `expected ${sha256}, got ${actual}`
    );
  }
}

function getProxy() {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    ""
  );
}

function commandExists(command) {
  return (
    spawnSync("sh", ["-c", `command -v ${command}`], { stdio: "ignore" })
      .status === 0
  );
}

// Node's built-in fetch ignores HTTP(S)_PROXY. Behind a proxy (e.g. the
// Docker build in docker-compose.yml) curl or wget is used instead.
async function download(url, target) {
  const proxy = getProxy();
  if (!proxy) {
    const response = await fetch(url, { redirect: "follow" });
    if (!response.ok) {
      throw new Error(`Download failed (${response.status}) for ${url}`);
    }
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    return;
  }

  const env = { ...process.env, http_proxy: proxy, https_proxy: proxy };
  const [command, args] = commandExists("curl")
    ? ["curl", ["-fsSL", "-o", target, url]]
    : commandExists("wget")
    ? ["wget", ["-q", "-O", target, url]]
    : [null, null];
  if (!command) {
    throw new Error("A proxy is configured but neither curl nor wget is available.");
  }
  const result = spawnSync(command, args, { env, stdio: "inherit" });
  if (result.status !== 0) {
    fs.rmSync(target, { force: true });
    throw new Error(`Download failed (${command} exit ${result.status}) for ${url}`);
  }
}

async function downloadModelFile({ file, sha256 }) {
  const target = path.join(MODEL_DIR, file);
  if (await hasExpectedHash(target, sha256)) {
    console.log(`  ok        ${file}`);
    return;
  }

  const url = `${HF_HOST}/${MODEL_ID}/resolve/${MODEL_REVISION}/${file}`;
  console.log(`  download  ${file}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temporaryTarget = `${target}.part`;
  await download(url, temporaryTarget);
  await verifyOrThrow(temporaryTarget, sha256);
  fs.renameSync(temporaryTarget, target);
}

function findPackageDir(entryPoint) {
  let directory = path.dirname(entryPoint);
  while (!fs.existsSync(path.join(directory, "package.json"))) {
    const parent = path.dirname(directory);
    if (parent === directory) {
      throw new Error(`No package.json found above ${entryPoint}`);
    }
    directory = parent;
  }
  return directory;
}

function resolveOrtDistDir() {
  // onnxruntime-web is a dependency of @huggingface/transformers; resolve it
  // from there so a hoisted copy of a different version is never used.
  // Neither package exports "./package.json", so locate the package
  // directories from their resolved entry points.
  const transformersDir = findPackageDir(
    require.resolve("@huggingface/transformers", { paths: [FRONTEND_DIR] })
  );
  const ortPackageJson = path.join(
    findPackageDir(
      require.resolve("onnxruntime-web", { paths: [transformersDir] })
    ),
    "package.json"
  );
  const { version } = JSON.parse(fs.readFileSync(ortPackageJson, "utf8"));
  if (version !== EXPECTED_ORT_VERSION) {
    throw new Error(
      `Expected onnxruntime-web ${EXPECTED_ORT_VERSION}, found ${version}. ` +
        "Update EXPECTED_ORT_VERSION and ORT_FILES hashes together with " +
        "@huggingface/transformers."
    );
  }
  return path.join(path.dirname(ortPackageJson), "dist");
}

async function copyOrtFile(ortDistDir, { file, sha256 }) {
  const target = path.join(ORT_DIR, file);
  if (await hasExpectedHash(target, sha256)) {
    console.log(`  ok        ${file}`);
    return;
  }

  const source = path.join(ortDistDir, file);
  await verifyOrThrow(source, sha256);
  fs.mkdirSync(ORT_DIR, { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`  copy      ${file}`);
}

async function main() {
  console.log(`Model ${MODEL_ID}@${MODEL_REVISION} -> ${MODEL_DIR}`);
  for (const modelFile of MODEL_FILES) {
    await downloadModelFile(modelFile);
  }

  console.log(`ONNX Runtime WASM ${EXPECTED_ORT_VERSION} -> ${ORT_DIR}`);
  const ortDistDir = resolveOrtDistDir();
  for (const ortFile of ORT_FILES) {
    await copyOrtFile(ortDistDir, ortFile);
  }

  // The browser reads this manifest before loading the model, so a missing
  // or mismatched asset set is reported as "unavailable" instead of failing
  // inside ONNX Runtime (or silently receiving index.html from a SPA fallback).
  const manifest = {
    modelId: MODEL_ID,
    revision: MODEL_REVISION,
    dtype: MODEL_DTYPE,
    onnxruntimeWebVersion: EXPECTED_ORT_VERSION,
    files: [
      ...MODEL_FILES.map(({ file, sha256 }) => ({
        path: `models/${MODEL_ID}/${file}`,
        sha256,
      })),
      ...ORT_FILES.map(({ file, sha256 }) => ({
        path: `ort/${file}`,
        sha256,
      })),
    ],
  };
  fs.writeFileSync(
    path.join(ASSET_DIR, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  console.log("AI assets ready.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
