import mongoose, { type Mongoose } from 'mongoose';

type MongooseCache = {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

// Separate global var name avoids conflict with the 'mongoose' import above.
declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable in .env');
}

// Re-use the cached connection across hot reloads in development.
let cached: MongooseCache = global.__mongooseCache ?? { conn: null, promise: null };
if (!global.__mongooseCache) {
  global.__mongooseCache = cached;
}

export async function connectDB(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
