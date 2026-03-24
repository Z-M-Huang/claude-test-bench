import { describe, it, expect } from 'vitest';
import {
  parseScoreResponse,
  parseComplianceResponse,
  toInstructionCompliance,
} from './eval-parsers.js';

// ---------------------------------------------------------------------------
// parseScoreResponse
// ---------------------------------------------------------------------------

describe('parseScoreResponse', () => {
  it('parses valid JSON with all fields', () => {
    const input = JSON.stringify({
      scores: { accuracy: 8, clarity: 7 },
      overallCloseness: 0.85,
      missedCritical: ['edge case'],
      strengths: ['good structure'],
      weaknesses: ['missing tests'],
      summary: 'Overall good',
    });
    const result = parseScoreResponse(input);

    expect(result.scores).toEqual({ accuracy: 8, clarity: 7 });
    expect(result.overallCloseness).toBe(0.85);
    expect(result.missedCritical).toEqual(['edge case']);
    expect(result.strengths).toEqual(['good structure']);
    expect(result.weaknesses).toEqual(['missing tests']);
    expect(result.summary).toBe('Overall good');
  });

  it('clamps overallCloseness to [0, 1]', () => {
    const input = JSON.stringify({ overallCloseness: 1.5 });
    const result = parseScoreResponse(input);
    expect(result.overallCloseness).toBe(1);
  });

  it('clamps scores to [0, 10]', () => {
    const input = JSON.stringify({ scores: { dim: 15 } });
    const result = parseScoreResponse(input);
    expect(result.scores?.['dim']).toBe(10);
  });

  it('handles undefined overallCloseness', () => {
    const input = JSON.stringify({ scores: {} });
    const result = parseScoreResponse(input);
    expect(result.overallCloseness).toBe(0);
  });

  it('handles non-string summary', () => {
    const input = JSON.stringify({ summary: 42 });
    const result = parseScoreResponse(input);
    expect(result.summary).toBeUndefined();
  });

  it('handles non-array missedCritical', () => {
    const input = JSON.stringify({ missedCritical: 'not-an-array' });
    const result = parseScoreResponse(input);
    expect(result.missedCritical).toEqual([]);
  });

  it('filters non-string entries from arrays', () => {
    const input = JSON.stringify({
      strengths: ['real', 42, null, 'also real'],
    });
    const result = parseScoreResponse(input);
    expect(result.strengths).toEqual(['real', 'also real']);
  });

  it('extracts JSON from fenced code block', () => {
    const input = 'Here is my analysis:\n```json\n{"scores": {"quality": 9}, "overallCloseness": 0.9}\n```';
    const result = parseScoreResponse(input);
    expect(result.scores).toEqual({ quality: 9 });
    expect(result.overallCloseness).toBe(0.9);
  });

  it('extracts JSON from bare braces in text', () => {
    const input = 'Some preamble text\n{"scores": {"depth": 6}}\nSome trailing text';
    const result = parseScoreResponse(input);
    expect(result.scores).toEqual({ depth: 6 });
  });

  it('falls back to regex parsing for plain text', () => {
    const input = 'Accuracy: 8/10\nClarity: 7\nDepth: 6.5';
    const result = parseScoreResponse(input);
    expect(result.scores?.['Accuracy']).toBe(8);
    expect(result.scores?.['Clarity']).toBe(7);
    expect(result.scores?.['Depth']).toBe(6.5);
  });

  it('ignores scores above 10 in text fallback', () => {
    const input = 'Quality: 15\nRelevance: 8';
    const result = parseScoreResponse(input);
    expect(result.scores?.['Quality']).toBeUndefined();
    expect(result.scores?.['Relevance']).toBe(8);
  });

  it('returns undefined scores when no pattern matches', () => {
    const input = 'No scores here whatsoever.';
    const result = parseScoreResponse(input);
    expect(result.scores).toBeUndefined();
  });

  it('skips NaN values in validScores', () => {
    const input = JSON.stringify({ scores: { good: 5, bad: NaN } });
    const result = parseScoreResponse(input);
    expect(result.scores).toEqual({ good: 5 });
  });

  it('handles scores that are not an object', () => {
    const input = JSON.stringify({ scores: 'not-an-object' });
    const result = parseScoreResponse(input);
    expect(result.scores).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseComplianceResponse
// ---------------------------------------------------------------------------

describe('parseComplianceResponse', () => {
  it('parses JSON with categorized results', () => {
    const input = JSON.stringify({
      results: [
        { instruction: 'Use TS', status: 'followed' },
        { instruction: 'No console.log', status: 'violated' },
        { instruction: 'Use Docker', status: 'not_applicable' },
      ],
      overallCompliance: 0.7,
    });
    const result = parseComplianceResponse(input);

    expect(result.followed).toEqual(['Use TS']);
    expect(result.violated).toEqual(['No console.log']);
    expect(result.notApplicable).toEqual(['Use Docker']);
    expect(result.overallCompliance).toBe(0.7);
  });

  it('defaults instruction text to (unknown) when missing', () => {
    const input = JSON.stringify({
      results: [{ status: 'followed' }],
    });
    const result = parseComplianceResponse(input);
    expect(result.followed).toEqual(['(unknown)']);
  });

  it('puts unrecognized statuses into notApplicable', () => {
    const input = JSON.stringify({
      results: [{ instruction: 'test', status: 'unknown-status' }],
    });
    const result = parseComplianceResponse(input);
    expect(result.notApplicable).toEqual(['test']);
  });

  it('handles empty results array', () => {
    const input = JSON.stringify({ results: [], overallCompliance: 1.0 });
    const result = parseComplianceResponse(input);
    expect(result.followed).toEqual([]);
    expect(result.violated).toEqual([]);
  });

  it('handles missing results field', () => {
    const input = JSON.stringify({ overallCompliance: 0.5 });
    const result = parseComplianceResponse(input);
    expect(result.followed).toEqual([]);
    expect(result.overallCompliance).toBe(0.5);
  });

  it('falls back to text parsing when JSON is invalid', () => {
    const input = 'The agent followed all rules and was compliant.';
    const result = parseComplianceResponse(input);
    expect(result.followed).toEqual(['(extracted from text)']);
    expect(result.violated).toEqual([]);
  });

  it('detects violation keywords in text fallback', () => {
    const input = 'The agent violated the no-commit rule and was non-compliant.';
    const result = parseComplianceResponse(input);
    expect(result.violated).toEqual(['(extracted from text)']);
  });

  it('detects both followed and violated in text', () => {
    const input = 'Some rules were followed, but one was violated.';
    const result = parseComplianceResponse(input);
    expect(result.followed).toEqual(['(extracted from text)']);
    expect(result.violated).toEqual(['(extracted from text)']);
  });

  it('clamps overallCompliance to [0, 1]', () => {
    const input = JSON.stringify({ results: [], overallCompliance: 2.0 });
    const result = parseComplianceResponse(input);
    expect(result.overallCompliance).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// toInstructionCompliance
// ---------------------------------------------------------------------------

describe('toInstructionCompliance', () => {
  it('provides defaults for missing fields', () => {
    const result = toInstructionCompliance({});
    expect(result.followed).toEqual([]);
    expect(result.violated).toEqual([]);
    expect(result.notApplicable).toEqual([]);
    expect(result.overallCompliance).toBe(0);
  });

  it('passes through provided fields', () => {
    const result = toInstructionCompliance({
      followed: ['a'],
      violated: ['b'],
      notApplicable: ['c'],
      overallCompliance: 0.8,
    });
    expect(result.followed).toEqual(['a']);
    expect(result.violated).toEqual(['b']);
    expect(result.notApplicable).toEqual(['c']);
    expect(result.overallCompliance).toBe(0.8);
  });
});
