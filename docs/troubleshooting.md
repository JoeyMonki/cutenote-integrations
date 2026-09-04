# Troubleshooting

## The client cannot add the server

Confirm that it supports a **remote Streamable HTTP MCP** URL, not only local `stdio` servers. Also confirm OAuth protected-resource discovery and browser PKCE support. If the client lacks one of these, its status may be `adapter_required` or `unsupported`; do not guess a configuration format.

## No browser window or callback fails

Allow the client to open the system browser, check that its callback URI is registered, and retry connection from the client. Do not copy the authorization URL or code into chat. Corporate browser policy, popup blocking, or a callback owned by another app can prevent completion.

## HTTP 401 or missing scope

Reconnect when the token is missing, expired, revoked, or cannot refresh. The current server accepts only the complete `notes:read notes:write notes:export` scope bundle; a subset such as `notes:read` is rejected with OAuth `invalid_scope`. If a tool returns `oauth_scope_required`, discard the incomplete grant and reconnect with the complete bundle. Incremental scope upgrades are not supported. Never solve a 401 by hard-coding a Bearer token.

## Tools do not appear

Reconnect the server and ask the client to refresh MCP tool discovery. The expected names are `create_note`, `get_generation_job`, `list_notes`, `get_note`, and `export_note`. There is no `ask_note`. If transport and OAuth succeed but these names are absent, record the client name/version and discovery response before reporting the issue.

## Generation appears stuck

Use the server-provided `poll_after_seconds`; back off for unchanged states and stop local waiting after `max_wait_seconds`. A client timeout does not cancel the server job. Resume later with the same `job_id`. Stop permanently on `completed`, `failed`, or `blocked`.

## Export link expired or image has multiple pages

Call `export_note` again for an expired signed URL. For paged long images, use `page_count` and deliver every URL from `download_urls`, in order. Do not retain signed URLs as permanent links.

## Stable errors

Clients should branch on `error.code`, including `invalid_input`, `unsupported_input`, `content_too_short`, `generation_job_not_found`, `note_not_found`, `artifact_format_unavailable`, `artifact_page_out_of_range`, and `oauth_scope_required`. An unknown server-side operation returns `cutenote_operation_failed` with a generic message. Do not expose internal logs or credentials in a support report.

## Before filing a report

Record the client name and exact version, operating system, compatibility status, affected tool, stable error code, and approximate time. Remove note content, private URLs, authorization headers, cookies, tokens, and signed download query strings. A confirmed public support URL is still a release TODO; until one is published, use only the support channel provided by the CuteNote website or the distribution channel where you received the integration.
