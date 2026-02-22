import { WebSocketServer } from 'ws';
import type { Server } from 'node:http';
import { handleConnection } from './handler.js';

export function createWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws) => {
    handleConnection(ws);
  });

  return wss;
}
