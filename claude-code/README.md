# CuteNote for Claude Code

This package includes the `/cutenote:cutenote` skill and the `cutenote` HTTP MCP server. It needs no API key, npm service, or local background process.

## Install this checkout

From Claude Code, add the directory containing the marketplace's `.claude-plugin/marketplace.json`, then install:

```text
/plugin marketplace add ./integrations
/plugin install cutenote@cutenote-integrations
```

The first path above is for the private development checkout. For an exported or downloaded public repository, use its root directory instead. Choose your intended installation scope when prompted. Reload plugins or restart Claude Code if requested. You can also test the self-contained plugin without registering a marketplace:

```sh
claude --plugin-dir ./integrations/claude-code/cutenote
```

After this marketplace manifest has been published to the public repository, GitHub installation uses:

```text
/plugin marketplace add JoeyMonki/cutenote-integrations
/plugin install cutenote@cutenote-integrations
```

The GitHub command does not work against a release or checkout that predates this manifest. This document does not claim publication or an official Anthropic directory listing.

## Connect and use

1. Open `/mcp`, select the CuteNote server, and follow the browser authorization prompt. Sign in to CuteNote yourself and approve the displayed permissions. Do not paste tokens into chat.
2. Ask to list your latest notes first. The server exposes `create_note`, `get_generation_job`, `list_notes`, `get_note`, and `export_note`; Claude Code may prefix the tool names.
3. Invoke `/cutenote:cutenote` and give it content to turn into a note. Creating a note is a separate user action, not an installation health check. Generation can consume account credits.
4. Wait for the generation job to succeed before exporting. Ask for Markdown, PNG, or another supported format and open the returned signed download link.

Do not also add a second manual CuteNote MCP server: it can duplicate tools and authorization entries. If authentication fails, use `/mcp` to reconnect; see [troubleshooting](../docs/troubleshooting.md).

## Validate before distribution

Run from the marketplace root (the `integrations` directory in development):

```sh
claude plugin validate .
claude plugin validate ./claude-code/cutenote
```

Schema validation and installing into an isolated configuration do not prove browser OAuth, generation, or downloads work in a signed-in Claude session. Keep those acceptance checks separate.

Reference: [Claude Code marketplaces](https://code.claude.com/docs/en/plugin-marketplaces) and [plugin MCP configuration](https://code.claude.com/docs/en/plugins-reference).
