import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const integrationsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalPath = path.join(integrationsRoot, "skills", "cutenote", "SKILL.md");
const copies = [
  path.join(integrationsRoot, "codex", "cutenote", "skills", "cutenote", "SKILL.md"),
  path.join(integrationsRoot, "claude-code", "cutenote", "skills", "cutenote", "SKILL.md"),
  path.join(integrationsRoot, "workbuddy", "cutenote", "skills", "cutenote", "SKILL.md")
];
const write = process.argv.includes("--write");
const canonical = await readFile(canonicalPath, "utf8");
const drifted = [];

for (const copyPath of copies) {
  const current = await readFile(copyPath, "utf8");
  if (current === canonical) continue;
  if (write) await writeFile(copyPath, canonical, "utf8");
  else drifted.push(path.relative(integrationsRoot, copyPath).replaceAll("\\", "/"));
}

if (drifted.length > 0) {
  console.error(`CuteNote Skill copies differ from skills/cutenote/SKILL.md:\n${drifted.join("\n")}`);
  console.error("Run: node integrations/scripts/sync-cutenote-skill.mjs --write");
  process.exitCode = 1;
} else {
  console.log(write ? "CuteNote Skill copies synchronized." : "CuteNote Skill copies are synchronized.");
}
