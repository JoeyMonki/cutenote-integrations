# Authentication

CuteNote's remote MCP server uses OAuth 2.1 authorization code flow with PKCE. A compatible client discovers the authorization server, opens the CuteNote sign-in and consent page in a browser, and returns through the client's registered callback. Users must never paste an API key, authorization code, access token, refresh token, password, or cookie into chat.

## Discovery and endpoint contract

- MCP resource: `https://www.cutenote.app/mcp`
- Protected-resource metadata: `https://www.cutenote.app/.well-known/oauth-protected-resource/mcp`
- Authorization-server metadata: `https://www.cutenote.app/.well-known/oauth-authorization-server`
- Client registration: `https://www.cutenote.app/oauth/register`
- Authorization: `https://www.cutenote.app/oauth/authorize`
- Token exchange: `https://www.cutenote.app/oauth/token`
- Revocation: `https://www.cutenote.app/oauth/revoke`

An unauthenticated MCP request should return HTTP `401` with a `WWW-Authenticate` challenge pointing to protected-resource metadata. Clients should follow discovery instead of guessing endpoint URLs. Dynamic Client Registration is available for clients that require it.

## Scopes

| Scope | Checked by |
| --- | --- |
| `notes:read` | `get_generation_job`, `list_notes`, `get_note` |
| `notes:write` | `create_note` |
| `notes:export` | `export_note` |

The current authorization contract is a single fixed bundle: every authorization request must request all three scopes as `notes:read notes:write notes:export`. Order and whitespace are normalized, and duplicate entries are deduplicated. A request containing only `notes:read`, only another subset, an unknown scope, or a superset is rejected with OAuth `invalid_scope`. Per-tool checks remain in place as defense in depth; `oauth_scope_required` indicates that an accepted token record does not contain the scope checked by that tool. Incremental or least-privilege grants are not implemented, so clients must not attempt to add scopes one at a time.

## Token lifecycle

Access tokens expire after one hour. Refresh tokens rotate on use; replay of an old refresh token revokes that token family. A client should store tokens in its protected credential store, refresh through the OAuth flow, and reconnect when refresh or consent fails. Do not place tokens in MCP configuration files, environment examples, issue reports, logs, or prompts.

## What a compatible client needs

The client must support remote Streamable HTTP MCP, protected-resource and authorization-server discovery, browser authorization code + PKCE, a usable callback URI, secure token storage/refresh, and MCP tool discovery/invocation. If any capability is missing, consult the [compatibility policy](compatibility.md); do not transplant configuration keys from another client.
