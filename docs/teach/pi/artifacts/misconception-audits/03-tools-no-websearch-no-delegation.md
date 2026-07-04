# Misconception Audit #03: Built-in Tools Overclaim

## The Misconception

The homepage described built-in tools as including "文件读写、Shell 执行、**Web 搜索、Agent 委托**等工具实现".

## Reality

**FALSE.** The actual built-in tools are exactly:

```typescript
type ToolName = "read" | "bash" | "edit" | "write" | "grep" | "find" | "ls";
```

There is **no web search** and **no agent delegation** in the built-in tool set. These are not present in:
- `packages/coding-agent/src/core/tools/index.ts` — `ToolName` union (line 83-84)
- `packages/coding-agent/src/core/tools/index.ts` — `createCodingTools()` returns 4 tools: read, bash, edit, write
- `packages/coding-agent/src/core/tools/index.ts` — `createReadOnlyTools()` returns 4 tools: read, grep, find, ls

## Source Evidence

- `packages/coding-agent/src/core/tools/index.ts:52` — ToolName union definition
- `packages/coding-agent/src/core/tools/index.ts:83-84` — same union repeated

## Why This Happened

The homepage card description was aspirational — listing capabilities that *could* exist via extensions rather than what actually ships with the core. This is a pedagogical sin: confusing "what's possible" with "what's built in".

## Corrected In

- `index.html` ch07 card desc → "read / bash / edit / write / grep / find / ls — 7 个内置工具的实现"
- stat label "Tests" → "Test Files" for precision
