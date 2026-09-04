# Claude Connector review materials

Status: local review draft only. No Anthropic form has been submitted and no directory approval or publication is claimed.

Official policy and connector guidance used for this draft:

- https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy
- https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp

## Server description

CuteNote is a remote Streamable HTTP MCP server at `https://www.cutenote.app/mcp`. It turns user-provided text and supported public content links into long-image notes, structured mind maps, or detailed Markdown. It also lists, reads, and exports notes owned by the authenticated CuteNote user. The five tools are `create_note`, `get_generation_job`, `list_notes`, `get_note`, and `export_note`.

The server uses browser OAuth authorization code flow with PKCE and accepts public dynamic clients. Users do not paste passwords, API keys, access tokens, or refresh tokens into Claude. The requested scopes are `notes:read`, `notes:write`, and `notes:export`.

## Security summary

- The production endpoint uses HTTPS and Streamable HTTP.
- OAuth authorization codes and tokens are stored server-side as SHA-256 digests; access tokens expire and refresh tokens rotate on use.
- Reusing an old refresh token or revoking either token revokes the complete token family.
- Tool access is scoped to the signed-in user; cross-user job and note lookups return a not-found result without disclosing resource metadata.
- `create_note` is a non-destructive, non-open-world write operation: it creates a note only in the authenticated user's CuteNote account. Retrieving a user-supplied public URL as input does not publish to or change the public internet. Poll, list, read, and export tools are read-only.
- Tool errors use stable public error codes and generic fallback messages; they must not expose credentials or internal debug payloads.
- Signed artifact URLs expire after roughly 5–10 minutes and can be replaced by calling `export_note` again.
- The MCP server does not instruct Claude to retrieve or execute behavioral instructions from remote content.

## Data flow and minimization

1. Claude sends only the selected tool arguments to the CuteNote MCP endpoint after user authorization.
2. CuteNote receives the submitted text or supported public URL and the requested output settings. For public URLs, CuteNote retrieves the source needed to produce the note.
3. CuteNote stores the generated note and source-derived content under the authenticated user account so it can be listed, read, and exported later.
4. Read and export calls return only the requested note fields or artifact. Large text is previewed with a signed complete-file URL instead of an unbounded inline response.
5. Tool results become part of the Claude conversation according to Anthropic's product behavior and retention terms; CuteNote's own handling must be disclosed by its public privacy policy.

CuteNote must not collect unrelated Claude conversation history, memory, conversation summaries, or unselected uploads. Logging must exclude OAuth credentials and avoid raw sensitive content except where strictly required and disclosed for service operation.

## Privacy and support materials still required

- Public privacy policy URL describing collection, processing, storage, retention, deletion, public-source retrieval, subprocessors, and user rights: `REQUIRED_EXTERNAL_PUBLIC_URL`
- Public terms URL: `REQUIRED_EXTERNAL_PUBLIC_URL`
- Public support and verified security-contact URL: `REQUIRED_EXTERNAL_PUBLIC_URL`
- Account and data deletion instructions: `REQUIRED_EXTERNAL_PUBLIC_URL`
- Standard reviewer account with sample data and no MFA or private-network dependency: `REQUIRED_EXTERNAL_REVIEW_ACCOUNT`
- Final logo in the format requested by the current review form: `REQUIRED_EXTERNAL_ASSET`

Never commit reviewer credentials to this repository.

## Eligibility risk requiring Anthropic confirmation

Anthropic's current Software Directory Policy restricts software whose primary service uses AI models to generate image, video, or audio, while allowing design-focused visual aids such as diagrams and charts. CuteNote produces visual notes and mind maps from user-supplied content, but a reviewer must confirm that this workflow qualifies for the visual-aid exception before a directory submission. Do not claim eligibility or submit until that interpretation is confirmed.

## Review scenarios

Run all cases in `review-test-scenarios.json` with dedicated, non-sensitive fixtures. In addition, verify OAuth denial, refresh-token replay rejection, revocation, expired artifact re-export, tool result size, and cross-user isolation. Record Claude surface, client version, operating system, date, and result; custom-connector success alone is not directory approval.

## External actions that remain blocked

An authorized person must publish the required policy/support pages, confirm category eligibility with Anthropic, create the standard test account, verify endpoint and domain ownership, capture the final logo, run real Claude Web/Desktop/Mobile tests, complete the server review form, accept applicable directory terms, and track review feedback. None of those actions is represented by this local draft.
