# Compatibility policy and matrix

Compatibility is recorded per named client **and exact version**. A source package or syntactically valid configuration does not prove runtime compatibility. The machine-readable source for this page is [`../compatibility.json`](../compatibility.json).

The matrix belongs to the integration release named by `integration_release`; it must match [`../release.json`](../release.json). Artifact-to-MCP version ranges are recorded in that release manifest and validated before packaging.

## Status definitions

| Status | Meaning |
| --- | --- |
| `verified` | The named client version passed the recorded end-to-end acceptance flow. |
| `compatible` | Required protocol capabilities are confirmed, but the complete acceptance flow was not rerun for this release. |
| `adapter_required` | An adapter or thin plugin is needed for one or more required capabilities. |
| `experimental` | A source artifact exists and passes static checks, but runtime behavior is unverified. |
| `unsupported` | Testing confirms the client lacks a required capability. |
| `unknown` | Current capabilities or behavior have not been established. |

## Current matrix

| Client | Status | Client version | `last_verified_at` | Source artifact / evidence |
| --- | --- | --- | --- | --- |
| Codex | `experimental` | unknown | never | `codex/cutenote`; static artifact checks only |
| Claude Code | `experimental` | unknown | never | `claude-code/cutenote`; static artifact checks only |
| WorkBuddy | `experimental` | unknown | never | `workbuddy/cutenote`; static artifact checks only |
| OpenClaw | `experimental` | unknown | never | `openclaw/config.jsonc`; static artifact checks only |
| Hermes Agent | `experimental` | unknown | never | `hermes/config.yaml`; static artifact checks only |
| TRAE | `unknown` | unknown | never | no package or recorded protocol test |
| Doubao | `unknown` | unknown | never | no package or recorded protocol test |
| PiAgent | `unknown` | unknown | never | no package or recorded protocol test |
| DeepSeek harness | `unknown` | unknown | never | no package or recorded protocol test |
| Other MCP-capable AI | `unknown` | unknown | never | evaluate each named client/version separately |

`never` in this human-readable table corresponds to JSON `null`; it is not a verification date.

## Promotion requirements

To become `verified`, record the client version and UTC date after testing all of the following against production:

1. Remote Streamable HTTP connection and OAuth metadata discovery.
2. Browser authorization code + PKCE and callback completion without pasted credentials.
3. Discovery of exactly the five documented CuteNote tools.
4. Long-image, mind-map, and detailed-Markdown generation with polling to a terminal state.
5. Listing/reading owned notes, PNG/Markdown/source export, paged downloads, and expired-link renewal.
6. Reauthorization or token refresh and safe handling of scope, ownership, and terminal errors.

Downgrade immediately when a current release fails a required capability. Use `adapter_required` only after identifying the missing capability and the proposed adapter boundary; use `unsupported` only with recorded evidence. Marketplace availability is tracked separately and never implied by this matrix.
