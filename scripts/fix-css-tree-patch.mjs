// Works around a Nitro/Rolldown bundling bug (reproduced with
// nitro@3.0.260903-beta): css-tree's data/index.js does
// `require('./patch.json')`, a plain CJS relative require. When Nitro
// splits css-tree into its own vendor chunk under .vercel/output/.../_libs/,
// that require gets rewritten to `createRequire(import.meta.url)("../data/patch.json")`
// but the referenced patch.json is never actually emitted into the output -
// so the require 404s at runtime on Vercel. This crashes SSR (silently, into
// an empty Suspense boundary rather than a 500) for any page that calls
// minifyDocumentCss (the page builder's CSS minifier, which depends on
// csso -> css-tree). See src/lib/builder/styleGenerator.ts.
//
// Fix: after the Nitro build, find every emitted chunk that does this
// require and copy css-tree's real patch.json to wherever that chunk
// expects it (read the exact relative path out of the require call itself,
// rather than hardcoding the current _libs/ nesting depth, so this keeps
// working if Nitro's chunking changes).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const functionsDir = path.join(rootDir, ".vercel", "output", "functions");

if (!existsSync(functionsDir)) {
  process.exit(0); // not a Vercel build, nothing to do
}

const patchJsonSource = path.join(rootDir, "node_modules", "css-tree", "data", "patch.json");
if (!existsSync(patchJsonSource)) {
  console.warn("[fix-css-tree-patch] node_modules/css-tree/data/patch.json not found, skipping");
  process.exit(0);
}
const patchJsonContent = readFileSync(patchJsonSource);

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (entry.endsWith(".mjs")) out.push(full);
  }
  return out;
}

const REQUIRE_RE = /createRequire\(import\.meta\.url\)\(["']([^"']*patch\.json)["']\)/g;
let fixedCount = 0;

for (const file of walk(functionsDir)) {
  const content = readFileSync(file, "utf8");
  let match;
  REQUIRE_RE.lastIndex = 0;
  while ((match = REQUIRE_RE.exec(content))) {
    const relPath = match[1];
    const dest = path.resolve(path.dirname(file), relPath);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, patchJsonContent);
    console.log(`[fix-css-tree-patch] wrote ${path.relative(rootDir, dest)} (needed by ${path.relative(rootDir, file)})`);
    fixedCount++;
  }
}

if (fixedCount === 0) {
  console.log("[fix-css-tree-patch] no css-tree patch.json require found in build output - nothing to do (bug may be fixed upstream, or css-tree wasn't bundled this build)");
}
