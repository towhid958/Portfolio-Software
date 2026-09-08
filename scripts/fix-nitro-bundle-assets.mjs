// Works around a family of Nitro/Rolldown bundling bugs (reproduced with
// nitro@3.0.260903-beta) where a dependency loads a real on-disk asset
// (JSON data, a CSS file, ...) via a runtime require()/readFileSync() call
// using a path relative to its own source location. When Nitro splits that
// dependency into its own vendor chunk under .vercel/output/.../_libs/, the
// call gets rewritten to use the chunk's *new* location instead - but the
// asset itself is never actually emitted into the build output, so the call
// 404s at runtime on Vercel (which has no node_modules at all). That throws
// during the SSR render, which TanStack Start/React swallows into a
// permanently-pending Suspense boundary instead of a visible 500, so it
// looks like a data/rendering bug rather than a crash - confirmed each time
// by invoking the built .vercel/output function directly with Node and
// reading the stack trace.
//
// Two shapes of this seen so far:
//  1. css-tree (via csso, used by the page builder's CSS minifier - see
//     src/lib/builder/styleGenerator.ts) and mdn-data (its dependency) load
//     JSON via CJS require() - both relative (./patch.json) and bare
//     package-specifier (mdn-data/css/*.json). Nitro rewrites these to
//     `createRequire(import.meta.url)("...")`.
//  2. jsdom (via isomorphic-dompurify) loads a real CSS file via
//     `fs.readFileSync(path.resolve(__dirname, "../../../browser/default-stylesheet.css"))`.
//     __dirname doesn't even exist in an ESM chunk, so this is a harder
//     crash (ReferenceError, not a 404) - but the same root cause.
//
// Rather than try to reconstruct the right file layout for each of these
// (which just kept revealing another one: fixing one relative path revealed
// another, then a bare-specifier one from a *different* nested copy of the
// same package, then this readFileSync/__dirname one), this inlines the
// real file's content directly into the bundle text - fully self-contained,
// no runtime file lookup of any kind. Nitro already does exactly this for
// other nested copies of the same packages (visible as `//#region
// node_modules/...` markers followed by a literal JSON.parse(...) in the
// same chunks) - this just extends that treatment to the copies it missed.
//
// Generalized (not hardcoded to any one package) via the `//#region
// node_modules/<path>` comments Nitro's bundler already emits above every
// inlined module: for each matched call, the nearest region comment
// identifies which real source file it logically belongs to, so the asset
// can be resolved and loaded from this project's own node_modules exactly
// as Node would have resolved it from that original location.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + "/..";
const functionsDir = path.join(rootDir, ".vercel", "output", "functions");

if (!existsSync(functionsDir)) {
  process.exit(0); // not a Vercel build, nothing to do
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (entry.endsWith(".mjs")) out.push(full);
  }
  return out;
}

