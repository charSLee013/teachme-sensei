## Glossary

- `Pi Agent Harness`: the overall project and CLI experience exposed to users.
- `pi-ai`: provider abstraction layer for models, auth, and streaming APIs.
- `pi-agent-core`: reusable agent loop and state layer.
- `pi-tui`: terminal UI rendering library used by interactive mode.
- `pi-coding-agent`: the main CLI package that assembles tools, sessions, settings, and runtime modes.
- `pi-orchestrator`: experimental multi-agent coordination package.
- `AgentMessage`: agent-layer message type that can include custom messages in addition to LLM messages.
- `ToolDefinition`: schema sent to the model so it can request a tool call.
- `AgentTool`: runtime tool implementation with execute logic.
- `SessionEntry`: one append-only JSONL record in session storage.
- `Compaction`: LLM-generated summary used to preserve context while shrinking history.
- `Follow-up message`: message delivered after the agent would otherwise stop.
- `Steering message`: message queued into the next turn while the agent is already active.
