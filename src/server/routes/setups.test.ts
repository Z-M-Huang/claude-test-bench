import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createSetupRoutes } from './setups.js';
import type { IStorage } from '../interfaces/storage.js';
import type { ILogger } from '../interfaces/logger.js';
import { BASE_PROVIDER, makeSetup, createMockStorage, createMockLogger } from './route-test-helpers.js';

function createApp(storage: IStorage, logger: ILogger): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/setups', createSetupRoutes(storage, logger));
  return app;
}

const VALID_BODY = {
  name: 'My Setup',
  description: 'desc',
  provider: BASE_PROVIDER,
  timeoutSeconds: 300,
};

describe('Setup routes', () => {
  let storage: IStorage;
  let logger: ILogger;
  let app: express.Express;

  beforeEach(() => {
    storage = createMockStorage();
    logger = createMockLogger();
    app = createApp(storage, logger);
  });

  describe('GET /api/setups', () => {
    it('returns metadata list of all setups', async () => {
      vi.mocked(storage.listSetups).mockResolvedValue([makeSetup()]);
      const res = await request(app).get('/api/setups');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([{
        id: 'setup-1',
        name: 'Test Setup',
        providerType: 'api',
        model: 'claude-sonnet-4-6',
        createdAt: '2026-01-01T00:00:00.000Z',
      }]);
    });

    it('returns empty array when no setups exist', async () => {
      vi.mocked(storage.listSetups).mockResolvedValue([]);
      const res = await request(app).get('/api/setups');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('returns 500 on storage failure', async () => {
      vi.mocked(storage.listSetups).mockRejectedValue(new Error('disk fail'));
      const res = await request(app).get('/api/setups');
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to list setups');
    });
  });

  describe('GET /api/setups/:id', () => {
    it('returns full setup with masked API key', async () => {
      vi.mocked(storage.getSetup).mockResolvedValue(makeSetup());
      const res = await request(app).get('/api/setups/setup-1');
      expect(res.status).toBe(200);
      expect(res.body.provider.apiKey).toBe('****1234');
      expect(res.body.name).toBe('Test Setup');
    });

    it('masks oauth token for oauth providers', async () => {
      const oauthSetup = makeSetup({
        provider: { kind: 'oauth', oauthToken: 'not-real-abcd', model: 'claude-sonnet-4-6' },
      });
      vi.mocked(storage.getSetup).mockResolvedValue(oauthSetup);
      const res = await request(app).get('/api/setups/setup-1');
      expect(res.status).toBe(200);
      expect(res.body.provider.oauthToken).toBe('****abcd');
    });

    it('masks short secrets correctly', async () => {
      const setup = makeSetup({ provider: { ...BASE_PROVIDER, apiKey: 'ab' } });
      vi.mocked(storage.getSetup).mockResolvedValue(setup);
      const res = await request(app).get('/api/setups/setup-1');
      expect(res.body.provider.apiKey).toBe('****');
    });

    it('returns 404 for non-existent setup', async () => {
      vi.mocked(storage.getSetup).mockResolvedValue(undefined);
      const res = await request(app).get('/api/setups/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Setup not found');
    });

    it('returns 500 on storage failure', async () => {
      vi.mocked(storage.getSetup).mockRejectedValue(new Error('disk fail'));
      const res = await request(app).get('/api/setups/setup-1');
      expect(res.status).toBe(500);
    });
  });

  describe('POST /api/setups', () => {
    it('creates a setup and returns it with masked key', async () => {
      vi.mocked(storage.saveSetup).mockResolvedValue(undefined);
      const res = await request(app).post('/api/setups').send(VALID_BODY);
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('My Setup');
      expect(res.body.provider.apiKey).toBe('****1234');
      expect(res.body.id).toBeDefined();
      expect(storage.saveSetup).toHaveBeenCalledTimes(1);
    });

    it('rejects missing name', async () => {
      const res = await request(app).post('/api/setups').send({ ...VALID_BODY, name: '' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name' })]),
      );
    });

    it('rejects missing provider', async () => {
      const res = await request(app).post('/api/setups').send({ name: 'Test', timeoutSeconds: 300 });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'provider' })]),
      );
    });

    it('rejects invalid provider kind', async () => {
      const res = await request(app).post('/api/setups').send({
        ...VALID_BODY, provider: { kind: 'invalid', model: 'x' },
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'provider.kind' })]),
      );
    });

    it('rejects api provider without apiKey', async () => {
      const res = await request(app).post('/api/setups').send({
        ...VALID_BODY, provider: { kind: 'api', baseUrl: 'http://example.com', model: 'x' },
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'provider.apiKey' })]),
      );
    });

    it('rejects oauth provider without token', async () => {
      const res = await request(app).post('/api/setups').send({
        ...VALID_BODY, provider: { kind: 'oauth', model: 'x' },
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'provider.oauthToken' })]),
      );
    });

    it('rejects too many claudeMdFiles', async () => {
      const res = await request(app).post('/api/setups').send({
        ...VALID_BODY,
        claudeMdFiles: [
          { role: 'project', content: 'a' },
          { role: 'user', content: 'b' },
          { role: 'project', content: 'c' },
        ],
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'claudeMdFiles' })]),
      );
    });

    it('rejects negative timeoutSeconds', async () => {
      const res = await request(app).post('/api/setups').send({ ...VALID_BODY, timeoutSeconds: -5 });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'timeoutSeconds' })]),
      );
    });

    it('rejects zero timeoutSeconds', async () => {
      const res = await request(app).post('/api/setups').send({ ...VALID_BODY, timeoutSeconds: 0 });
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'timeoutSeconds' })]),
      );
    });

    it('returns 500 on storage failure', async () => {
      vi.mocked(storage.saveSetup).mockRejectedValue(new Error('write fail'));
      const res = await request(app).post('/api/setups').send(VALID_BODY);
      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/setups/:id', () => {
    it('updates an existing setup', async () => {
      vi.mocked(storage.getSetup).mockResolvedValue(makeSetup());
      vi.mocked(storage.saveSetup).mockResolvedValue(undefined);
      const res = await request(app).put('/api/setups/setup-1').send({
        ...VALID_BODY, name: 'Updated Name',
      });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.id).toBe('setup-1');
    });

    it('returns 404 for non-existent setup', async () => {
      vi.mocked(storage.getSetup).mockResolvedValue(undefined);
      const res = await request(app).put('/api/setups/nonexistent').send(VALID_BODY);
      expect(res.status).toBe(404);
    });

    it('validates body on update', async () => {
      vi.mocked(storage.getSetup).mockResolvedValue(makeSetup());
      const res = await request(app).put('/api/setups/setup-1').send({ name: '' });
      expect(res.status).toBe(400);
    });

    it('returns 500 on storage failure', async () => {
      vi.mocked(storage.getSetup).mockResolvedValue(makeSetup());
      vi.mocked(storage.saveSetup).mockRejectedValue(new Error('fail'));
      const res = await request(app).put('/api/setups/setup-1').send(VALID_BODY);
      expect(res.status).toBe(500);
    });
  });

  describe('DELETE /api/setups/:id', () => {
    it('deletes an existing setup', async () => {
      vi.mocked(storage.deleteSetup).mockResolvedValue(true);
      const res = await request(app).delete('/api/setups/setup-1');
      expect(res.status).toBe(204);
    });

    it('returns 404 for non-existent setup', async () => {
      vi.mocked(storage.deleteSetup).mockResolvedValue(false);
      const res = await request(app).delete('/api/setups/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 500 on storage failure', async () => {
      vi.mocked(storage.deleteSetup).mockRejectedValue(new Error('fail'));
      const res = await request(app).delete('/api/setups/setup-1');
      expect(res.status).toBe(500);
    });
  });
});
