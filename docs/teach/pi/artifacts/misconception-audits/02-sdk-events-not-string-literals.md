# Misconception Audit #02: SDK Event Subscription API

## The Misconception

"The SDK exposes event subscription via `session.on('event:name', callback)` with string literals, plus an exported `AgentSessionEvents` type with string union event names."

## Reality

**FALSE.** The SDK uses a typed `EventBus<T>` + discriminated union `AgentSessionEvent`:

| What was written | Reality |
|---|---|
| `session.on('message:user', cb)` | `session.subscribe((event) => { switch(event.type) {...} })` |
| `AgentSessionEvents` export | `AgentSessionEvent` (discriminated union) |
| `session.send()` | Does not exist — use `runPrintMode()` |
| String literal event names | Union members: `tool_execution_start/end`, `turn_start/end`, etc. |

## Source Evidence

- `packages/coding-agent/src/core/agent-session.ts` — `EventBus<AgentSessionEvent>` usage
- `packages/coding-agent/src/types.ts` — `AgentSessionEvent` discriminated union definition
- `packages/coding-agent/src/modes/print-mode.ts` — `runPrintMode()` is the programmatic entry

## Why This Happened

Chapter 12 author assumed every event system follows the Node.js `EventEmitter.on('string')` pattern. Pi's SDK uses a stricter typed union approach informed by its TypeScript-first design.

## Corrected In

- `chapters/12-sdk.html` section 12.6 — completely rewritten
- Section 12.7 code example — rewritten with `subscribe()` + `switch(event.type)`
- Exercise hints — removed `session.send()`
