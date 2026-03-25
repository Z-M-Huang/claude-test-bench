import { vi } from 'vitest';
import type { IStorage } from '../interfaces/storage.js';
import type { ILogger } from '../interfaces/logger.js';
import type { TestSetup, Scenario } from '../types/index.js';

// NOTE: These are not real keys — they are test-only fixtures.
export const TEST_KEY = 'not-a-real-key-1234';

export const BASE_PROVIDER = {
  kind: 'api' as const,
  baseUrl: 'https://api.example.com',
  apiKey: TEST_KEY,
  model: 'claude-sonnet-4-6',
};

export function makeSetup(overrides: Partial<TestSetup> = {}): TestSetup {
  return {
    id: 'setup-1',
    name: 'Test Setup',
    description: 'A test setup',
    provider: BASE_PROVIDER,
    timeoutSeconds: 300,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 'scenario-1',
    name: 'Test Scenario',
    category: 'planning',
    claudeMdFiles: [],
    rules: [],
    skills: [],
    subagents: [],
    mcpServers: [],
    permissionMode: 'default',
    prompt: 'Write a function',
    workspaceFiles: [],
    expectedAnswer: 'done',
    criticalRequirements: [],
    gradingGuidelines: '',
    scoringDimensions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockStorage(): IStorage {
  return {
    getSetup: vi.fn(),
    listSetups: vi.fn(),
    saveSetup: vi.fn(),
    deleteSetup: vi.fn(),
    getScenario: vi.fn(),
    listScenarios: vi.fn(),
    saveScenario: vi.fn(),
    deleteScenario: vi.fn(),
    getRun: vi.fn(),
    listRuns: vi.fn(),
    saveRun: vi.fn(),
    deleteRun: vi.fn(),
    getEvaluation: vi.fn(),
    listEvaluations: vi.fn(),
    saveEvaluation: vi.fn(),
    deleteEvaluation: vi.fn(),
  };
}

export function createMockLogger(): ILogger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}
