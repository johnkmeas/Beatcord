import { shallowRef, ref } from 'vue';
import type { ClientMessage, ServerMessage, PublicUser, SeqState, SynthState } from '@beatcord/shared';
import { useSessionStore } from '@/stores/session';
import { useRoomStore } from '@/stores/room';
import { useSequencerStore } from '@/stores/sequencer';
import { useSynthStore } from '@/stores/synth';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { useToast } from '@/composables/useToast';

export function useWebSocket() {
  const ws = shallowRef<WebSocket | null>(null);
  const connected = ref(false);
  const reconnectAttempts = ref(0);
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const session = useSessionStore();
  const room = useRoomStore();
  const seq = useSequencerStore();
  const synth = useSynthStore();
  const audio = useAudioEngine();
  const { show } = useToast();

  function wsUrl(): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }

  function connect(name: string) {
    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = wsUrl();
    ws.value = new WebSocket(url);

    ws.value.onopen = () => {
      connected.value = true;
      reconnectAttempts.value = 0;
      // Identify to server
      send({ type: 'join', name });
      // Start heartbeat pings
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => send({ type: 'ping' }), 30_000);
      session.isConnected = true;
    };

    ws.value.onclose = () => {
      connected.value = false;
      session.isConnected = false;
      scheduleReconnect(name);
      if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      show('Connection lost — reconnecting…', '#ffd93d');
    };

    ws.value.onerror = () => {
      // Error is followed by close in most cases
    };

    ws.value.onmessage = (e: MessageEvent) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(e.data)) as ServerMessage;
      } catch {
        return;
      }
      handleMessage(msg);
    };
  }

  function scheduleReconnect(name: string) {
    if (reconnectTimer) return; // already scheduled
    const delay = Math.min(1000 * 2 ** reconnectAttempts.value, 30_000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectAttempts.value++;
      connect(name);
    }, delay);
  }

  function disconnect() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
    ws.value?.close();
    ws.value = null;
  }

  function send(msg: ClientMessage) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg));
    }
  }

  function setUsers(users: PublicUser[], myId: string) {
    room.setUsers(users, myId);
  }

  function handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'welcome': {
        session.userId = msg.userId;
        setUsers(msg.users, msg.userId);
        break;
      }
      case 'user_joined': {
        room.addUser(msg.user);
        show(`${msg.user.name} joined the jam 🎵`, msg.user.synth.color);
        break;
      }
      case 'user_left': {
        const u = room.otherUsers.get(msg.userId);
        if (u) show(`${u.name} left the jam`);
        room.removeUser(msg.userId);
        break;
      }
      case 'users_update': {
        if (!session.userId) break;
        setUsers(msg.users, session.userId);
        break;
      }
      case 'sequencer_update': {
        // Update other user's sequencer state snapshot
        const u = room.otherUsers.get(msg.userId);
        if (u) {
          u.seq = msg.seq as SeqState;
        }
        break;
      }
      case 'synth_update': {
        const u = room.otherUsers.get(msg.userId);
        if (u) {
          u.synth = msg.synth as SynthState;
        }
        break;
      }
      case 'step_tick': {
        // Update remote playhead and optionally play their notes locally
        room.setActiveStep(msg.userId, msg.step);
        const u = room.otherUsers.get(msg.userId);
        if (u && u.seq && msg.hasNotes) {
          const ctx = audio.init();
          const when = ctx.currentTime; // immediate — remote scheduling is advisory only
          audio.playStep(u.seq.steps[msg.step], u.synth, when, u.seq.bpm, u.seq.subdiv || 4);
        }
        break;
      }
      case 'kicked': {
        show('Removed due to inactivity — reload to rejoin.', '#ffd93d');
        break;
      }
    }
  }

  return { ws, connected, connect, disconnect, send };
}
