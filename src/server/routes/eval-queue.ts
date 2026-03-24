// ---------------------------------------------------------------------------
// EvalQueue — concurrency-limited queue for evaluation execution
// ---------------------------------------------------------------------------

import type { EvaluatorConfig } from '../types/index.js';
import type { Evaluation } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate an evaluator config from request body. */
export function validateEvaluatorConfig(raw: unknown): EvaluatorConfig | string {
  if (!raw || typeof raw !== 'object') return 'Each evaluator must be an object';
  const obj = raw as Record<string, unknown>;
  if (!obj.role || typeof obj.role !== 'string') return 'Each evaluator must have a string role';
  if (!obj.provider || typeof obj.provider !== 'object') return 'Each evaluator must have a provider';

  const provider = obj.provider as Record<string, unknown>;
  if (!provider.model || typeof provider.model !== 'string') {
    return 'Each evaluator provider must have a string model';
  }

  const kind = provider.kind as string | undefined;
  if (kind === 'api') {
    if (!provider.apiKey || typeof provider.apiKey !== 'string') {
      return 'API provider requires apiKey';
    }
    if (!provider.baseUrl || typeof provider.baseUrl !== 'string') {
      return 'API provider requires baseUrl';
    }
    return {
      role: obj.role as string,
      provider: {
        kind: 'api',
        apiKey: provider.apiKey as string,
        baseUrl: provider.baseUrl as string,
        model: provider.model as string,
      },
    };
  }

  if (kind === 'oauth') {
    if (!provider.oauthToken || typeof provider.oauthToken !== 'string') {
      return 'OAuth provider requires oauthToken';
    }
    return {
      role: obj.role as string,
      provider: {
        kind: 'oauth',
        oauthToken: provider.oauthToken as string,
        model: provider.model as string,
      },
    };
  }

  return 'Provider kind must be "api" or "oauth"';
}

// ---------------------------------------------------------------------------
// Queue for evaluation execution
// ---------------------------------------------------------------------------

export interface EvalQueueEntry {
  evaluation: Evaluation;
  execute: () => Promise<void>;
}

export class EvalQueue {
  private readonly queue: EvalQueueEntry[] = [];
  private active = 0;
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = 1) {
    this.maxConcurrency = maxConcurrency;
  }

  enqueue(entry: EvalQueueEntry): void {
    this.queue.push(entry);
    void this.drain();
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get activeCount(): number {
    return this.active;
  }

  private async drain(): Promise<void> {
    while (this.active < this.maxConcurrency && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) break;
      this.active++;
      next.execute().finally(() => {
        this.active--;
        void this.drain();
      });
    }
  }
}
