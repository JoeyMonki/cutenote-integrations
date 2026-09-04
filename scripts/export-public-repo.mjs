import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { normalizePublicFile } from "./content-policy.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultIntegrationsRoot = path.resolve(path.dirname(scriptPath), "..");
const defaultRepositoryRoot = path.resolve(defaultIntegrationsRoot, "..");
const defaultOutputRoot = path.join(defaultRepositoryRoot, "dist", "public-repo", "cutenote-integrations");

const allowedRootFiles = new Set([
  ".gitattributes",
  ".gitignore",
  "CHANGELOG.md",
  "LICENSE",
  "PUBLISHING.md",
  "README.md",
  "README.zh-CN.md",
  "compatibility.json",
  "package-lock.json",
  "package.json",
  "release.json"
]);
const allowedDirectories = new Set([
  "claude-code",
  "codex",
  "docs",
  "hermes",
  "marketplaces",
  "openclaw",
  "scripts",
  "skills",
  "workbuddy"
]);
const deniedSegments = new Set([".git", ".github", "app", "data", "deploy", "lib", "node_modules", "supabase"]);
const ignoredGeneratedSourceEntries = new Set([".git", "dist", "node_modules"]);
const deniedNames = /(?:^|\/)(?:\.env(?:\..*)?|.*\.(?:key|pem|p12|pfx|sqlite|db))$/i;
const absolutePathPattern = /(?:^|[\s`"'(])(?:[A-Za-z]:[\\/]|\/(?:Users|home|root|private|var\/folders)\/)/m;

function posixPath(value) {
  return value.replaceAll("\\", "/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function assertInside(parent, child, label) {
  const relative = path.relative(parent, child);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must be a child of ${parent}`);
  }
}

function validateAllowlistEntry(entry) {
  if (typeof entry !== "string" || entry === "") throw new Error("bundle_files entries must be non-empty strings");
  if (entry.includes("\\") || entry.startsWith("/") || path.posix.isAbsolute(entry)) {
    throw new Error(`unsafe allowlist path: ${entry}`);
  }
  const normalized = path.posix.normalize(entry);
  if (normalized !== entry || normalized === ".." || normalized.startsWith("../") || entry.includes("//")) {
    throw new Error(`allowlist path traversal or normalization mismatch: ${entry}`);
  }
  const segments = entry.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === ".." || deniedSegments.has(segment))) {
    throw new Error(`forbidden allowlist path: ${entry}`);
  }
  if (deniedNames.test(entry)) throw new Error(`sensitive file is not publishable: ${entry}`);
  if (segments.length === 1 ? !allowedRootFiles.has(entry) : !allowedDirectories.has(segments[0])) {
    throw new Error(`path is outside the public integration surface: ${entry}`);
  }
}

async function listSourceFiles(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const stat = await lstat(absolute);
    const relative = posixPath(path.relative(base, absolute));
    if (stat.isSymbolicLink()) throw new Error(`symbolic links are not publishable: ${relative}`);
    if (!stat.isDirectory() && !stat.isFile()) throw new Error(`unsupported filesystem entry: ${relative}`);
    if (directory === base && ignoredGeneratedSourceEntries.has(entry.name)) continue;
    if (stat.isDirectory()) files.push(...await listSourceFiles(absolute, base));
    else if (stat.isFile()) {
      if (stat.nlink !== 1) throw new Error(`hard-linked files are not publishable: ${relative}`);
      files.push(relative);
    }
  }
  return files.sort();
}

async function assertNoSymlinkComponents(root, relative) {
  let current = root;
  for (const segment of relative.split("/")) {
    current = path.join(current, segment);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`symbolic links are not publishable: ${relative}`);
  }
}

