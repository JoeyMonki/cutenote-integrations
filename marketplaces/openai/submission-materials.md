# OpenAI public plugin submission materials

Status: local draft only. This file is not evidence of portal registration, review, approval, or publication.

Official submission guidance used for this draft:

- https://developers.openai.com/plugins/deploy/submission
- https://developers.openai.com/plugins/guides/optimize-metadata
- https://developers.openai.com/plugins/deploy/app-review

## Listing copy

- Plugin name: `CuteNote`
- Proposed category: `Productivity` (confirm that this option exists in the live portal before submission)
- Website: `https://www.cutenote.app/`
- Short description: `Turn text and supported public links into visual notes, mind maps, and Markdown.`
- Long description: `CuteNote turns user-provided text and supported public video or web links into long-image notes, structured mind maps, or detailed Markdown. It can also list and read notes owned by the signed-in user and re-export completed notes as PNG, Markdown, source text, or SVG where supported. Generation is asynchronous: the plugin starts a job, checks progress with safe polling, and exports only after completion. Users connect through browser OAuth with PKCE and never paste credentials into chat.`

## Release notes

Initial submission draft: adds the CuteNote OAuth MCP server and canonical CuteNote Skill. The plugin creates long-image, mind-map, and detailed-Markdown notes; polls asynchronous jobs; lists and reads reviewer-owned notes; and exports completed artifacts. The first release intentionally has no custom chat UI. Reviewer fixtures and credentials must be supplied through the portal and must work without MFA, SMS, email confirmation, or private-network access.

## MCP and authentication

- Submission type: skills plus MCP.
- MCP URL type: Universal.
- Production MCP URL: `https://www.cutenote.app/mcp`.
- Transport: Streamable HTTP.
- Authentication: OAuth authorization code with PKCE and Dynamic Client Registration.
- Requested scopes: `notes:read`, `notes:write`, `notes:export`.
- Custom UI CSP: not applicable to the first submission because it has no custom UI. Re-evaluate if UI is added.
- `create_note` annotations: write, non-destructive, non-idempotent, and not open-world. It creates a note only inside the authenticated user's CuteNote account. Reading a user-supplied public URL as source input does not change publicly visible internet state.
- Domain verification token: `REQUIRED_EXTERNAL_PORTAL_VALUE`; never commit the real token.
- Technical app/connection ID: `REQUIRED_EXTERNAL_PORTAL_VALUE`; do not invent an `.app.json` value before registration.

## Public URL and identity placeholders

The following must be completed with live, publisher-matching public URLs before submission:

- Support URL: `REQUIRED_EXTERNAL_PUBLIC_URL`
- Privacy policy URL: `REQUIRED_EXTERNAL_PUBLIC_URL`
- Terms URL: `REQUIRED_EXTERNAL_PUBLIC_URL`
- Verified developer or business identity: `REQUIRED_EXTERNAL_PLATFORM_IDENTITY`
- Country/region availability: `REQUIRED_EXTERNAL_LEGAL_DECISION`

Do not replace these placeholders until the pages are published and the submitting organization has confirmed them.

## First-release asset checklist

- Production-ready square CuteNote logo in the exact format and dimensions requested by the live portal. Do not infer dimensions from old documentation.
- Verify the logo remains legible on light and dark surfaces and contains no third-party marks.
- Use the existing `integrations/workbuddy/cutenote/icon.svg` only as a design source; export and review a dedicated final asset for OpenAI.
- The first release has no custom UI and will not submit screenshots. Do not capture or upload screenshots for this release.
- If custom UI is added in a future release, prepare UI screenshots only then, using a dedicated demo account and non-sensitive publisher-owned fixtures, and follow the live portal's exact asset requirements.
- Match the live portal's logo format, dimensions, file-size, and localization requirements before upload.

## Portal entry sources

- Starter prompts: `starter-prompts.json`
- Five positive and three negative tests: `review-test-cases.json`
- Canonical Skill: `../../skills/cutenote/SKILL.md`
- Packaged plugin: `../../codex/cutenote/`

## External actions that remain blocked

An authorized person must grant Apps Management write access, verify the publisher identity, create the portal draft, register/scan the MCP server, provide reviewer credentials and fixture IDs, complete domain verification, choose availability, confirm policy attestations, upload final assets, and submit for review. Approval and publication occur only after OpenAI review and a separate publisher action.
