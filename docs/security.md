# Security and data handling

## Credential boundary

Authentication happens in the browser through OAuth 2.1 authorization code + PKCE. Integration packages contain the public MCP URL only and must not contain user credentials or server signing secrets. Clients should use protected credential storage and redact authorization headers, cookies, codes, tokens, and signed URL query strings from logs and reports.

OAuth authorization codes and tokens are stored by the service as SHA-256 digests. Access tokens expire after one hour, refresh tokens rotate on use, and reuse of an old refresh token revokes its family. Server signing keys remain server-only.

## User data access

- `create_note` sends user-selected input to CuteNote and creates a generation job and, on success, a note.
- `get_generation_job`, `list_notes`, and `get_note` read jobs or notes owned by the authorized account.
- `export_note` reads an owned note and creates a short-lived signed artifact URL.
- Ownership checks prevent one account from retrieving another account's note or job by ID.

Only provide content and URLs you are authorized to process. Public URL support does not grant permission to copy restricted or copyrighted material. Do not place secrets in note input.

## Downloads and retention

The signed artifact URLs are bearer-like capabilities valid for roughly 5–10 minutes. Anyone who receives an unexpired URL may be able to download that artifact, so do not publish or log it. Obtain a new link after expiry. This repository does not state a general account-data retention or deletion policy; those statements must wait for a confirmed public privacy policy.

## Third parties and review boundary

This integration repository documents the MCP boundary, not every internal processing dependency. A public privacy policy, service terms, support URL, security contact, subprocessors list, and status page remain explicit release TODOs. Do not infer them from this source tree or claim marketplace security review until the relevant platform completes it.

Run `npm run check` in the public checkout before distribution. Private-source maintainers may run the equivalent `npm run integrations:check` command. It checks publishable artifacts for common secret patterns, unsafe public URLs, syntax problems, and canonical Skill drift, but it is not a security audit.

## Logging boundary

Application events use structured metadata rather than request bodies or note contents. The shared server logger recursively redacts authorization headers, cookies, passwords, OAuth codes, access and refresh tokens, API keys, client/signing secrets, known raw-content fields, and query strings or fragments on URL fields. Embedded bearer credentials and common secret assignments in error messages are redacted before output. Callers must still avoid inventing new free-form fields for user content and must not use direct console logging for credentials or request bodies.

## Untrusted source boundary

Imported pages, transcripts, documents, note references, and model-produced HTML are untrusted data. Generation prompts place governing output and safety rules in higher-priority system messages, then place source material in a dedicated user message which the system rule declares entirely untrusted—including delimiter-like text and textual role claims inside that message. Extraction retains ordinary source text for faithful summaries while removing executable markup; a prompt-injection-like sentence in a document is not itself an instruction to CuteNote. Automated regression tests cover HTML notes, detailed Markdown, mind maps, note chat, delimiter-breakout attempts, and executable-markup removal. These controls reduce risk but do not make arbitrary model output trustworthy, so downstream HTML and structured-output validation remain required.
