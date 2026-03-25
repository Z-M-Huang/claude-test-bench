import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node:fs/promises before importing the module under test
vi.mock('node:fs/promises', () => ({
  default: { readFile: vi.fn() },
}));

import fs from 'node:fs/promises';
import { buildAgentsMap, buildMcpMap } from './agent-mapper.js';
import type { SubagentEntry, McpServerEntry } from '../types/index.js';

describe('buildAgentsMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty map for empty subagents array', async () => {
    const result = await buildAgentsMap([]);
    expect(result).toEqual({});
  });

  it('builds agent definition with inline prompt', async () => {
    const subagents: SubagentEntry[] = [
      { name: 'helper', description: 'Helps out', prompt: 'You are a helper.' },
    ];
    const result = await buildAgentsMap(subagents);

    expect(result['helper']).toEqual({
      description: 'Helps out',
      prompt: 'You are a helper.',
    });
  });

  it('reads prompt from file when loadFromFile is set', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('Loaded prompt from disk.');
    const subagents: SubagentEntry[] = [
      {
        name: 'file-agent',
        description: 'Reads from file',
        prompt: 'ignored',
        loadFromFile: '/path/to/prompt.md',
      },
    ];
    const result = await buildAgentsMap(subagents);

    expect(fs.readFile).toHaveBeenCalledWith('/path/to/prompt.md', 'utf-8');
    expect(result['file-agent'].prompt).toBe('Loaded prompt from disk.');
  });

  it('includes tools when provided and non-empty', async () => {
    const subagents: SubagentEntry[] = [
      {
        name: 'tooled',
        description: 'Has tools',
        prompt: 'prompt',
        tools: ['Read', 'Bash'],
      },
    ];
    const result = await buildAgentsMap(subagents);

    expect(result['tooled'].tools).toEqual(['Read', 'Bash']);
  });

  it('omits tools when array is empty', async () => {
    const subagents: SubagentEntry[] = [
      { name: 'no-tools', description: 'No tools', prompt: 'prompt', tools: [] },
    ];
    const result = await buildAgentsMap(subagents);

    expect(result['no-tools'].tools).toBeUndefined();
  });

  it('includes model when provided', async () => {
    const subagents: SubagentEntry[] = [
      {
        name: 'custom-model',
        description: 'Custom model',
        prompt: 'prompt',
        model: 'claude-opus-4',
      },
    ];
    const result = await buildAgentsMap(subagents);

    expect(result['custom-model'].model).toBe('claude-opus-4');
  });

  it('omits model when not provided', async () => {
    const subagents: SubagentEntry[] = [
      { name: 'default-model', description: 'Default', prompt: 'prompt' },
    ];
    const result = await buildAgentsMap(subagents);

    expect(result['default-model'].model).toBeUndefined();
  });

  it('maps disallowedTools when non-empty, omits when empty', async () => {
    const filled = await buildAgentsMap([
      { name: 'a', description: 'd', prompt: 'p', disallowedTools: ['Bash', 'Write'] },
    ]);
    expect(filled['a'].disallowedTools).toEqual(['Bash', 'Write']);

    const empty = await buildAgentsMap([
      { name: 'b', description: 'd', prompt: 'p', disallowedTools: [] },
    ]);
    expect(empty['b'].disallowedTools).toBeUndefined();
  });

  it('maps mcpServers when non-empty', async () => {
    const result = await buildAgentsMap([
      { name: 'a', description: 'd', prompt: 'p', mcpServers: ['github', 'slack'] },
    ]);
    expect(result['a'].mcpServers).toEqual(['github', 'slack']);
  });

  it('maps skills when non-empty', async () => {
    const result = await buildAgentsMap([
      { name: 'a', description: 'd', prompt: 'p', skills: ['commit', 'review-pr'] },
    ]);
    expect(result['a'].skills).toEqual(['commit', 'review-pr']);
  });

  it('maps maxTurns when provided, omits when absent', async () => {
    const filled = await buildAgentsMap([
      { name: 'a', description: 'd', prompt: 'p', maxTurns: 5 },
    ]);
    expect(filled['a'].maxTurns).toBe(5);

    const absent = await buildAgentsMap([
      { name: 'b', description: 'd', prompt: 'p' },
    ]);
    expect(absent['b'].maxTurns).toBeUndefined();
  });

  it('handles multiple subagents', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('File prompt.');
    const subagents: SubagentEntry[] = [
      { name: 'a', description: 'Agent A', prompt: 'Inline prompt' },
      {
        name: 'b',
        description: 'Agent B',
        prompt: '',
        loadFromFile: '/b.md',
        tools: ['Write'],
        model: 'claude-sonnet-4-6',
      },
    ];
    const result = await buildAgentsMap(subagents);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result['a'].prompt).toBe('Inline prompt');
    expect(result['b'].prompt).toBe('File prompt.');
    expect(result['b'].tools).toEqual(['Write']);
    expect(result['b'].model).toBe('claude-sonnet-4-6');
  });
});

