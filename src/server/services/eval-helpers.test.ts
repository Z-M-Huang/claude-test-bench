import { describe, it, expect } from 'vitest';
import {
  checkConsensus,
  buildAnswerComparison,
  buildCriticalResults,
  mergeCompliance,
} from './eval-helpers.js';
import type { EvaluatorAccumulator } from './eval-helpers.js';
import { makeScenario } from './storage-test-helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mkAcc(overrides: Partial<EvaluatorAccumulator> = {}): EvaluatorAccumulator {
  return {
    role: 'primary',
    costUsd: 0,
    tokensIn: 0,
    tokensOut: 0,
    rounds: 1,
    scoreResult: {},
    complianceResult: {},
    assessmentText: '',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// checkConsensus
// ---------------------------------------------------------------------------

describe('checkConsensus', () => {
  it('returns true for single evaluator', () => {
    expect(checkConsensus([mkAcc()])).toBe(true);
  });

  it('returns true for empty evaluators', () => {
    expect(checkConsensus([])).toBe(true);
  });

  it('returns true when scores are within 1 point', () => {
    const accumulators = [
      mkAcc({ scoreResult: { scores: { quality: 8 } } }),
      mkAcc({ role: 'secondary', scoreResult: { scores: { quality: 8.5 } } }),
    ];
    expect(checkConsensus(accumulators)).toBe(true);
  });

  it('returns false when scores differ by more than 1 point', () => {
    const accumulators = [
      mkAcc({ scoreResult: { scores: { quality: 9 } } }),
      mkAcc({ role: 'secondary', scoreResult: { scores: { quality: 5 } } }),
    ];
    expect(checkConsensus(accumulators)).toBe(false);
  });

  it('returns false when any evaluator has empty scores', () => {
    const accumulators = [
      mkAcc({ scoreResult: { scores: { quality: 8 } } }),
      mkAcc({ role: 'secondary', scoreResult: { scores: {} } }),
    ];
    expect(checkConsensus(accumulators)).toBe(false);
  });

  it('returns false when any evaluator has no scores at all', () => {
    const accumulators = [
      mkAcc({ scoreResult: { scores: { quality: 8 } } }),
      mkAcc({ role: 'secondary', scoreResult: {} }),
    ];
    expect(checkConsensus(accumulators)).toBe(false);
  });

  it('skips dimensions where only one evaluator has a value', () => {
    const accumulators = [
      mkAcc({ scoreResult: { scores: { quality: 8, bonus: 10 } } }),
      mkAcc({ role: 'secondary', scoreResult: { scores: { quality: 8 } } }),
    ];
    // bonus is only in one evaluator, so it's skipped; quality is within 1
    expect(checkConsensus(accumulators)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildAnswerComparison
// ---------------------------------------------------------------------------

describe('buildAnswerComparison', () => {
  it('computes average closeness >= 0.7 as matching', () => {
    const accs = [
      mkAcc({ scoreResult: { overallCloseness: 0.8, summary: 'Good' } }),
      mkAcc({ scoreResult: { overallCloseness: 0.9, summary: 'Great' } }),
    ];
    const result = buildAnswerComparison(accs);
    expect(result.matches).toBe(true);
    expect(result.similarity).toBeCloseTo(0.85, 1);
    expect(result.explanation).toBe('Good');
  });

  it('computes average closeness < 0.7 as not matching', () => {
    const accs = [
      mkAcc({ scoreResult: { overallCloseness: 0.3 } }),
      mkAcc({ scoreResult: { overallCloseness: 0.4 } }),
    ];
    const result = buildAnswerComparison(accs);
    expect(result.matches).toBe(false);
  });

  it('defaults to 0 similarity when no closeness values', () => {
    const accs = [mkAcc({ scoreResult: {} })];
    const result = buildAnswerComparison(accs);
    expect(result.similarity).toBe(0);
    expect(result.matches).toBe(false);
  });

  it('filters out zero and undefined closeness values', () => {
    const accs = [
      mkAcc({ scoreResult: { overallCloseness: 0 } }),
      mkAcc({ scoreResult: { overallCloseness: 0.8 } }),
    ];
    const result = buildAnswerComparison(accs);
    expect(result.similarity).toBe(0.8);
  });

  it('provides default explanation when no summaries', () => {
    const accs = [mkAcc({ scoreResult: { overallCloseness: 0.9 } })];
    const result = buildAnswerComparison(accs);
    expect(result.explanation).toBe('No explanation available');
  });
});

// ---------------------------------------------------------------------------
// buildCriticalResults
// ---------------------------------------------------------------------------

describe('buildCriticalResults', () => {
  it('marks met requirements as met', () => {
    const accs = [mkAcc({ scoreResult: { missedCritical: [] } })];
    const scenario = makeScenario({ criticalRequirements: ['Must be fast'] });
    const results = buildCriticalResults(accs, scenario);
    expect(results[0].met).toBe(true);
    expect(results[0].evidence).toBe('Not flagged');
  });

  it('marks missed requirements as not met', () => {
    const accs = [mkAcc({ scoreResult: { missedCritical: ['Must be fast'] } })];
    const scenario = makeScenario({ criticalRequirements: ['Must be fast'] });
    const results = buildCriticalResults(accs, scenario);
    expect(results[0].met).toBe(false);
    expect(results[0].evidence).toContain('Flagged as missed');
  });

  it('handles missing missedCritical field', () => {
    const accs = [mkAcc({ scoreResult: {} })];
    const scenario = makeScenario({ criticalRequirements: ['Check'] });
    const results = buildCriticalResults(accs, scenario);
    expect(results[0].met).toBe(true);
  });

  it('returns empty array for no critical requirements', () => {
    const accs = [mkAcc()];
    const scenario = makeScenario({ criticalRequirements: [] });
    expect(buildCriticalResults(accs, scenario)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mergeCompliance
// ---------------------------------------------------------------------------

describe('mergeCompliance', () => {
  it('merges compliance from multiple evaluators', () => {
    const accs = [
      mkAcc({
        complianceResult: {
          followed: ['rule-a'],
          violated: ['rule-b'],
          notApplicable: ['rule-c'],
          overallCompliance: 0.8,
        },
      }),
      mkAcc({
        role: 'secondary',
        complianceResult: {
          followed: ['rule-a', 'rule-d'],
          violated: [],
          notApplicable: [],
          overallCompliance: 0.9,
        },
      }),
    ];
    const result = mergeCompliance(accs);
    expect(result.followed).toContain('rule-a');
    expect(result.followed).toContain('rule-d');
    expect(result.violated).toContain('rule-b');
    expect(result.notApplicable).toContain('rule-c');
    expect(result.overallCompliance).toBeCloseTo(0.85, 1);
  });

  it('handles missing compliance arrays', () => {
    const accs = [mkAcc({ complianceResult: {} })];
    const result = mergeCompliance(accs);
    expect(result.followed).toEqual([]);
    expect(result.violated).toEqual([]);
    expect(result.notApplicable).toEqual([]);
    expect(result.overallCompliance).toBe(0);
  });

  it('handles undefined overallCompliance', () => {
    const accs = [
      mkAcc({ complianceResult: { followed: ['a'], overallCompliance: undefined } }),
    ];
    const result = mergeCompliance(accs);
    expect(result.overallCompliance).toBe(0);
  });
});