export async function validatePublicSource(integrationsRoot = defaultIntegrationsRoot) {
  const releasePath = path.join(integrationsRoot, "release.json");
  const release = JSON.parse(await readFile(releasePath, "utf8"));
  if (!Array.isArray(release.bundle_files)) throw new Error("release.json.bundle_files must be an array");
  const allowlist = release.bundle_files;
  for (const entry of allowlist) validateAllowlistEntry(entry);
  if (new Set(allowlist).size !== allowlist.length) throw new Error("release.json.bundle_files contains duplicates");
  if (JSON.stringify(allowlist) !== JSON.stringify([...allowlist].sort())) {
    throw new Error("release.json.bundle_files must be sorted");
  }
  for (const required of [".gitattributes", ".gitignore", "LICENSE", "README.md", "README.zh-CN.md", "package-lock.json", "package.json", "release.json", "scripts/export-public-repo.mjs"]) {
    if (!allowlist.includes(required)) throw new Error(`required public file is not allowlisted: ${required}`);
  }

  const actual = await listSourceFiles(integrationsRoot);
  if (JSON.stringify(actual) !== JSON.stringify(allowlist)) {
    const unexpected = actual.filter((file) => !allowlist.includes(file));
    const missing = allowlist.filter((file) => !actual.includes(file));
    throw new Error(`public source differs from strict allowlist; unexpected=${unexpected.join(",") || "none"}; missing=${missing.join(",") || "none"}`);
  }

  for (const relative of allowlist) {
    await assertNoSymlinkComponents(integrationsRoot, relative);
    const content = await readFile(path.join(integrationsRoot, ...relative.split("/")));
    const normalizedContent = normalizePublicFile(relative, content);
    if (absolutePathPattern.test(normalizedContent.toString("utf8"))) throw new Error(`local absolute path detected: ${relative}`);
  }
  return { release, allowlist };
}

function assertSafeOutput(outputRoot, repositoryRoot) {
  const resolved = path.resolve(outputRoot);
  const allowedDistRoot = path.resolve(repositoryRoot, "dist", "public-repo");
  const tempRoot = path.resolve(os.tmpdir());
  const inDist = resolved.startsWith(`${allowedDistRoot}${path.sep}`);
  const inTemp = resolved.startsWith(`${tempRoot}${path.sep}`);
  if (!inDist && !inTemp) throw new Error("output must be inside dist/public-repo or the operating-system temporary directory");
  if (path.parse(resolved).root === resolved) throw new Error("refusing filesystem-root output");
  return resolved;
}

export async function exportPublicRepository({
  integrationsRoot = defaultIntegrationsRoot,
  repositoryRoot = defaultRepositoryRoot,
  outputRoot = defaultOutputRoot
} = {}) {
  const resolvedOutput = assertSafeOutput(outputRoot, repositoryRoot);
  const { release, allowlist } = await validatePublicSource(integrationsRoot);
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  const temporaryRoot = await mkdtemp(path.join(path.dirname(resolvedOutput), ".cutenote-public-export-"));
  try {
    const manifestFiles = [];
    for (const relative of allowlist) {
      const source = path.resolve(integrationsRoot, ...relative.split("/"));
      assertInside(path.resolve(integrationsRoot), source, `source ${relative}`);
      const destination = path.join(temporaryRoot, ...relative.split("/"));
      await mkdir(path.dirname(destination), { recursive: true });
      const content = normalizePublicFile(relative, await readFile(source));
      await writeFile(destination, content, { flag: "wx" });
      manifestFiles.push({ path: relative, sha256: sha256(content), size: content.length });
    }

    const manifest = {
      schema_version: 1,
      name: "cutenote-integrations",
      version: release.release_version,
      release_tag: release.release_tag,
      license: "MIT",
      files: manifestFiles
    };
    const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
    await writeFile(path.join(temporaryRoot, "PUBLIC-MANIFEST.json"), manifestContent, "utf8");
    const checksumEntries = [
      ...manifestFiles.map((file) => `${file.sha256}  ${file.path}`),
      `${sha256(Buffer.from(manifestContent))}  PUBLIC-MANIFEST.json`
    ].sort();
    await writeFile(path.join(temporaryRoot, "SHA256SUMS"), `${checksumEntries.join("\n")}\n`, "utf8");

    const stagedFiles = await listSourceFiles(temporaryRoot);
    const expected = [...allowlist, "PUBLIC-MANIFEST.json", "SHA256SUMS"].sort();
    if (JSON.stringify(stagedFiles) !== JSON.stringify(expected)) throw new Error("staged public tree contains unexpected files");

    // The destination is constrained above. Replacement is deliberately one-way and contains no Git metadata.
    await rm(resolvedOutput, { recursive: true, force: true });
    await rename(temporaryRoot, resolvedOutput);
    console.log(`Exported public repository tree to ${resolvedOutput}`);
    console.log(`Included ${allowlist.length} allowlisted files plus PUBLIC-MANIFEST.json and SHA256SUMS`);
    return resolvedOutput;
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  await exportPublicRepository({ outputRoot: argumentValue("--output") ?? defaultOutputRoot });
}
