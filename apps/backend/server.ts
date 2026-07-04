import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { setupSocketHandlers } from './src/sockets/handlers';
import { printNetworkInfo } from './src/utils/network';

declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

const dev = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3001', 10);

// Bind to all interfaces so mobile devices on the LAN can reach the server.
// HOST env defaults to 0.0.0.0; set it to 127.0.0.1 to restrict to localhost.
const bindHost = process.env.HOST || '0.0.0.0';

// Next.js uses 'localhost' internally for HMR and URL construction.
const app = next({ dev, hostname: 'localhost', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Store io globally so API routes can emit events
  global.io = io;

  setupSocketHandlers(io);

  httpServer.listen(port, bindHost, () => {
    console.log('\n🚖  Bebe Taxi backend ready');
    printNetworkInfo(port);
    console.log('   Socket.IO attached');
    console.log(`   DEV_MODE OTP: ${process.env.DEV_MODE === 'true' ? 'ON (use code 123456)' : 'OFF'}\n`);
  });
});
