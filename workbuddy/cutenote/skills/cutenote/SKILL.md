---
name: cutenote
description: Create, retrieve, and export CuteNote notes through OAuth MCP. Use when the user wants to turn a video link, web page, or long text into a long image, mind map, or detailed Markdown note, or list, read, or re-export an existing CuteNote note.
---

# CuteNote

Use the `cutenote` MCP server for the requested CuteNote work. Let the client open browser OAuth when authentication is required. Never ask the user to paste an API key, access token, refresh token, password, or other credential.

## Create a note

1. Determine the requested `output_type`: `long_image`, `mind_map`, or `detailed_markdown`. Preserve an explicit layout, style, or locale choice; ask only when a missing choice would materially change the result.
2. Require user-provided content or an explicit request to run a test before calling `create_note`. Do not create a sample note merely to check whether the tools are installed.
3. Call `create_note`, then poll `get_generation_job` with its `job_id`. Avoid a tight loop: wait briefly between calls and increase the interval when generation is still queued or processing.
4. Stop polling on `completed`, `failed`, or `blocked`. Never claim completion before the tool reports `completed`. On success, use the returned `note_id`; on failure or blockage, report the returned reason and do not export.

## Find and read notes

Use `list_notes` to discover existing notes and `get_note` to read one. The server intentionally has no question-answering tool: do not invent or look for `ask_note`.

## Export and deliver

- Long image: call `export_note` with `format: "png"`. For paged layouts, use `page_count` and `download_urls` to deliver every page rather than only the first.
- Mind map: call `export_note` with the completed mind-map note ID and `format: "png"`. Retain the returned tree or outline when it helps explain the result. Use `format: "svg"` only when the user explicitly requests SVG.
- Markdown: call `export_note` with `format: "markdown"`; prefer inline `content` and offer `download_url` when a file is useful.
- Original text: call `export_note` with `format: "source"`; prefer inline `content` and offer `download_url` when a file is useful.

Text too large to return inline contains a preview and a complete signed download URL. Signed artifact URLs expire after about 10 minutes; call `export_note` again if a link expires. Deliver the actual content, file, or download link returned by the tool rather than describing an artifact that was not produced.
