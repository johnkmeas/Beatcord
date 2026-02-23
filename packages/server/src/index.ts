import { createServer } from 'node:http';
import { createApp } from './http/app.js';
import { createWebSocketServer } from './ws/server.js';
import { config } from './config.js';

const app = createApp();
const httpServer = createServer(app);

createWebSocketServer(httpServer);

httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`🎵 Beatcord server running on 0.0.0.0:${config.port}`);
});

httpServer.on('error', (err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});
