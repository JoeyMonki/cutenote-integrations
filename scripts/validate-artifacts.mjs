import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertReleaseIdentity } from "./version-policy.mjs";

const integrationsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const productionOrigin = "https://www.cutenote.app";
const productionMcpUrl = `${productionOrigin}/mcp`;
const generatedPublicFiles = new Set(["PUBLIC-MANIFEST.json", "SHA256SUMS"]);
const ignoredStandaloneEntries = new Set([".git", "dist", "node_modules", ...generatedPublicFiles]);

const mcpConfigPaths = [
  "codex/cutenote/.mcp.json",
  "claude-code/cutenote/.mcp.json",
  "workbuddy/cutenote/mcp.json",
  "openclaw/config.jsonc",
  "hermes/config.yaml"
];

const requiredPublicDocs = {
  "README.md": ["https://www.cutenote.app/mcp", "## Five tools", "## Quick start", "README.zh-CN.md", "docs/compatibility.md", "official public source"],
  "README.zh-CN.md": ["https://www.cutenote.app/mcp", "## 五个工具", "## 快速安装", "README.md", "docs/compatibility.md", "官方来源"],
  "docs/authentication.md": ["OAuth 2.1", "PKCE", "notes:read", "notes:write", "notes:export"],
  "docs/tools.md": ["create_note", "get_generation_job", "list_notes", "get_note", "export_note"],
  "docs/starter-prompts.md": ["Video to long image", "Web page to Markdown", "Long text to mind map", "List notes", "Re-export"],
  "docs/troubleshooting.md": ["HTTP 401", "Tools do not appear", "Generation appears stuck", "Export link expired"],
  "docs/security.md": ["Credential boundary", "User data access", "signed artifact URLs"],
  "docs/data-flow.md": ["AI client", "authorization server", "MCP tool call", "Trust boundaries"],
  "docs/compatibility.md": ["verified", "compatible", "adapter_required", "experimental", "unsupported", "unknown", "last_verified_at", "integration_release", "release.json"],
  "PUBLISHING.md": ["Semantic Versioning", "cutenote-integrations-vMAJOR.MINOR.PATCH", "90 calendar days", "integrations:bundle", "integrations:bundle:verify"],
  "CHANGELOG.md": ["## [Unreleased]", "source baseline (GitHub source published; Release unpublished)", "public source repository is live"]
};

const compatibilityStatuses = new Set([
  "verified",
  "compatible",
  "adapter_required",
  "experimental",
  "unsupported",
  "unknown"
]);

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

function relative(file) {
  return path.relative(integrationsRoot, file).replaceAll("\\", "/");
}

