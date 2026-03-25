import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildRunEnv } from './env-builder.js';
import { BASE_PROVIDER } from '../routes/route-test-helpers.js';
import type { OAuthProviderConfig } from '../types/index.js';

describe('buildRunEnv', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    process.env = {
      HOME: '/home/test',
      PATH: '/usr/bin',
      SHELL: '/bin/bash',
      SECRET_TOKEN: 'should-not-leak',
      RANDOM_VAR: 'also-should-not-leak',
    };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it('sets API key, base URL, and all 3 model slots for api provider', () => {
    const env = buildRunEnv(BASE_PROVIDER);

    expect(env['ANTHROPIC_API_KEY']).toBe(BASE_PROVIDER.apiKey);
    expect(env['ANTHROPIC_BASE_URL']).toBe(BASE_PROVIDER.baseUrl);
    expect(env['ANTHROPIC_DEFAULT_MODEL']).toBe(BASE_PROVIDER.model);
    expect(env['ANTHROPIC_DEFAULT_FAST_MODEL']).toBe(BASE_PROVIDER.model);
    expect(env['ANTHROPIC_DEFAULT_SLOW_MODEL']).toBe(BASE_PROVIDER.model);
  });

  it('sets OAuth token and no API key for oauth provider', () => {
    const provider: OAuthProviderConfig = {
      kind: 'oauth',
      oauthToken: process.env.TEST_OAUTH_TOKEN ?? 'test-fixture-oauth',
      model: 'claude-opus-4-6',
    };

    const env = buildRunEnv(provider);

    expect(env['CLAUDE_CODE_OAUTH_TOKEN']).toBe(provider.oauthToken);
    expect(env['ANTHROPIC_API_KEY']).toBeUndefined();
    expect(env['ANTHROPIC_DEFAULT_MODEL']).toBe('claude-opus-4-6');
    expect(env['ANTHROPIC_DEFAULT_FAST_MODEL']).toBe('claude-opus-4-6');
    expect(env['ANTHROPIC_DEFAULT_SLOW_MODEL']).toBe('claude-opus-4-6');
  });

  it('inherits only allowlisted host variables', () => {
    const env = buildRunEnv(BASE_PROVIDER);

    expect(env['HOME']).toBe('/home/test');
    expect(env['PATH']).toBe('/usr/bin');
    expect(env['SHELL']).toBe('/bin/bash');
  });

  it('excludes non-allowlisted host variables', () => {
    const env = buildRunEnv(BASE_PROVIDER);

    expect(env['SECRET_TOKEN']).toBeUndefined();
    expect(env['RANDOM_VAR']).toBeUndefined();
  });
});
