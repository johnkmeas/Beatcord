# Beatcord — Claude Code Guide

Beatcord is a real-time collaborative browser-based step sequencer — "the group chat of beats". Multiple users share a room, each with their own synth and step sequence, all playing in sync.

## Commands

```bash
pnpm dev              # Build shared, then start server + client concurrently
pnpm dev:server       # Server only on :3000 (tsx watch)
pnpm dev:client       # Client only on :5173 (Vite proxy → :3000)
pnpm build            # Full production build (shared → client → server)
pnpm start            # Run built server (serves client dist from /public)
pnpm test             # Vitest run
pnpm typecheck        # Type-check all packages
pnpm lint             # ESLint (packages/**/*.ts, .vue)
pnpm lint:fix         # ESLint with auto-fix
pnpm format           # Prettier (packages/**/*.{ts,vue})
pnpm verify           # lint + typecheck + test — run before committing
```

## Monorepo Structure

pnpm workspaces — build order: **shared → client → server**.

```
beatcord/
├── packages/
│   ├── shared/          (@beatcord/shared) — TypeScript types only, no runtime deps
│   │   └── src/types/   messages.ts, sequencer.ts, synth.ts, user.ts, global.ts, arpeggiator.ts
│   ├── server/          (@beatcord/server) — Node 20, Express 4, ws 8
│   │   └── src/
│   │       ├── index.ts         HTTP + WS bootstrap
│   │       ├── config.ts        PORT, timeouts, limits
│   │       ├── http/            Express app, routes (GET /api/health)
│   │       └── ws/              server.ts, handler.ts, rooms.ts, broadcast.ts
│   └── client/          (@beatcord/client) — Vue 3.4, Pinia 2, Vite 5, Tailwind 3
│       └── src/
│           ├── stores/          session, sequencer, synth, room, scale, chat,
│           │                    globalSettings, arpeggiator
│           ├── composables/
│           │   ├── useAudioEngine.ts    AudioContext, playNote/playStep/playNoteNow
│           │   ├── schedulerEngine.ts   Lookahead scheduler singleton (split for circ-dep)
│           │   ├── useSequencer.ts      Transport start/stop + WS broadcast
│           │   ├── usePianoRoll.ts      Canvas rendering (rows, grid, notes, playhead)
│           │   ├── useWebSocket.ts      Singleton WS, reconnect, ping, message dispatch
│           │   ├── useArpeggiator.ts    generateArpNotes() — pure function
│           │   ├── useScale.ts          snapToScale() helper
│           │   └── useToast.ts          Toast notifications
│           ├── components/
│           │   ├── layout/      AppHeader, AppSidebar, ChatPanel, ToastContainer
│           │   ├── sequencer/   PianoRoll, TransportBar, NoteEditor, ScaleSelector
│           │   ├── synth/       SynthPanel (tabs: Osc, Env, Filter, Arp)
│           │   └── users/       UserCard, OtherTrack
│           └── views/           LobbyView, JamView
├── tests/               Vitest test files (arpeggiator, scale, defaults, globalSettings)
├── legacy/              Old prototype files (index.html, server.js) — reference only
├── .agents/skills/      Agent skill definitions (see below)
├── Dockerfile           Multi-stage production build
├── railway.toml         Railway deploy with health check at /api/health
└── vitest.config.ts
```

## Key Architecture

### Singleton Composables
`useWebSocket` and `useAudioEngine` use module-level `shallowRef` — calling them multiple times returns the same instance. This is intentional; never create a second connection.

`schedulerEngine.ts` is a plain module (not a composable) that manages the lookahead scheduler. It was split from `useSequencer.ts` to break a circular import dependency.

### Audio Scheduling
The sequencer uses a Web Audio API lookahead scheduler in `schedulerEngine.ts`:
- `LOOKAHEAD = 0.1s` — schedules 100ms ahead
- `SCHEDULE_INTERVAL = 25ms` — checks every 25ms
- Notes scheduled at exact `AudioContext.currentTime` values — no drift
- Signal path per voice: `OscillatorNode → BiquadFilterNode → GainNode → ctx.destination`
- ADSR envelope via `GainNode.gain` automation
- `step_tick` broadcast timed via `setTimeout` aligned with scheduled play time

