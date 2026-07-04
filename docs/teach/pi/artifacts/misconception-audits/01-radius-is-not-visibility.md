# Misconception Audit #01: Radius

## The Misconception

"The `radius` module defines a visibility/scope enum (small/large/full) that controls how far an agent can reach in multi-agent orchestration."

## Reality

**FALSE.** The `radius` module (`packages/orchestrator/src/radius.ts`) has nothing to do with agent visibility scope. It implements **network presence registration and heartbeat** against `https://radius.pi.dev/`.

| Actual Export | Purpose |
|---|---|
| `RadiusPresence` | Presence record type (id, agentName, heartbeat) |
| `RadiusHttpError` | HTTP error wrapper for radius API calls |
| `radiusAuthStorage` | Token persistence for radius auth |
| `RADIUS_*` backoff constants | Retry/backoff parameters |

## Source Evidence

- `packages/orchestrator/src/radius.ts` — heartbeat POST loop, `presenceIntervalMs`
- `packages/orchestrator/src/supervisor.ts` — calls `registerPresence()` on startup

## Why This Happened

Chapter 13 was written from the (incorrect) assumption that since orchestration is "far-reaching", "radius" must describe scope. The naming intuition was wrong. Real radius = network heartbeat, like a "check-in" signal.

## Corrected In

- `chapters/13-orchestrator.html` section 13.4 — completely rewritten
- `chapters/index.html` chapter card SVG diagram labels updated
- Quiz Q1 now asks about radius.ts actual职责
