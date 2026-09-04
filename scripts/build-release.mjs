import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { access, lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import yazl from "yazl";
import { assertReleaseIdentity } from "./version-policy.mjs";
import { normalizePublicFile } from "./content-policy.mjs";

const integrationsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const release = JSON.parse(await readFile(path.join(integrationsRoot, "release.json"), "utf8"));
assertReleaseIdentity(release);
const fixedMtime = new Date("1980-01-01T00:00:00.000Z");
const ignoredStandaloneEntries = new Set([".git", "dist", "node_modules", "PUBLIC-MANIFEST.json", "SHA256SUMS"]);

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

async function listFiles(directory, root = directory, resolvedRoot = null) {
  const trustedRoot = resolvedRoot ?? await realpath(root);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    const metadata = await lstat(absolute);
    const relative = path.relative(root, absolute).replaceAll("\\", "/");
    if (metadata.isSymbolicLink()) throw new Error(`${relative}: symbolic links or junctions are not allowed`);
    if (!metadata.isDirectory() && !metadata.isFile()) throw new Error(`${relative}: special filesystem entries are not allowed`);
    if (metadata.isFile() && metadata.nlink !== 1) throw new Error(`${relative}: hard-linked files are not allowed`);
    const resolved = await realpath(absolute);
    const resolvedRelative = path.relative(trustedRoot, resolved);
    if (resolvedRelative.startsWith("..") || path.isAbsolute(resolvedRelative)) {
      throw new Error(`${relative}: resolved path leaves the integration root`);
    }
    if (directory === root && ignoredStandaloneEntries.has(entry.name)) continue;
    if (metadata.isDirectory()) files.push(...await listFiles(absolute, root, trustedRoot));
    else files.push(absolute);
  }
  return files.sort();
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

function defaultArchivePath() {
  return path.join(integrationsRoot, "dist", "integrations", `${release.bundle_basename}.zip`);
}

async function verify(archivePath) {
  const checksumPath = `${archivePath}.sha256`;
  await access(archivePath);
  await access(checksumPath);
  const checksumText = (await readFile(checksumPath, "utf8")).trim();
  const match = checksumText.match(/^([a-f0-9]{64})  (.+)$/);
  if (!match) throw new Error(`${checksumPath}: expected '<sha256>  <filename>'`);
  if (match[2] !== path.basename(archivePath)) throw new Error(`${checksumPath}: filename does not match archive`);
  const actual = await sha256(archivePath);
  if (actual !== match[1]) throw new Error(`${archivePath}: SHA-256 mismatch`);
  console.log(`Verified ${path.basename(archivePath)} (${actual})`);
}

async function build(outputDirectory) {
  if (release.status !== "release_ready") {
    throw new Error("release.json must describe an immutable release_ready artifact");
  }
  await mkdir(outputDirectory, { recursive: true });
  const archivePath = path.join(outputDirectory, `${release.bundle_basename}.zip`);
  const files = await listFiles(integrationsRoot);
  const actualFiles = files.map((file) => path.relative(integrationsRoot, file).replaceAll("\\", "/"));
  const publicFiles = [...release.bundle_files, ...(release.repository_only_files ?? [])].sort();
  if (JSON.stringify(actualFiles) !== JSON.stringify(publicFiles)) {
    throw new Error("release.json file lists must be the sorted, complete integrations/ public file allowlist");
  }
  const zip = new yazl.ZipFile();
  const destination = createWriteStream(archivePath);
  zip.outputStream.pipe(destination);

  for (const relative of release.bundle_files) {
    const file = path.join(integrationsRoot, ...relative.split("/"));
    const archiveName = `${release.bundle_basename}/${relative}`;
    zip.addBuffer(normalizePublicFile(relative, await readFile(file)), archiveName, { mtime: fixedMtime, mode: 0o100644 });
  }
  zip.end();
  await once(destination, "close");

  const digest = await sha256(archivePath);
  await writeFile(`${archivePath}.sha256`, `${digest}  ${path.basename(archivePath)}\n`, "utf8");
  console.log(`Built ${archivePath}`);
  console.log(`SHA-256 ${digest}`);
}

if (process.argv.includes("--verify")) {
  await verify(argumentValue("--archive") ?? defaultArchivePath());
} else {
  const output = path.resolve(argumentValue("--output") ?? path.join(integrationsRoot, "dist", "integrations"));
  await build(output);
}
