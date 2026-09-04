import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll } from 'vitest';

// Runs before every test file, and completes (including the awaits below)
// before that file's own imports are evaluated — so `MONGODB_URI` is in
// place before `config/env.ts`'s module-level validation runs. See
// docs/TESTING.md §2: "mongodb-memory-server (replica-set mode, so
// transactions work), no mocking the DB."
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.COOKIE_DOMAIN ??= 'localhost';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-'.repeat(2);
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-'.repeat(2);

const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = replSet.getUri();
await mongoose.connect(process.env.MONGODB_URI);

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});
