import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const integrationsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicationPath = path.join(integrationsRoot, "publication.json");
const release = JSON.parse(await readFile(path.join(integrationsRoot, "release.json"), "utf8"));
const publication = JSON.parse(await readFile(publicationPath, "utf8"));

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

const publishedAt = argumentValue("--published-at");
if (!publishedAt || Number.isNaN(Date.parse(publishedAt)) || new Date(publishedAt).toISOString() !== publishedAt) {
  throw new Error("--published-at must be an exact ISO-8601 UTC timestamp, for example 2026-09-04T10:00:00.000Z");
}
if (publication.state !== "ready" || publication.published_at !== null) {
  throw new Error("publication.json must be in the ready state before recording publication");
}
if (publication.release_version !== release.release_version) throw new Error("publication and release versions differ");

const archivePath = path.join(integrationsRoot, "dist", "integrations", publication.artifact.filename);
const checksumPath = path.join(integrationsRoot, "dist", "integrations", publication.artifact.checksum_filename);
const archive = await readFile(archivePath);
const digest = createHash("sha256").update(archive).digest("hex");
const checksum = (await readFile(checksumPath, "utf8")).trim();
if (digest !== publication.artifact.sha256 || checksum !== `${digest}  ${publication.artifact.filename}`) {
  throw new Error("local release asset/checksum does not match publication.json; do not record publication");
}

publication.state = "published";
publication.published_at = publishedAt;
await writeFile(publicationPath, `${JSON.stringify(publication, null, 2)}\n`, "utf8");
console.log(`Recorded GitHub Release publication at ${publishedAt}; immutable bundle SHA-256 remains ${digest}`);
