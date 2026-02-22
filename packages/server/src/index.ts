import { createServer } from 'node:http';
import { createApp } from './http/app.js';
import { createWebSocketServer } from './ws/server.js';
import { config } from './config.js';

const app = createApp();
const httpServer = createServer(app);

createWebSocketServer(httpServer);

httpServer.listen(config.port, () => {
  console.log(`🎵 Beatcord server running at http://localhost:${config.port}`);
});
