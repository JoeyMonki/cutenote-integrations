# Tools and workflow

All tools operate on the currently authorized CuteNote account. IDs are opaque strings; do not invent IDs or substitute another user's ID.

## Tool reference

### `create_note`

Starts an asynchronous generation job. Required input is `content` (text or a supported public URL). Optional choices include:

- `output_type`: `long_image`, `mind_map`, or `detailed_markdown`
- `image_layout`: `long`, `portrait_9_16`, or `landscape_16_9`
- `style_type`: `auto`, `fresh_note`, `business_case`, `tech_tool`, `course_handout`, or `xiaohongshu_seed`
- `locale`: `zh-CN` or `en`

It returns `job_id`, initial status, output type, `poll_after_seconds`, and `max_wait_seconds`. This is the only tool that creates user data. Do not call it merely to test installation without explicit user-provided content or permission to create a test note.

### `get_generation_job`

Reads one owned job by `job_id`. Start after `poll_after_seconds`; for unchanged `queued` or `processing` states, back off at roughly 2, 4, 8, then at most 10 seconds. Stop when `terminal` is true: `completed`, `failed`, and `blocked` are terminal. Stop client-side waiting after `max_wait_seconds` without treating that timeout as cancellation.

### `list_notes`

Reads the current user's recent notes. `limit` is 1–20 and `cursor` continues a previous page. The response includes summaries and `next_cursor`.

### `get_note`

Reads an owned note by `note_id`. `include` may request `content`, `source`, or `mind_map`. Large text is represented by a preview and truncation metadata; use `export_note` for the complete file. This tool retrieves data but does not answer questions about a note. There is no `ask_note` tool.

### `export_note`

Reads and packages an owned note. Inputs are `note_id`, `format` (`png`, `markdown`, `source`, or explicitly requested legacy `svg`), and one-based `page`. Signed download URLs last roughly 5–10 minutes. A paged image includes every URL in `download_urls`; deliver all pages. If a link expires, call `export_note` again rather than retrying the expired URL.

## Standard create workflow

1. Confirm content, output type, and any material layout, style, or locale choice.
2. Call `create_note` once and retain its `job_id`.
3. Poll `get_generation_job` with backoff until a terminal state.
4. On `completed`, use the returned `note_id` with `get_note` or `export_note`.
5. On `failed` or `blocked`, show the stable `error_code` and safe message; do not export or claim success.

Direct tool failures use `{ "error": { "code": "...", "message": "..." } }`. Branch on the stable code, not localized message text. See [troubleshooting](troubleshooting.md).
