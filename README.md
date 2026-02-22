# Beatcord

Real-time collaborative step sequencer — the group chat of beats.

Jam with friends in the browser using a polyphonic piano roll, MIDI-style notation, scale constraints, and WebSocket multiplayer.

## Features

- 🎹 Polyphonic piano roll (C1–C8 range)
- 🎵 16 scales with root note selection (Major, Minor, Dorian, Blues, Pentatonic, and more)
- 🥁 Per-step note editor with velocity and note length control
- 🌐 Real-time WebSocket multiplayer — hear everyone's synth live
- 🎛️ Full ADSR envelope + lowpass filter synthesizer (Web Audio API)
- ⚙️ Configurable BPM, step count (8/16/32), and subdivision
- 👤 No auth required — enter a name and jam
- 🧹 Inactive users auto-removed after 5 minutes

## Quick Start

```bash
npm install
node server.js
```

Then open [http://localhost:3000](http://localhost:3000) and share the link with friends.

## Deploy

Works great on [Railway](https://railway.app) — connect your GitHub repo and it deploys automatically.

## License

MIT