function stripJsonComments(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function parseScalar(raw, source, lineNumber) {
  const value = raw.trim();
  if (value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner === "" ? [] : inner.split(",").map((item) => parseScalar(item, source, lineNumber));
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    if (value.startsWith('"')) {
      try {
        return JSON.parse(value);
      } catch (error) {
        throw new Error(`${source}:${lineNumber}: invalid quoted scalar (${error.message})`);
      }
    }
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (/[[\]{}]/.test(value)) {
    throw new Error(`${source}:${lineNumber}: unsupported or unbalanced flow collection`);
  }
  return value;
}

// The checked YAML artifacts deliberately use a small, portable subset: mappings,
// sequences, quoted/plain scalars, and inline scalar arrays. Parsing that subset here
// keeps the public artifact check dependency-free while still rejecting malformed YAML.
function parseYaml(value, source) {
  const lines = value.split(/\r?\n/).flatMap((raw, index) => {
    if (raw.trim() === "" || raw.trimStart().startsWith("#")) return [];
    if (raw.includes("\t")) throw new Error(`${source}:${index + 1}: tabs are not valid indentation`);
    const indent = raw.length - raw.trimStart().length;
    if (indent % 2 !== 0) throw new Error(`${source}:${index + 1}: indentation must use two-space steps`);
    return [{ indent, content: raw.trim(), lineNumber: index + 1 }];
  });

  function parseMappingEntry(content, lineNumber) {
    const match = content.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!match) throw new Error(`${source}:${lineNumber}: expected a mapping entry`);
    return { key: match[1], rawValue: match[2] ?? "" };
  }

  function parseBlock(start, indent) {
    if (start >= lines.length || lines[start].indent !== indent) {
      throw new Error(`${source}:${lines[start]?.lineNumber ?? 1}: invalid indentation`);
    }
    const sequence = lines[start].content.startsWith("- ");
    const output = sequence ? [] : {};
    let cursor = start;

    while (cursor < lines.length && lines[cursor].indent === indent) {
      const line = lines[cursor];
      if (line.content.startsWith("- ") !== sequence) {
        throw new Error(`${source}:${line.lineNumber}: cannot mix mapping and sequence entries at one level`);
      }

      if (sequence) {
        const item = line.content.slice(2).trim();
        if (item === "") {
          if (cursor + 1 >= lines.length || lines[cursor + 1].indent <= indent) {
            throw new Error(`${source}:${line.lineNumber}: sequence item has no value`);
          }
          const nested = parseBlock(cursor + 1, lines[cursor + 1].indent);
          output.push(nested.value);
          cursor = nested.next;
          continue;
        }
        if (/^[A-Za-z0-9_-]+:/.test(item)) {
          const entry = parseMappingEntry(item, line.lineNumber);
          const object = { [entry.key]: parseScalar(entry.rawValue, source, line.lineNumber) };
          cursor += 1;
          if (cursor < lines.length && lines[cursor].indent > indent) {
            const nested = parseBlock(cursor, lines[cursor].indent);
            if (Array.isArray(nested.value)) {
              throw new Error(`${source}:${lines[cursor].lineNumber}: mapping sequence item cannot merge a sequence`);
            }
            Object.assign(object, nested.value);
            cursor = nested.next;
          }
          output.push(object);
          continue;
        }
        output.push(parseScalar(item, source, line.lineNumber));
        cursor += 1;
        continue;
      }

      const entry = parseMappingEntry(line.content, line.lineNumber);
      cursor += 1;
      if (entry.rawValue !== "") {
        output[entry.key] = parseScalar(entry.rawValue, source, line.lineNumber);
        continue;
      }
      if (cursor >= lines.length || lines[cursor].indent <= indent) {
        throw new Error(`${source}:${line.lineNumber}: mapping key has no value`);
      }
      if (lines[cursor].indent !== indent + 2) {
        throw new Error(`${source}:${lines[cursor].lineNumber}: indentation skipped a level`);
      }
      const nested = parseBlock(cursor, lines[cursor].indent);
      output[entry.key] = nested.value;
      cursor = nested.next;
    }
    return { value: output, next: cursor };
  }

  if (lines.length === 0) return {};
  if (lines[0].indent !== 0) throw new Error(`${source}:${lines[0].lineNumber}: root must not be indented`);
  const parsed = parseBlock(0, 0);
  if (parsed.next !== lines.length) {
    throw new Error(`${source}:${lines[parsed.next].lineNumber}: unexpected indentation`);
  }
  return parsed.value;
}

function parseSkillFrontmatter(content, source) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new Error(`${source}: missing YAML frontmatter at the start of the file`);
  const frontmatter = parseYaml(match[1], `${source} frontmatter`);
  if (frontmatter.name !== "cutenote") throw new Error(`${source}: frontmatter name must be cutenote`);
  if (typeof frontmatter.description !== "string" || frontmatter.description.trim().length < 20) {
    throw new Error(`${source}: frontmatter description must be a meaningful string`);
  }
}

function validateLinks(content, source) {
  const links = content.match(/https?:\/\/[^\s<>"'`)\]]+/g) ?? [];
  for (const link of links) {
    let parsed;
    try {
      parsed = new URL(link);
    } catch {
      throw new Error(`${source}: malformed URL ${link}`);
    }
    const standardNamespace = parsed.href === "http://www.w3.org/2000/svg";
    if (parsed.protocol !== "https:" && !standardNamespace) {
      throw new Error(`${source}: public integration URLs must use HTTPS (${link})`);
    }
    if (parsed.username || parsed.password) throw new Error(`${source}: URL must not contain credentials (${link})`);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname) || /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(parsed.hostname)) {
      throw new Error(`${source}: local or private URL is not publishable (${link})`);
    }
  }
}