### Global vs Per-User State
- **Global** (per-room, via `global_settings_update`): playing, bpm, stepCount, rootNote, scaleType, masterVolume
- **Per-user** (via `sequencer_update` / `synth_update`): steps/notes, subdiv, waveform, ADSR, filter, volume, color, arpeggiator

### Room System
- Room ID is the URL slug (`/jam/:roomId`), sanitised to `[a-z0-9-_]` max 48 chars
- Each room has its own `globalSettings`, user list, and broadcast scope
- Empty rooms are garbage-collected when the last user leaves

### Ghost User Prevention
- Each tab generates a stable `clientId` via `crypto.randomUUID()` at module load
- Sent with every `join` message; `evictStaleClient(clientId)` clears stale sessions on reconnect

### Canvas Piano Roll
- All rendering in `usePianoRoll.ts`; `PianoRoll.vue` owns the canvas element + pointer events
- MIDI range 24 (C1) – 108 (C8), 85 rows; DPR-aware for retina
- `KEY_W=50px`, `STEP_W=40px`, `ROW_H=20px`, `HEADER_H=20px`

## Code Conventions

- **TypeScript strict** everywhere — `no-explicit-any: error`. Never use `as any` or `any` types.
- **All shared types** go in `packages/shared/src/types/` and must be re-exported from `index.ts`.
- **Pinia stores** are the single source of truth — components must not hold sequencer or synth state.
- **WS guard**: always check `ws.value?.readyState === WebSocket.OPEN` before sending.
- **Audio timing**: always schedule via `AudioContext.currentTime`. Never use `Date.now()` for timing.
- **Global settings changes** go through `globals.updateAndBroadcast()` to keep server in sync.
- **Broadcast after mutations** — after changing local state, broadcast to other users.
- **Always call `.stop()`** on oscillators after the envelope finishes (memory leak prevention).
- Use `getSynthState()` from `useSynthStore()` — it returns a typed `SynthState` snapshot.

## Agent Skill System

Specialist agents in `.agents/skills/` own different domains. Load the right skill before working:

| Skill | Domain |
|---|---|
| `beatcord-lead-dev` | Architecture, cross-cutting concerns, coordination |
| `beatcord-audio-engineer` | `useAudioEngine.ts`, `schedulerEngine.ts`, `useSequencer.ts`, `synth.ts` store |
| `beatcord-ws-engineer` | `packages/server/src/ws/`, `useWebSocket.ts`, WS protocol |
| `beatcord-frontend-engineer` | Canvas piano roll, Vue components, mobile, UX |
| `beatcord-backend-engineer` | Express, Railway, Docker, persistence |
| `beatcord-qa-engineer` | Tests, debugging, performance, cross-browser |

## Current Status

### Completed
1. pnpm monorepo — shared/server/client packages
2. Server migrated to TypeScript — Express + ws, all handlers as named functions
3. WebSocket reconnection — `wss://` fix, exponential backoff, 30s ping keep-alive
4. Vue 3 client — Vite, Vue Router, Pinia, Tailwind, Composition API
5. Audio engine — lookahead scheduler, drift-free ADSR synthesis
6. Canvas piano roll — full grid, keys, notes, playhead, scale highlighting
7. Chat system — `ChatPanel.vue` + chat store + `chat` WS message type
8. Global settings sync — BPM, playing, step count, root note, scale, master volume
9. Arpeggiator — 7 patterns, 6 rates, octave expansion, gate, swing, 8 presets
10. Toast notifications — user join/leave, connection status
11. Note editor popup — per-step note/velocity/length editing
12. Room/session system — URL-based rooms, per-room state, auto-cleanup

### Remaining Work (Priority Order)
1. **Effects chain** — reverb (`ConvolverNode`) + delay (`DelayNode`) per-user; new FX tab in SynthPanel
2. **Web MIDI input** — `navigator.requestMIDIAccess()` for hardware controllers
3. **Mobile touch support** — touch events on canvas, responsive layout

### Technical Debt
- Legacy files in `legacy/` folder (kept for reference, not active code)
