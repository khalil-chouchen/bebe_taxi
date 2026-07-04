import type { Server } from 'socket.io';

declare global {
  var io: Server | undefined;
  var mongoose: {
    conn: typeof import('mongoose') | null;
    promise: Promise<typeof import('mongoose')> | null;
  };
}

export {};
