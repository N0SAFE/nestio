import { beforeAll, beforeEach, afterAll, vi } from 'vitest';
import 'reflect-metadata';
import { getMockEnv } from '@repo/env';

// Set up test environment variables BEFORE any other imports to ensure they're available
// when modules are loaded and the env schema is validated
const mockApiEnv = getMockEnv('api');

// Apply mock environment variables to process.env BEFORE any module imports
Object.entries(mockApiEnv).forEach(([key, value]) => {
  if (!(key in process.env)) {
    // @ts-ignore
    process.env[key] = value;
  }
});

// Override NODE_ENV to test
process.env.NODE_ENV = 'test';

// Log applied env for debugging
console.log('Applied mock env variables:', Object.keys(mockApiEnv));

// Global test setup for NestJS API
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

// Mock environment variables for testing
beforeAll(() => {
  // Mock console methods for cleaner test output
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'debug').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Mock external dependencies
vi.mock('better-auth', () => ({
  betterAuth: vi.fn(() => ({
    api: {
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
    handler: vi.fn(),
  })),
}));

vi.mock('better-auth/adapters/drizzle', () => ({
  drizzleAdapter: vi.fn(() => ({})),
}));

// Mock database connection
vi.mock('./src/db/database-connection', () => ({
  DATABASE_CONNECTION: 'DATABASE_CONNECTION',
}));

// Mock OS hostname for logger middleware
vi.mock('os', () => ({
  hostname: vi.fn(() => 'test-hostname'),
}));

// Mock @orpc/nest for controller testing
vi.mock('@orpc/nest', () => ({
  Implement: vi.fn(() => (target: any, propertyKey: string) => {}),
  implement: vi.fn((contract: any) => ({
    handler: vi.fn((handlerFn: Function) => {
      // Return a handler that preserves the original function context
      return {
        handler: handlerFn,
      };
    }),
  })),
}));