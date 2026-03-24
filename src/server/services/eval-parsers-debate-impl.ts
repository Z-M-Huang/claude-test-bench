// ---------------------------------------------------------------------------
// Debate & Synthesis parsers — extracted from eval-parsers.ts
// ---------------------------------------------------------------------------

import type { EvaluationSynthesis } from '../types/evaluation.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Verdict = 'AGREE' | 'DISAGREE' | 'PARTIAL';

export interface DebateParseResult {
  readonly verdict: Verdict;
  readonly updatedScores: Readonly<Record<string, number>>;
  readonly critiques: readonly string[];
  readonly reasoning: string;
}

// ---------------------------------------------------------------------------
// Synthesis response
// ---------------------------------------------------------------------------

export function parseSynthesisResponse(response: string): Partial<EvaluationSynthesis> {
  const parsed = tryParseJson<RawSynthesisResponse>(response);
  if (parsed) {
    return {
      dimensionScores: validScores(parsed.dimensionScores),
      weightedTotal: clampScore(parsed.weightedTotal),
      confidence: clamp01(parsed.confidence),
      dissenting: toStringArray(parsed.dissenting),
    };
  }
  return parseSynthesisFromText(response);
}

// ---------------------------------------------------------------------------
// Debate verdict parsing
// ---------------------------------------------------------------------------

export function parseDebateResponse(response: string): Partial<DebateParseResult> {
  const parsed = tryParseJson<RawDebateResponse>(response);
  if (parsed) {
    return {
      verdict: parseVerdict(parsed.verdict),
      updatedScores: validScores(parsed.updatedScores),
      critiques: toStringArray(parsed.critiques),
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
    };
  }

  // Fallback: extract verdict and scores from text patterns
  return parseDebateFromText(response);
}

// ---------------------------------------------------------------------------
// Internal: Text fallback parsers
// ---------------------------------------------------------------------------

function parseDebateFromText(text: string): Partial<DebateParseResult> {
  // Try to extract verdict from text patterns like "VERDICT: AGREE"
  const verdictMatch = text.match(/VERDICT\s*:\s*(AGREE|DISAGREE|PARTIAL)/i);
  const verdict = verdictMatch ? parseVerdict(verdictMatch[1]) : 'PARTIAL' as Verdict;

  // Try to extract scores using the same pattern as score text fallback
  const scores: Record<string, number> = {};
  const scorePattern = /(\w[\w\s]*?):\s*(\d+(?:\.\d+)?)\s*(?:\/\s*10)?/g;
  let match: RegExpExecArray | null;
  while ((match = scorePattern.exec(text)) !== null) {
    const dim = match[1].trim();
    // Skip the VERDICT line we already parsed
    if (/^verdict$/i.test(dim)) continue;
    const val = parseFloat(match[2]);
    if (!isNaN(val) && val <= 10) scores[dim] = val;
  }

  return {
    verdict,
    updatedScores: Object.keys(scores).length > 0 ? scores : undefined,
  };
}

function parseSynthesisFromText(text: string): Partial<EvaluationSynthesis> {
  const scoreMatch = text.match(
    /weighted\s*(?:total|average|score)\s*:?\s*(\d+(?:\.\d+)?)/i,
  );
  return {
    weightedTotal: scoreMatch ? clampScore(parseFloat(scoreMatch[1])) : undefined,
  };
}

// ---------------------------------------------------------------------------
// Internal: JSON parsing
// ---------------------------------------------------------------------------

function tryParseJson<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    // fall through
  }
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]) as T;
    } catch {
      // fall through
    }
  }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]) as T;
    } catch {
      // fall through
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Internal: Raw response shapes
// ---------------------------------------------------------------------------

interface RawSynthesisResponse {
  dimensionScores?: Record<string, number>;
  weightedTotal?: number;
  confidence?: number;
  dissenting?: string[];
}

interface RawDebateResponse {
  verdict?: string;
  updatedScores?: Record<string, number>;
  critiques?: string[];
  reasoning?: string;
}

// ---------------------------------------------------------------------------
// Internal: Utilities
// ---------------------------------------------------------------------------

function validScores(
  scores: Record<string, number> | undefined,
): Record<string, number> {
  if (!scores || typeof scores !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) {
    if (typeof v === 'number' && !isNaN(v)) result[k] = clampScore(v);
  }
  return result;
}

function clamp01(val: number | undefined): number {
  if (val === undefined || isNaN(val)) return 0;
  return Math.max(0, Math.min(1, val));
}

function clampScore(val: number | undefined): number {
  if (val === undefined || isNaN(val)) return 0;
  return Math.max(0, Math.min(10, val));
}

function toStringArray(arr: unknown): readonly string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((x): x is string => typeof x === 'string');
}

function parseVerdict(val: unknown): Verdict {
  if (typeof val === 'string') {
    const upper = val.toUpperCase();
    if (upper === 'AGREE' || upper === 'DISAGREE' || upper === 'PARTIAL') {
      return upper;
    }
  }
  return 'PARTIAL';
}