const REGION_RE = /\/\/#region (node_modules\/\S+)/g;
// Matches: createRequire(import.meta.url)("target.json")
//      or: var require$2 = createRequire(import.meta.url);
//      or: require$2("target.json")  (varName call, resolved via the
//          origin recorded for that variable's assignment)
const INLINE_CALL_RE = /createRequire\(import\.meta\.url\)\(\s*(["'])((?:(?!\1).)+\.json)\1\s*\)/g;
// `var require$1 = createRequire(...)` when declared+assigned together, or
// a bare `require$1 = createRequire(...)` when hoisted (`var require$1, ...;`
// earlier, e.g. inside a function body) and assigned separately.
const ASSIGN_RE = /(?:var )?(require\$\d+) = createRequire\(import\.meta\.url\);/g;
// fs.readFileSync(path.resolve(__dirname, "relative/path"), { encoding: "utf-8" })
// - the exact variable names (fs$2, path$1, ...) vary per build.
const READFILE_RE =
  /[\w$]+\.readFileSync\(\s*[\w$]+\.resolve\(__dirname,\s*(["'])((?:(?!\1).)+)\1\)\s*,\s*\{\s*encoding:\s*(["'])[^"']*\3\s*\}\s*\)/g;
// __require.resolve("./relative/path") - just needs a real *path* to exist
// (require.resolve never reads/executes the target), used for things like
// spawning a worker_threads.Worker from a package's own helper script. The
// shared __require export is created once in _runtime.mjs via
// createRequire(import.meta.url), so unlike the chunk-local require$N
// cases above, relative paths through it resolve against _runtime.mjs's
// own directory, not the calling chunk's.
const RESOLVE_ONLY_RE = /__require\.resolve\(\s*(["'])((?:(?!\1).)+)\1\s*\)/g;
const RUNTIME_IMPORT_RE = /from\s+(["'])([^"']*_runtime\.mjs)\1/;

let totalFixed = 0;

function resolveRelative(originAbsPath, target) {
  // The region comment nearest a call is usually the file that call came
  // from, but a tiny module that got merged into its neighbor without
  // keeping its own region marker (e.g. a one-statement re-export file)
  // attributes to the wrong directory depth - so walk upward from the
  // recorded origin dir looking for the target, rather than trusting that
  // depth exactly.
  let dir = path.dirname(originAbsPath);
  for (let i = 0; i < 5; i++) {
    const candidate = path.resolve(dir, target);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

for (const file of walk(functionsDir)) {
  let content = readFileSync(file, "utf8");

  // Build a position -> origin-file lookup from the region comments.
  const regions = [];
  for (const m of content.matchAll(REGION_RE)) regions.push({ pos: m.index, origin: m[1] });
  function originAt(pos) {
    let best = null;
    for (const r of regions) {
      if (r.pos <= pos) best = r;
      else {
        // No preceding region (e.g. a one-statement file like version.js
        // merged in before the chunk's first region marker) - the nearest
        // following region is usually a sibling in the same source
        // directory, close enough for the parent-directory walk above.
        if (!best) best = r;
        break;
      }
    }
    return best?.origin ?? null;
  }

  // Record which origin file each require$N variable was created for.
  const varOrigins = new Map();
  for (const m of content.matchAll(ASSIGN_RE)) {
    varOrigins.set(m[1], originAt(m.index));
  }

  function resolveJson(origin, target) {
    if (!origin) return null;
    const originAbsPath = path.join(rootDir, origin);
    if (!existsSync(originAbsPath)) return null;
    try {
      if (target.startsWith(".")) {
        const jsonPath = resolveRelative(originAbsPath, target);
        return jsonPath ? JSON.parse(readFileSync(jsonPath, "utf8")) : null;
      }
      const req = createRequire(pathToFileURL(originAbsPath));
      return req(target);
    } catch (err) {
      console.warn(`[fix-nitro-bundle-assets] could not resolve ${target} from ${origin}: ${err.message}`);
      return null;
    }
  }

  let changed = false;

  content = content.replace(INLINE_CALL_RE, (full, _q, target, offset) => {
    const data = resolveJson(originAt(offset), target);
    if (data === null) return full;
    changed = true;
    totalFixed++;
    return `JSON.parse(${JSON.stringify(JSON.stringify(data))})`;
  });

  // Bare-specifier calls through a recorded require$N variable, e.g.
  // require$2("mdn-data/css/at-rules.json").
  for (const [varName, origin] of varOrigins) {
    const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const callRe = new RegExp(`${escapedVarName}\\(\\s*(["'])((?:(?!\\1).)+\\.json)\\1\\s*\\)`, "g");
    content = content.replace(callRe, (full, _q, target, offset) => {
      const data = resolveJson(origin, target);
      if (data === null) return full;
      changed = true;
      totalFixed++;
      return `JSON.parse(${JSON.stringify(JSON.stringify(data))})`;
    });
  }

  // fs.readFileSync(path.resolve(__dirname, "...")) reading a text asset -
  // __dirname doesn't exist in ESM at all, so this throws a ReferenceError
  // rather than a 404. Inline the file's real text content as a string
  // literal, same approach as the JSON cases above.
  content = content.replace(READFILE_RE, (full, _q1, target, _q2, offset) => {
    const origin = originAt(offset);
    if (!origin) return full;
    const originAbsPath = path.join(rootDir, origin);
    if (!existsSync(originAbsPath)) return full;
    const assetPath = resolveRelative(originAbsPath, target);
    if (!assetPath) {
      console.warn(`[fix-nitro-bundle-assets] could not resolve asset ${target} from ${origin}`);
      return full;
    }
    const text = readFileSync(assetPath, "utf8");
    changed = true;
    totalFixed++;
    return JSON.stringify(text);
  });

  // __require.resolve(...) calls: leave the code as-is, but make sure a
  // real file actually exists wherever it resolves to at runtime.
  const runtimeImportMatch = content.match(RUNTIME_IMPORT_RE);
  if (runtimeImportMatch) {
    const runtimeMjsAbsPath = path.resolve(path.dirname(file), runtimeImportMatch[2]);
    const requireAnchorDir = path.dirname(runtimeMjsAbsPath);
    for (const m of content.matchAll(RESOLVE_ONLY_RE)) {
      const target = m[2];
      const origin = originAt(m.index);
      if (!origin) continue;
      const originAbsPath = path.join(rootDir, origin);
      if (!existsSync(originAbsPath)) continue;
      const srcPath = resolveRelative(originAbsPath, target);
      if (!srcPath) {
        console.warn(`[fix-nitro-bundle-assets] could not resolve worker/asset path ${target} from ${origin}`);
        continue;
      }
      const destPath = path.resolve(requireAnchorDir, target);
      if (existsSync(destPath)) continue;
      mkdirSync(path.dirname(destPath), { recursive: true });
      writeFileSync(destPath, readFileSync(srcPath));
      totalFixed++;
      console.log(`[fix-nitro-bundle-assets] copied ${path.relative(rootDir, srcPath)} -> ${path.relative(rootDir, destPath)}`);
    }
  }

  if (changed) {
    writeFileSync(file, content);
    console.log(`[fix-nitro-bundle-assets] inlined asset load(s) in ${path.relative(rootDir, file)}`);
  }
}

if (totalFixed === 0) {
  console.log("[fix-nitro-bundle-assets] no broken asset loads found in build output - nothing to do (bug may be fixed upstream, or these deps weren't bundled this build)");
} else {
  console.log(`[fix-nitro-bundle-assets] inlined ${totalFixed} asset load call(s)`);
}
