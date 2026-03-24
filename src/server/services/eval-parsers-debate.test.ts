import { describe, it, expect } from 'vitest';
import {
  parseSynthesisResponse,
  parseDebateResponse,
  toIndividualEvaluations,
} from './eval-parsers.js';

// ---------------------------------------------------------------------------
// parseSynthesisResponse
// ---------------------------------------------------------------------------

describe('parseSynthesisResponse', () => {
  it('parses valid JSON', () => {
    const input = JSON.stringify({
      dimensionScores: { accuracy: 8, clarity: 9 },
      weightedTotal: 8.5,
      confidence: 0.92,
      dissenting: ['evaluator-2'],
    });
    const result = parseSynthesisResponse(input);

    expect(result.dimensionScores).toEqual({ accuracy: 8, clarity: 9 });
    expect(result.weightedTotal).toBe(8.5);
    expect(result.confidence).toBe(0.92);
    expect(result.dissenting).toEqual(['evaluator-2']);
  });

  it('clamps weightedTotal to [0, 10]', () => {
    const input = JSON.stringify({ weightedTotal: 15 });
    const result = parseSynthesisResponse(input);
    expect(result.weightedTotal).toBe(10);
  });

  it('clamps confidence to [0, 1]', () => {
    const input = JSON.stringify({ confidence: -0.5 });
    const result = parseSynthesisResponse(input);
    expect(result.confidence).toBe(0);
  });

  it('falls back to text parsing for weighted total', () => {
    const input = 'The weighted total: 7.3 across all dimensions';
    const result = parseSynthesisResponse(input);
    expect(result.weightedTotal).toBe(7.3);
  });

  it('matches "weighted average" in text fallback', () => {
    const input = 'Weighted average: 6';
    const result = parseSynthesisResponse(input);
    expect(result.weightedTotal).toBe(6);
  });

  it('matches "weighted score" in text fallback', () => {
    const input = 'Weighted Score 8.2';
    const result = parseSynthesisResponse(input);
    expect(result.weightedTotal).toBe(8.2);
  });

  it('returns undefined weightedTotal when no match in text', () => {
    const input = 'No relevant numbers here.';
    const result = parseSynthesisResponse(input);
    expect(result.weightedTotal).toBeUndefined();
  });

  it('extracts from fenced code block', () => {
    const input = '```\n{"weightedTotal": 7, "confidence": 0.8}\n```';
    const result = parseSynthesisResponse(input);
    expect(result.weightedTotal).toBe(7);
    expect(result.confidence).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// parseDebateResponse
// ---------------------------------------------------------------------------

describe('parseDebateResponse', () => {
  it('parses valid JSON with all fields', () => {
    const input = JSON.stringify({
      verdict: 'AGREE',
      updatedScores: { quality: 9 },
      critiques: ['Minor issue'],
      reasoning: 'Looks good overall',
    });
    const result = parseDebateResponse(input);

    expect(result.verdict).toBe('AGREE');
    expect(result.updatedScores).toEqual({ quality: 9 });
    expect(result.critiques).toEqual(['Minor issue']);
    expect(result.reasoning).toBe('Looks good overall');
  });

  it('normalizes verdict to uppercase', () => {
    const input = JSON.stringify({ verdict: 'disagree' });
    const result = parseDebateResponse(input);
    expect(result.verdict).toBe('DISAGREE');
  });

  it('defaults invalid verdict to PARTIAL', () => {
    const input = JSON.stringify({ verdict: 'invalid' });
    const result = parseDebateResponse(input);
    expect(result.verdict).toBe('PARTIAL');
  });

  it('defaults non-string verdict to PARTIAL', () => {
    const input = JSON.stringify({ verdict: 42 });
    const result = parseDebateResponse(input);
    expect(result.verdict).toBe('PARTIAL');
  });

  it('handles non-string reasoning', () => {
    const input = JSON.stringify({ reasoning: 123 });
    const result = parseDebateResponse(input);
    expect(result.reasoning).toBeUndefined();
  });

  it('falls back to text parsing for verdict', () => {
    const input = 'After review, VERDICT: DISAGREE\nQuality: 5/10';
    const result = parseDebateResponse(input);
    expect(result.verdict).toBe('DISAGREE');
  });

  it('extracts scores from text fallback', () => {
    const input = 'Accuracy: 8\nClarity: 7.5\nVERDICT: AGREE';
    const result = parseDebateResponse(input);
    expect(result.verdict).toBe('AGREE');
    expect(result.updatedScores?.['Accuracy']).toBe(8);
    expect(result.updatedScores?.['Clarity']).toBe(7.5);
  });

  it('defaults to PARTIAL when no verdict in text', () => {
    const input = 'Some discussion with no clear verdict.';
    const result = parseDebateResponse(input);
    expect(result.verdict).toBe('PARTIAL');
  });

  it('skips VERDICT dimension in text score extraction', () => {
    const input = 'VERDICT: AGREE\nSome random text';
    const result = parseDebateResponse(input);
    expect(result.updatedScores).toBeUndefined();
  });

  it('returns undefined updatedScores when no scores in text', () => {
    const input = 'VERDICT: PARTIAL\nNo scores here.';
    const result = parseDebateResponse(input);
    expect(result.updatedScores).toBeUndefined();
  });

  it('ignores scores above 10 in text fallback', () => {
    const input = 'VERDICT: AGREE\nBigNum: 50\nSmall: 3';
    const result = parseDebateResponse(input);
    expect(result.updatedScores?.['BigNum']).toBeUndefined();
    expect(result.updatedScores?.['Small']).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// toIndividualEvaluations
// ---------------------------------------------------------------------------

describe('toIndividualEvaluations', () => {
  it('converts scores map to evaluation entries', () => {
    const scores = { accuracy: 8, clarity: 7 };
    const reasoning = { accuracy: 'Good', clarity: 'Clear' };
    const result = toIndividualEvaluations(scores, 'primary', reasoning);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      evaluatorRole: 'primary',
      dimension: 'accuracy',
      score: 8,
      reasoning: 'Good',
    });
  });

  it('defaults reasoning to empty string when missing', () => {
    const scores = { dim: 5 };
    const result = toIndividualEvaluations(scores, 'role', {});
    expect(result[0].reasoning).toBe('');
  });

  it('clamps scores to [0, 10]', () => {
    const scores = { dim: 15 };
    const result = toIndividualEvaluations(scores, 'role', {});
    expect(result[0].score).toBe(10);
  });

  it('returns empty array for empty scores', () => {
    const result = toIndividualEvaluations({}, 'role', {});
    expect(result).toEqual([]);
  });
});
