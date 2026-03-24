import { describe, it, expect } from 'vitest';
import { formatTranscript } from './transcript-formatter.js';
import type { SDKMessageRecord } from '../types/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function msg(message: Record<string, unknown>, timestamp = '2026-01-01T00:00:00Z'): SDKMessageRecord {
  return { timestamp, message };
}

function assistantMsg(text: string): SDKMessageRecord {
  return msg({
    type: 'assistant',
    message: { content: [{ type: 'text', text }] },
  });
}

function toolUseMsg(name: string, input: Record<string, unknown> = {}): SDKMessageRecord {
  return msg({ type: 'tool_use', name, input });
}

function toolResultMsg(content: string, isError = false): SDKMessageRecord {
  return msg({ type: 'tool_result', content, is_error: isError });
}

// ---------------------------------------------------------------------------
// Signal extraction, file access tracking, retry detection, truncation
// ---------------------------------------------------------------------------

describe('formatTranscript signals', () => {
  describe('file access tracking', () => {
    it('tracks files read by Read tool', () => {
      const result = formatTranscript([
        toolUseMsg('Read', { file_path: '/src/index.ts' }),
      ]);
      expect(result.summary.filesRead).toContain('/src/index.ts');
    });

    it('tracks files read by Glob tool', () => {
      const result = formatTranscript([
        toolUseMsg('Glob', { path: '/src' }),
      ]);
      expect(result.summary.filesRead).toContain('/src');
    });

    it('tracks files read by Grep tool', () => {
      const result = formatTranscript([
        toolUseMsg('Grep', { path: '/src/lib' }),
      ]);
      expect(result.summary.filesRead).toContain('/src/lib');
    });

    it('tracks files modified by Edit tool', () => {
      const result = formatTranscript([
        toolUseMsg('Edit', { file_path: '/src/main.ts' }),
      ]);
      expect(result.summary.filesModified).toContain('/src/main.ts');
    });

    it('tracks files modified by Write tool', () => {
      const result = formatTranscript([
        toolUseMsg('Write', { file_path: '/src/new.ts' }),
      ]);
      expect(result.summary.filesModified).toContain('/src/new.ts');
    });

    it('tracks files modified by NotebookEdit tool', () => {
      const result = formatTranscript([
        toolUseMsg('NotebookEdit', { file_path: '/nb.ipynb' }),
      ]);
      expect(result.summary.filesModified).toContain('/nb.ipynb');
    });

    it('deduplicates file paths', () => {
      const result = formatTranscript([
        toolUseMsg('Read', { file_path: '/src/a.ts' }),
        toolResultMsg('contents'),
        toolUseMsg('Read', { file_path: '/src/a.ts' }),
      ]);
      expect(result.summary.filesRead).toEqual(['/src/a.ts']);
    });

    it('uses filename fallback for path detection', () => {
      const result = formatTranscript([
        toolUseMsg('Read', { filename: '/alt/path.ts' }),
      ]);
      expect(result.summary.filesRead).toContain('/alt/path.ts');
    });

    it('ignores tools without file path input', () => {
      const result = formatTranscript([
        toolUseMsg('Bash', { command: 'ls' }),
      ]);
      expect(result.summary.filesRead).toEqual([]);
      expect(result.summary.filesModified).toEqual([]);
    });

    it('ignores tools with no input at all', () => {
      const record = msg({ type: 'tool_use', name: 'Read' });
      const result = formatTranscript([record]);
      expect(result.summary.filesRead).toEqual([]);
    });
  });

  describe('retry patterns', () => {
    it('detects retry pattern when same tool is called consecutively after error', () => {
      const result = formatTranscript([
        toolUseMsg('Bash', { command: 'npm test' }),
        toolResultMsg('exit code 1', true),
        toolUseMsg('Bash', { command: 'npm test' }),
        toolResultMsg('exit code 1', true),
      ]);
      expect(result.summary.retryPatterns).toContain('Repeated Bash after error');
    });

    it('does not flag retry when different tools are called', () => {
      const result = formatTranscript([
        toolUseMsg('Read', { file_path: '/a' }),
        toolResultMsg('error', true),
        toolUseMsg('Bash', { command: 'cat /a' }),
        toolResultMsg('error', true),
      ]);
      expect(result.summary.retryPatterns).toEqual([]);
    });

    it('does not duplicate retry patterns', () => {
      const result = formatTranscript([
        toolUseMsg('Bash', { command: 'test' }),
        toolResultMsg('fail', true),
        toolUseMsg('Bash', { command: 'test' }),
        toolResultMsg('fail', true),
        toolUseMsg('Bash', { command: 'test' }),
        toolResultMsg('fail', true),
      ]);
      expect(result.summary.retryPatterns).toHaveLength(1);
    });

    it('does not detect retry with only one tool call before error', () => {
      const result = formatTranscript([
        toolUseMsg('Bash', { command: 'test' }),
        toolResultMsg('fail', true),
      ]);
      expect(result.summary.retryPatterns).toEqual([]);
    });
  });

  describe('truncation', () => {
    it('truncates transcript at 100K characters', () => {
      const messages: SDKMessageRecord[] = [];
      for (let i = 0; i < 100; i++) {
        messages.push(assistantMsg('A'.repeat(1050)));
      }
      const result = formatTranscript(messages);
      expect(result.text.length).toBeLessThanOrEqual(110_000);
      expect(result.text).toContain('[transcript truncated]');
    });

    it('does not add truncated marker when under limit', () => {
      const result = formatTranscript([assistantMsg('Short message')]);
      expect(result.text).not.toContain('[transcript truncated]');
    });

    it('stops processing messages after truncation', () => {
      const messages: SDKMessageRecord[] = [];
      for (let i = 0; i < 200; i++) {
        messages.push(assistantMsg('X'.repeat(1000)));
      }
      messages.push(toolUseMsg('ShouldNotAppear'));
      const result = formatTranscript(messages);
      expect(result.text).not.toContain('ShouldNotAppear');
    });
  });
});
