# CuteNote integrations

> Turn a public video or web page, or your own long text, into a long-image note, mind map, or detailed Markdown—and retrieve and export existing notes from an AI client.

**MCP endpoint:** `https://www.cutenote.app/mcp`
**Transport:** remote Streamable HTTP
**Authentication:** OAuth 2.1 authorization code flow with PKCE in the browser; never paste a token into chat.

[中文说明](README.zh-CN.md) · [Website](https://www.cutenote.app/) · [Web installer](https://www.cutenote.app/ai-skill)

This public integration package is released under the [MIT License](LICENSE). It contains only Skill, MCP client configuration, plugin/connector metadata, public documentation, and release tooling; it does not contain the private CuteNote application source or Git history.

## Five tools

| Tool | What it does |
| --- | --- |
| `create_note` | Starts asynchronous note generation from text or a supported public URL. |
| `get_generation_job` | Polls a generation job until it completes, fails, or is blocked. |
| `list_notes` | Lists the signed-in user's latest notes. |
| `get_note` | Reads an owned note's metadata and requested content. |
| `export_note` | Exports PNG, Markdown, source text, or an explicitly requested legacy SVG. |

CuteNote deliberately does not expose an `ask_note` tool.

## Quick start

1. Prefer your AI client's official marketplace or plugin flow when one is published. The packages in this repository are source artifacts and do **not** mean a marketplace listing is live.
2. If the client supports remote Streamable HTTP MCP and browser OAuth, add `https://www.cutenote.app/mcp` as a server named `cutenote`.
3. Complete the CuteNote authorization page in the browser. Do not put API keys, access tokens, or refresh tokens in configuration or prompts.
4. Ask the client to list the five tools before creating content. Then try a [starter prompt](docs/starter-prompts.md).

Client-specific source artifacts are under [`codex/`](codex/), [`claude-code/`](claude-code/), [`workbuddy/`](workbuddy/), [`openclaw/`](openclaw/), and [`hermes/`](hermes/). Do not copy one client's configuration keys into another client.

## Compatibility

No client currently has a recorded end-to-end verification run in this repository. Existing packages have passed only static artifact checks, so their runtime status is conservatively marked `experimental`. Unpackaged clients remain `unknown` until their protocol support and current version are tested.

See the human-readable [compatibility matrix](docs/compatibility.md) and machine-readable [`compatibility.json`](compatibility.json). Statuses are `verified`, `compatible`, `adapter_required`, `experimental`, `unsupported`, and `unknown`; every row carries a client version and `last_verified_at` value or an explicit `null`.

## Documentation

- [Authentication](docs/authentication.md)
- [Tools and workflow](docs/tools.md)
- [Starter prompts](docs/starter-prompts.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Security and data handling](docs/security.md)
- [Data flow](docs/data-flow.md)
- [Compatibility policy and matrix](docs/compatibility.md)
- [Publishing, versioning, and source-of-truth policy](PUBLISHING.md)
- [Changelog](CHANGELOG.md)
- [`release.json` version manifest](release.json)

## Public links and ownership

- Website: [www.cutenote.app](https://www.cutenote.app/)
- Install guide: [www.cutenote.app/ai-skill](https://www.cutenote.app/ai-skill)
- Privacy policy: **TODO — no confirmed public URL yet**
- Terms of service: **TODO — no confirmed public URL yet**
- Support: **TODO — no confirmed public support URL yet**
- Service status: **TODO — no confirmed public status page yet**

The CuteNote team is the official source of these integration artifacts. The private product repository is the authoring source; this MIT-licensed package is designed to be published only as a one-way generated mirror. Its presence does not claim that a remote repository, package, or marketplace listing is already live. See [PUBLISHING.md](PUBLISHING.md).

## Validate a source checkout

```bash
npm run check
```

This checks version and canonical Skill drift, JSON/JSONC and supported YAML syntax, documentation structure, compatibility records, public link safety, production MCP URLs, Skill frontmatter, and common credential patterns.
