import { shallowRef, ref } from 'vue';
import type { ClientMessage, ServerMessage, PublicUser, SeqState, SynthState } from '@beatcord/shared';
import { useSessionStore } from '@/stores/session';
import { useRoomStore } from '@/stores/room';
import { useGlobalSettingsStore } from '@/stores/globalSettings';
import { useAudioEngine } from '@/composables/useAudioEngine';
import { startScheduler, stopScheduler, isSchedulerRunning } from '@/composables/schedulerEngine';
import { useToast } from '@/composables/useToast';
import { useChatStore } from '@/stores/chat';

// ── Module-level singleton state ──────────────────────────────
const ws = shallowRef<WebSocket | null>(null);
const connected = ref(false);
const reconnectAttempts = ref(0);
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

export function useWebSocket() {
  const session = useSessionStore();
  const room = useRoomStore();
  const globals = useGlobalSettingsStore();
  const audio = useAudioEngine();
  const { show } = useToast();
  const chat = useChatStore();

  function wsUrl(): string {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }

  function connect(name: string, roomId: string) {
    if (ws.value && (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const url = wsUrl();
    ws.value = new WebSocket(url);

    ws.value.onopen = () => {
      connected.value = true;
      reconnectAttempts.value = 0;
      send({ type: 'join', name, roomId });
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(() => send({ type: 'ping' }), 30_000);
      session.isConnected = true;
    };

    ws.value.onclose = () => {
      connected.value = false;
      session.isConnected = false;
      scheduleReconnect(name, roomId);
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

  function scheduleReconnect(name: string, roomId: string) {
    if (reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** reconnectAttempts.value, 30_000);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectAttempts.value++;
      connect(name, roomId);
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

  function sendChat(text: string) {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    send({ type: 'chat', text: trimmed });
  }

  function handleMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'welcome': {
        session.userId = msg.userId;
        session.setRoom(msg.roomId);
        room.reset();
        room.setUsers(msg.users, msg.userId);
        if (msg.globalSettings) {
          globals.applyFromServer(msg.globalSettings);
        }
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
        room.setUsers(msg.users, session.userId);
        break;
      }
      case 'sequencer_update': {
        const u = room.otherUsers.get(msg.userId);
        if (u) u.seq = msg.seq as SeqState;
        break;
      }
      case 'synth_update': {
        const u = room.otherUsers.get(msg.userId);
        if (u) u.synth = msg.synth as SynthState;
        break;
      }
      case 'step_tick': {
        room.setActiveStep(msg.userId, msg.step);
        const u = room.otherUsers.get(msg.userId);
        if (u && u.seq && msg.hasNotes) {
          const ctx = audio.init();
          audio.playStep(u.seq.steps[msg.step], u.synth, ctx.currentTime, u.seq.bpm, u.seq.subdiv || 4);
        }
        break;
      }
      case 'chat': {
        chat.addMessage({
          userId: msg.userId,
          name: msg.name,
          text: msg.text,
          timestamp: msg.timestamp,
        });
        break;
      }
      case 'global_settings_update': {
        const wasPlaying = globals.playing;
        globals.applyFromServer(msg.settings);

        // React to remote play/stop changes
        if (msg.settings.playing !== undefined && msg.settings.playing !== wasPlaying) {
          if (msg.settings.playing && !isSchedulerRunning()) {
            audio.init();
            startScheduler();
          } else if (!msg.settings.playing && isSchedulerRunning()) {
            stopScheduler();
          }
        }
        break;
      }
      case 'kicked': {
        show('Removed due to inactivity — reload to rejoin.', '#ffd93d');
        break;
      }
    }
  }

  return { ws, connected, connect, disconnect, send, sendChat };
}