function validateNoSecrets(content, source) {
  const secretPatterns = [
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, "private key"],
    [/\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{16,}\b/, "provider API key"],
    [/\bgh[opusr]_[A-Za-z0-9]{20,}\b/, "GitHub token"],
    [/\bxox[baprs]-[A-Za-z0-9-]{16,}\b/, "Slack token"],
    [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/, "JWT"],
    [/(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)\s*[=:]\s*["']?(?!oauth\b|none\b|null\b|example\b|placeholder\b|your[_-])[^\s"']{8,}/i, "assigned credential"]
  ];
  for (const [pattern, label] of secretPatterns) {
    if (pattern.test(content)) throw new Error(`${source}: possible ${label} detected`);
  }
}

const files = await listFiles(integrationsRoot);
const contents = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")])));

for (const file of files) {
  const content = contents.get(file);
  const source = relative(file);
  if (file.endsWith(".json")) JSON.parse(content);
  if (file.endsWith(".jsonc")) JSON.parse(stripJsonComments(content));
  if (file.endsWith(".yaml") || file.endsWith(".yml")) parseYaml(content, source);
  if (file.endsWith("SKILL.md")) parseSkillFrontmatter(content, source);
  validateLinks(content, source);
  validateNoSecrets(content, source);
}

for (const configPath of mcpConfigPaths) {
  const absolute = path.join(integrationsRoot, ...configPath.split("/"));
  if (!contents.get(absolute)?.includes(productionMcpUrl)) {
    throw new Error(`${configPath}: missing production MCP URL ${productionMcpUrl}`);
  }
}

for (const [documentPath, requiredPhrases] of Object.entries(requiredPublicDocs)) {
  const absolute = path.join(integrationsRoot, ...documentPath.split("/"));
  const content = contents.get(absolute);
  if (content === undefined) throw new Error(`${documentPath}: required public document is missing`);
  for (const phrase of requiredPhrases) {
    if (!content.includes(phrase)) throw new Error(`${documentPath}: missing required public documentation phrase ${phrase}`);
  }
}

const compatibilityPath = path.join(integrationsRoot, "compatibility.json");
const compatibility = JSON.parse(contents.get(compatibilityPath));
if (compatibility.schema_version !== 1) throw new Error("compatibility.json: schema_version must be 1");
if (new Set(Object.keys(compatibility.status_definitions ?? {})).size !== compatibilityStatuses.size
  || [...compatibilityStatuses].some((status) => typeof compatibility.status_definitions?.[status] !== "string")) {
  throw new Error("compatibility.json: status_definitions must document every allowed status exactly once");
}
if (!Array.isArray(compatibility.clients) || compatibility.clients.length === 0) {
  throw new Error("compatibility.json: clients must be a non-empty array");
}

const releasePath = path.join(integrationsRoot, "release.json");
const release = JSON.parse(contents.get(releasePath));
if (release.schema_version !== 1) throw new Error("release.json: schema_version must be 1");
assertReleaseIdentity(release);
if (release.status !== "source_ready") throw new Error("release.json: local manifest status must remain source_ready until remote publication");
if (release.published_at !== null) throw new Error("release.json: published_at must remain null until remote publication");
if (compatibility.integration_release !== release.release_version) throw new Error("compatibility.json: integration_release must match release.json");
const integrationFileNames = files.map(relative);
if (!Array.isArray(release.bundle_files)
  || JSON.stringify(release.bundle_files) !== JSON.stringify([...new Set(integrationFileNames)].sort())) {
  throw new Error("release.json: bundle_files must be the sorted, complete integrations/ file allowlist");
}

const requiredVersionedArtifacts = ["mcp", "canonical_skill", "codex_plugin", "claude_plugin", "workbuddy_connector"];
for (const artifactName of requiredVersionedArtifacts) {
  const artifact = release.artifacts?.[artifactName];
  if (!artifact || artifact.version !== release.release_version) {
    throw new Error(`release.json: ${artifactName}.version must match release_version`);
  }
}
for (const artifactName of ["canonical_skill", "codex_plugin", "claude_plugin", "workbuddy_connector"]) {
  const artifact = release.artifacts[artifactName];
  if (artifact.requires_mcp !== ">=1.0.0 <2.0.0") throw new Error(`release.json: ${artifactName}.requires_mcp must declare the current MCP major`);
}
for (const artifactName of ["codex_plugin", "claude_plugin", "workbuddy_connector"]) {
  if (release.artifacts[artifactName].bundles_skill !== release.artifacts.canonical_skill.version) {
    throw new Error(`release.json: ${artifactName}.bundles_skill must match canonical_skill.version`);
  }
}

const codexManifestPath = path.join(integrationsRoot, "codex", "cutenote", ".codex-plugin", "plugin.json");
const claudeManifestPath = path.join(integrationsRoot, "claude-code", "cutenote", ".claude-plugin", "plugin.json");
const workbuddyManifestPath = path.join(integrationsRoot, "workbuddy", "cutenote", "connector-meta.json");
const versionedManifests = [
  ["codex plugin", codexManifestPath],
  ["Claude plugin", claudeManifestPath],
  ["WorkBuddy connector", workbuddyManifestPath]
];
for (const [label, manifestPath] of versionedManifests) {
  const manifest = JSON.parse(contents.get(manifestPath));
  if (manifest.version !== release.release_version) throw new Error(`${label}: version must match release.json`);
}

const changelog = contents.get(path.join(integrationsRoot, "CHANGELOG.md"));
if (!changelog.includes(`## [${release.release_version}]`)) throw new Error("CHANGELOG.md: current release_version needs an entry");
const compatibilityIds = new Set();
for (const client of compatibility.clients) {
  if (typeof client.id !== "string" || compatibilityIds.has(client.id)) throw new Error("compatibility.json: client ids must be unique strings");
  compatibilityIds.add(client.id);
  if (typeof client.name !== "string" || !compatibilityStatuses.has(client.status)) {
    throw new Error(`compatibility.json: ${client.id} has an invalid name or status`);
  }
  if (client.client_version !== null && typeof client.client_version !== "string") {
    throw new Error(`compatibility.json: ${client.id}.client_version must be a string or null`);
  }
  if (client.last_verified_at !== null && (typeof client.last_verified_at !== "string" || Number.isNaN(Date.parse(client.last_verified_at)))) {
    throw new Error(`compatibility.json: ${client.id}.last_verified_at must be an ISO date or null`);
  }
  if (client.status === "verified" && (client.client_version === null || client.last_verified_at === null)) {
    throw new Error(`compatibility.json: verified client ${client.id} requires client_version and last_verified_at`);
  }
  if (typeof client.evidence !== "string" || client.evidence.trim().length < 10) {
    throw new Error(`compatibility.json: ${client.id}.evidence must explain the status`);
  }
  if (client.artifact !== null) {
    const normalized = String(client.artifact).replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/$/, "");
    if (normalized.startsWith("../") || path.isAbsolute(normalized)) throw new Error(`compatibility.json: ${client.id}.artifact leaves integrations/`);
    const artifactExists = [...contents.keys()].some((file) => {
      const candidate = relative(file);
      return candidate === normalized || candidate.startsWith(`${normalized}/`);
    });
    if (!artifactExists) throw new Error(`compatibility.json: ${client.id}.artifact does not exist (${normalized})`);
  }
}

const codexManifest = JSON.parse(contents.get(codexManifestPath));
if (codexManifest.interface?.websiteURL !== `${productionOrigin}/`) {
  throw new Error("codex/cutenote/.codex-plugin/plugin.json: websiteURL must use the production origin");
}

console.log(`Validated ${files.length} integration artifacts: synchronized versions, JSON/JSONC, YAML, links, Skill frontmatter, production MCP URLs, and secret patterns; public documentation and compatibility records are complete.`);