describe('buildMcpMap', () => {
  it('returns empty map for empty servers array', () => {
    const result = buildMcpMap([]);
    expect(result).toEqual({});
  });

  it('builds stdio config', () => {
    const servers: McpServerEntry[] = [
      {
        name: 'my-stdio',
        config: {
          transport: 'stdio',
          command: 'npx',
          args: ['-y', 'my-server'],
          env: { TOKEN: 'secret' },
        },
      },
    ];
    const result = buildMcpMap(servers);

    expect(result['my-stdio']).toEqual({
      command: 'npx',
      args: ['-y', 'my-server'],
      env: { TOKEN: 'secret' },
    });
  });

  it('builds stdio config without optional args/env', () => {
    const servers: McpServerEntry[] = [
      {
        name: 'minimal-stdio',
        config: { transport: 'stdio', command: '/bin/server' },
      },
    ];
    const result = buildMcpMap(servers);

    expect(result['minimal-stdio']).toEqual({
      command: '/bin/server',
      args: undefined,
      env: undefined,
    });
  });

  it('builds http config', () => {
    const servers: McpServerEntry[] = [
      {
        name: 'my-http',
        config: {
          transport: 'http',
          url: 'https://mcp.example.com',
          headers: { Authorization: 'Bearer tok' },
        },
      },
    ];
    const result = buildMcpMap(servers);

    expect(result['my-http']).toEqual({
      type: 'http',
      url: 'https://mcp.example.com',
      headers: { Authorization: 'Bearer tok' },
    });
  });

  it('builds http config without optional headers', () => {
    const servers: McpServerEntry[] = [
      {
        name: 'no-headers-http',
        config: { transport: 'http', url: 'https://mcp.example.com' },
      },
    ];
    const result = buildMcpMap(servers);

    expect(result['no-headers-http']).toEqual({
      type: 'http',
      url: 'https://mcp.example.com',
      headers: undefined,
    });
  });

  it('builds sse config', () => {
    const servers: McpServerEntry[] = [
      {
        name: 'my-sse',
        config: {
          transport: 'sse',
          url: 'https://sse.example.com/events',
          headers: { 'X-Key': 'abc' },
        },
      },
    ];
    const result = buildMcpMap(servers);

    expect(result['my-sse']).toEqual({
      type: 'sse',
      url: 'https://sse.example.com/events',
      headers: { 'X-Key': 'abc' },
    });
  });

  it('builds sse config without optional headers', () => {
    const servers: McpServerEntry[] = [
      {
        name: 'bare-sse',
        config: { transport: 'sse', url: 'https://sse.example.com' },
      },
    ];
    const result = buildMcpMap(servers);

    expect(result['bare-sse']).toEqual({
      type: 'sse',
      url: 'https://sse.example.com',
      headers: undefined,
    });
  });

  it('handles mixed transport types', () => {
    const servers: McpServerEntry[] = [
      { name: 's1', config: { transport: 'stdio', command: 'cmd' } },
      { name: 's2', config: { transport: 'http', url: 'http://a.com' } },
      { name: 's3', config: { transport: 'sse', url: 'http://b.com' } },
    ];
    const result = buildMcpMap(servers);

    expect(Object.keys(result)).toHaveLength(3);
    expect(result['s1']).toHaveProperty('command', 'cmd');
    expect(result['s2']).toHaveProperty('type', 'http');
    expect(result['s3']).toHaveProperty('type', 'sse');
  });
});
