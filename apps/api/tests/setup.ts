// Runs before every test file. Provides the minimum env vars env.ts requires
// so unit/integration tests never depend on a real .env file being present.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/clenzy_test';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.COOKIE_DOMAIN ??= 'localhost';
