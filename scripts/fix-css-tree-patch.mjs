// Works around a Nitro/Rolldown bundling bug (reproduced with
// nitro@3.0.260903-beta) affecting css-tree (a dependency of csso, used by
// the page builder's CSS minifier - see src/lib/builder/styleGenerator.ts).
//
// css-tree's lib/data.js and lib/data-patch.js load JSON data files via
// plain CJS require() - both a local relative one (./patch.json) and bare
// package-specifier ones (mdn-data/css/*.json, resolved via Node's normal
// node_modules lookup). When Nitro splits css-tree into its own vendor
// chunk under .vercel/output/.../_libs/, it rewrites these into
// `createRequire(import.meta.url)("...")` calls - but the referenced files
// are never actually emitted into the build output, and Vercel's deployed
// function has no node_modules at all. So every one of these calls 404s at
// runtime: "Cannot find module '../data/patch.json'",
// "Cannot find module 'mdn-data/css/at-rules.json'", etc. That throws
// during the SSR render, which TanStack Start/React swallows into a
// permanently-pending Suspense boundary instead of a visible 500, so it
// looks like a data/rendering bug rather than a crash - confirmed by
// invoking the built .vercel/output function directly with Node and
// reading the stack trace.
//
// Rather than try to reconstruct the right file layout for each of these
// (which duplicated the bug: fixing one relative path revealed another,
// then a bare-specifier one from a *different* nested css-tree copy used
// by @asamuzakjp/dom-selector), this inlines the actual JSON data directly
// into the bundle text, replacing each require call with a JSON.parse of
// the real file's content - fully self-contained, no runtime file lookup
// of any kind. Nitro already does exactly this for other nested copies of
// the same packages (visible as `//#region node_modules/...` markers
// followed by a literal JSON.parse(...) in the same chunks) - this just
// extends that treatment to the copies it missed.
//
// Generalized (not hardcoded to css-tree) via the `//#region
// node_modules/<path>` comments Nitro's bundler already emits above every
// inlined module: for each createRequire(...)(...)-style call targeting a
// .json file, the nearest preceding region comment identifies which real
// package file the call logically belongs to, so the JSON can be resolved
// and loaded from this project's own node_modules exactly as Node would
// have resolved it from that original location.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
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

let totalFixed = 0;

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
        // directory, close enough for the parent-directory walk below.
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
        // The region comment nearest a require call is usually the file
        // that call came from, but a tiny module that got merged into its
        // neighbor without keeping its own region marker (e.g. a
        // one-statement re-export file) attributes to the wrong directory
        // depth - so walk upward from the recorded origin dir looking for
        // the target, rather than trusting that depth exactly.
        let dir = path.dirname(originAbsPath);
        for (let i = 0; i < 5; i++) {
          const jsonPath = path.resolve(dir, target);
          if (existsSync(jsonPath)) return JSON.parse(readFileSync(jsonPath, "utf8"));
          const parent = path.dirname(dir);
          if (parent === dir) break;
          dir = parent;
        }
        return null;
      }
      const req = createRequire(pathToFileURL(originAbsPath));
      return req(target);
    } catch (err) {
      console.warn(`[fix-css-tree-patch] could not resolve ${target} from ${origin}: ${err.message}`);
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

  if (changed) {
    writeFileSync(file, content);
    console.log(`[fix-css-tree-patch] inlined JSON requires in ${path.relative(rootDir, file)}`);
  }
}

if (totalFixed === 0) {
  console.log("[fix-css-tree-patch] no broken JSON requires found in build output - nothing to do (bug may be fixed upstream, or these deps weren't bundled this build)");
} else {
  console.log(`[fix-css-tree-patch] inlined ${totalFixed} JSON require call(s)`);
}
