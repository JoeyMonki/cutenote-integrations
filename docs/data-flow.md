# Data flow

```text
User request
    |
    v
AI client ---- OAuth discovery ----> CuteNote authorization server
    |                                      |
    |<----- browser consent + tokens ------|
    |
    +---- MCP tool call + access token ---> https://www.cutenote.app/mcp
                                               |
                         ownership + scope ----+
                                               |
                     generation job / note data
                                               |
    <---- structured result or signed URL ------+
    |
    +---- short-lived artifact download ------> CuteNote artifact route
```

## Creation

The user supplies text or a supported public URL to the AI client. The client sends it to `create_note` only after authorization and creates a server-side job. The client polls the job ID; successful processing produces a note owned by the authorized account. Generation is asynchronous, and stopping client polling does not cancel server work.

## Retrieval

`list_notes`, `get_note`, and `get_generation_job` send account-scoped identifiers to CuteNote. The server verifies OAuth scope and ownership before returning structured data. Large text may be represented as a preview until exported.

## Export

`export_note` verifies ownership and returns metadata plus a short-lived signed URL. The client or user downloads the artifact from CuteNote. PNG output may contain multiple pages; Markdown and source exports may include inline content. The signed link is not a permanent public URL.

## Trust boundaries

- **AI client:** holds OAuth tokens according to its own storage policy and can see user prompts and tool results.
- **Browser:** handles CuteNote sign-in, consent, and client callback.
- **CuteNote:** authorizes scopes, processes submitted content, stores jobs/notes, and serves exports.
- **Source URL:** when supplied, is an external content origin selected by the user.

Consult the client's own privacy and retention terms as well as CuteNote's public privacy policy when it becomes available. Current public privacy and terms URLs are release TODOs; this data-flow description is not a substitute for either policy.
