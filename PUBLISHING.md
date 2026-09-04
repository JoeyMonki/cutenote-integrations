# Publishing and version policy for CuteNote integrations

> Status: the local version, MIT license, packaging, checksum, and migration rules are established. No remote public repository, GitHub Release, npm publication, marketplace listing, or remote publication automation is implied.

## Unified version contract

`release.json` is the machine-readable source of truth. The MCP server, canonical Skill, Codex plugin, Claude plugin, and WorkBuddy connector currently ship as one synchronized release train. Every versioned artifact must use the same Semantic Versioning (SemVer) value; the validator rejects drift between `release.json`, the MCP server declaration, packaged manifests, and `compatibility.json`.

- `PATCH` is for backwards-compatible fixes, documentation corrections, and behavior changes that preserve tool names and accepted schemas.
- `MINOR` is for backwards-compatible additions such as a new optional input, additive output field, new tool, or new client package.
- `MAJOR` is required when a tool is removed or renamed, a previously optional input becomes required, an accepted enum value is removed, an output field is removed or changes meaning/type, or OAuth/resource behavior becomes incompatible.

Canonical Skill wording may change in a patch release only when it continues to describe the same MCP contract. A Skill change that starts relying on additive MCP behavior is minor. A Skill change that cannot operate against the prior MCP major is major.

`release.json.status` remains `source_ready` and `published_at` remains `null` until a matching remote release is actually published. Local bundle generation does not change either field.

## Tags, archives, and changelog

- Stable tags use `cutenote-integrations-vMAJOR.MINOR.PATCH`.
- Release candidates use `cutenote-integrations-vMAJOR.MINOR.PATCH-rc.N`.
- Release archives use the tag stem plus `.zip`; checksum files use `.zip.sha256`.
- Every version must have a `CHANGELOG.md` entry. The entry must distinguish source-ready work from a remotely published release.
- A stable tag may be created only from the public mirror commit whose checked-in `release.json.release_tag` exactly matches the tag.

In the public checkout, build a deterministic local candidate with `npm run bundle` and verify its checksum with `npm run bundle:verify`. In the private authoring repository, the equivalent commands are `npm run integrations:bundle` and `npm run integrations:bundle:verify`. Rebuilding identical tracked inputs must produce the same SHA-256 checksum.

## Breaking schema migration window

A tool removal, rename, or breaking input/output schema change requires all of the following:

1. Announce deprecation in `CHANGELOG.md` and documentation in a backwards-compatible minor release.
2. Keep the old and replacement contract available together for at least one minor release **and** 90 calendar days.
3. Add migration guidance, client-visible deprecation text, compatibility evidence, and tests for both paths during the window.
4. Review usage telemetry without recording note content or credentials; extend the window when active clients have not migrated.
5. Remove the old contract only in the next major release. Emergency security removals may shorten the window, but must be documented with the reason, impact, and replacement path.

## Source-of-truth rule

The private CuteNote product repository owns every file published from `integrations/`. The future public `cutenote-integrations` repository is a distribution mirror, not a second authoring location.

- Make content changes only in the private repository.
- Edit only `integrations/skills/cutenote/SKILL.md` for shared Skill instructions, then run `node integrations/scripts/sync-cutenote-skill.mjs --write` to update packaged copies.
- Never copy public-repository changes back by hand. Reproduce a valid external fix in the private source, review it there, and publish a new snapshot.
- Protect the public default branch from direct pushes. A dedicated automation identity should be the only writer, apart from an audited emergency rollback.

## One-way publication flow

1. Change and review integration artifacts in the private repository.
2. Run `npm run check` in an exported/public checkout, or `npm run integrations:check` in the private authoring repository, plus the focused integration tests. Stop if versions or canonical Skill copies drift, syntax is invalid, a URL is unsafe, production MCP URLs are missing, frontmatter is incomplete, or a possible secret is detected.
3. Export only the allowlisted `integrations/` distribution files. Do not export application source, environment files, runtime data, internal deployment files, or Git history from the private repository.
4. Have automation create a commit in a temporary checkout of the public repository. The commit message must include an opaque internal source build/release ID and the artifact version. Never disclose the private repository URL or private commit SHA.
5. Open an automated public-repository pull request. Require its own validation workflow and human review before merge.
6. Tag the merged public commit and attach release archives/checksums only after platform-specific smoke tests pass.

The publication job should fail closed: unexpected files, deletions, validator failures, a dirty generated snapshot, or a non-fast-forward public branch must stop the run. It must never reconcile public and private trees bidirectionally.

## Release provenance requirements

Each public release must record:

- an opaque internal source build/release ID that does not reveal the private repository or commit SHA;
- the public mirror commit SHA;
- plugin/Skill version and release date;
- generated archive checksums;
- platforms smoke-tested for that release.

Public pull requests from contributors are welcome as proposals, but maintainers must apply accepted changes to the private source first. The next automated snapshot then carries the change outward and preserves a single provenance chain.

## Rollback

Rollback means republishing the last known-good private snapshot as a new public commit and release, then withdrawing affected marketplace versions when supported. Do not repair only the public mirror: that would create drift and make the next publication overwrite the emergency fix.

Remote repository creation, marketplace submission, credentials, and remote automation setup remain separate operational steps; this document intentionally does not perform or assume them. The exported source itself is licensed under MIT.
