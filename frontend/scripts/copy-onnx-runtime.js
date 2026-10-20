#!/usr/bin/env node
/*
 * Copies the ONNX Runtime WASM files used by the browser-local AI column
 * classifier into public/ai-assets/ort/, so they are served from REA's own
 * origin. Runs automatically before `npm start` and `npm run build`; it needs
 * no network access.
 *
 * The files come from the onnxruntime-web version installed with
 * @huggingface/transformers (package-lock.json pins it) and are verified
 * against pinned SHA-256 hashes. AI model files are not part of the frontend:
 * administrators install them through the backend (QID Discovery
 * configuration).
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const FRONTEND_DIR = path.resolve(__dirname, "..");
const ORT_DIR = path.join(FRONTEND_DIR, "public", "ai-assets", "ort");
const EXPECTED_ORT_VERSION = "1.22.0-dev.20250409-89f8206ba4";

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

const sha256OfFile = (filePath) =>
  crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");

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

// onnxruntime-web is resolved from @huggingface/transformers so a hoisted
// copy of a different version is never used. Neither package exports
// "./package.json", so the package directories are found from their entry
// points.
function resolveOrtDistDir() {
  const transformersDir = findPackageDir(
    require.resolve("@huggingface/transformers", { paths: [FRONTEND_DIR] })
  );
  const ortDir = findPackageDir(
    require.resolve("onnxruntime-web", { paths: [transformersDir] })
  );
  const { version } = JSON.parse(
    fs.readFileSync(path.join(ortDir, "package.json"), "utf8")
  );
  if (version !== EXPECTED_ORT_VERSION) {
    throw new Error(
      `Expected onnxruntime-web ${EXPECTED_ORT_VERSION}, found ${version}. ` +
        "Update EXPECTED_ORT_VERSION and ORT_FILES hashes together with " +
        "@huggingface/transformers."
    );
  }
  return path.join(ortDir, "dist");
}

function main() {
  const distDir = resolveOrtDistDir();
  fs.mkdirSync(ORT_DIR, { recursive: true });
  for (const { file, sha256 } of ORT_FILES) {
    const target = path.join(ORT_DIR, file);
    if (fs.existsSync(target) && sha256OfFile(target) === sha256) continue;
    const source = path.join(distDir, file);
    if (sha256OfFile(source) !== sha256) {
      throw new Error(`SHA-256 mismatch for ${source}`);
    }
    fs.copyFileSync(source, target);
    console.log(`ONNX Runtime: copied ${file}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
