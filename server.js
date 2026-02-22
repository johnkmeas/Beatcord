const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = 3000;

const httpServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

const wss = new WebSocketServer({ server: httpServer });

// State
const users = new Map(); // id -> { id, name, sequencer, synth, ws, lastActivity }
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function defaultSequencer() {
  return {
    steps: Array(16).fill(false),
    bpm: 120,
    playing: false,
    currentStep: -1,
  };
}

function defaultSynth() {
  return {
    waveform: 'sawtooth',
    attack: 0.01,
    decay: 0.1,
    sustain: 0.5,
    release: 0.3,
    filterFreq: 2000,
    filterQ: 1,
    volume: 0.7,
    note: 'C4',
    octave: 4,
    color: randomColor(),
  };
}

function randomColor() {
  const colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bff','#ff9f43','#00d2d3','#ee5a24'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function broadcast(data, excludeId = null) {
  const msg = JSON.stringify(data);
  users.forEach((user, id) => {
    if (id !== excludeId && user.ws.readyState === 1) {
      user.ws.send(msg);
    }
  });
}

function broadcastAll(data) {
  broadcast(data, null);
}

function getPublicUsers() {
  return Array.from(users.values()).map(u => ({
    id: u.id,
    name: u.name,
    sequencer: u.sequencer,
    seq: u.seq || null,
    synth: u.synth,
  }));
}

function removeUser(id) {
  if (users.has(id)) {
    const user = users.get(id);
    clearTimeout(user.inactivityTimer);
    users.delete(id);
    broadcastAll({ type: 'user_left', userId: id });
    broadcastAll({ type: 'users_update', users: getPublicUsers() });
    console.log(`User ${user.name} (${id}) removed`);
  }
}

function resetInactivityTimer(user) {
  clearTimeout(user.inactivityTimer);
  user.lastActivity = Date.now();
  user.inactivityTimer = setTimeout(() => {
    console.log(`Removing inactive user ${user.name}`);
    if (user.ws.readyState === 1) {
      user.ws.send(JSON.stringify({ type: 'kicked', reason: 'inactivity' }));
    }
    removeUser(user.id);
  }, INACTIVITY_TIMEOUT);
}

wss.on('connection', (ws) => {
  let userId = null;

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      userId = generateId();
      const user = {
        id: userId,
        name: msg.name.slice(0, 20),
        sequencer: defaultSequencer(),
        synth: defaultSynth(),
        ws,
        inactivityTimer: null,
        lastActivity: Date.now(),
      };
      users.set(userId, user);
      resetInactivityTimer(user);

      // Send welcome with full state
      ws.send(JSON.stringify({
        type: 'welcome',
        userId,
        users: getPublicUsers(),
      }));

      // Notify others
      broadcast({ type: 'user_joined', user: { id: userId, name: user.name, sequencer: user.sequencer, synth: user.synth } }, userId);
      console.log(`User ${user.name} (${userId}) joined`);
      return;
    }

    if (!userId || !users.has(userId)) return;
    const user = users.get(userId);
    resetInactivityTimer(user);

    if (msg.type === 'sequencer_update') {
      if (msg.seq) { user.seq = msg.seq; broadcast({ type: 'sequencer_update', userId, seq: user.seq }, userId); }
      else if (msg.sequencer) { Object.assign(user.sequencer, msg.sequencer); broadcast({ type: 'sequencer_update', userId, sequencer: user.sequencer }, userId); }
    }

    if (msg.type === 'synth_update') {
      Object.assign(user.synth, msg.synth);
      broadcast({ type: 'synth_update', userId, synth: user.synth }, userId);
    }

    if (msg.type === 'step_tick') {
      broadcast({ type: 'step_tick', userId, step: msg.step, hasNotes: msg.hasNotes, active: msg.active }, userId);
    }

    if (msg.type === 'ping') {
      // Just keep-alive / activity update
    }
  });

  ws.on('close', () => {
    if (userId) removeUser(userId);
  });

  ws.on('error', () => {
    if (userId) removeUser(userId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🎵 JAM SESSION server running at http://localhost:${PORT}`);
});
