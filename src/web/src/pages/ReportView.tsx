import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import type { Evaluation, Run } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ReportHeader } from '../components/ReportHeader.js';
import { ScoreBreakdown } from '../components/ScoreBreakdown.js';
import { CriticalChecklist } from '../components/CriticalChecklist.js';
import { AnswerComparison } from '../components/AnswerComparison.js';
import { ComplianceTable } from '../components/ComplianceTable.js';
import { UsagePanel } from '../components/UsagePanel.js';
import { StrengthsWeaknesses } from '../components/StrengthsWeaknesses.js';

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="bg-surface-container-low rounded-lg border border-outline-variant/5 overflow-hidden">
      <div className="px-4 py-3 bg-surface-container border-b border-outline-variant/10 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary/60" style={{ fontSize: '1.1rem' }}>{icon}</span>
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function extractStrengthsWeaknesses(evaluation: Evaluation): {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  // Derive from scores
  const scores = evaluation.synthesis.dimensionScores;
  for (const [dim, score] of Object.entries(scores)) {
    if (score >= 8) strengths.push(`Strong performance on ${dim} (${score.toFixed(1)}/10)`);
    if (score < 4) weaknesses.push(`Low score on ${dim} (${score.toFixed(1)}/10)`);
  }

  // From critical results
  const failedCritical = evaluation.criticalResults.filter((r) => !r.met);
  for (const f of failedCritical) {
    weaknesses.push(`Failed: ${f.requirement}`);
    recommendations.push(`Address critical requirement: ${f.requirement}`);
  }

  // From compliance
  for (const v of evaluation.setupCompliance.instructionCompliance.violated) {
    weaknesses.push(`Violated instruction: ${v}`);
  }

  if (strengths.length === 0) strengths.push('Evaluation completed successfully');

  return { strengths, weaknesses, recommendations };
}

export function ReportView(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    api.evaluations.get(id)
      .then(async (evalData) => {
        if (cancelled) return;
        setEvaluation(evalData);
        const runData = await api.runs.get(evalData.runId);
        if (!cancelled) setRun(runData);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load evaluation');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-on-surface-variant text-sm animate-pulse">Loading evaluation report...</div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error text-sm">{error ?? 'Evaluation not found'}</div>
      </div>
    );
  }

  const { strengths, weaknesses, recommendations } = extractStrengthsWeaknesses(evaluation);
  const scenario = run?.scenarioSnapshot;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-on-surface-variant text-xs font-mono">
        <button type="button" onClick={() => navigate('/history')} className="hover:text-on-surface transition-colors">
          History
        </button>
        <span>/</span>
        {run && (
          <>
            <button type="button" onClick={() => navigate(`/runs/${run.id}`)} className="hover:text-on-surface transition-colors">
              Run {run.id.slice(0, 8)}
            </button>
            <span>/</span>
          </>
        )}
        <span>Evaluation</span>
      </div>

      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface mb-1">Evaluation Report</h1>
          <p className="text-on-surface-variant text-sm">
            {scenario ? `Scenario: ${scenario.name}` : `Run: ${evaluation.runId.slice(0, 8)}`}
          </p>
        </div>
        <StatusBadge status={evaluation.status} />
      </div>

      {/* Report Header */}
      {evaluation.synthesis && (
        <ReportHeader
          synthesis={evaluation.synthesis}
          answerComparison={evaluation.answerComparison}
          totalCostUsd={evaluation.totalCostUsd}
          numRounds={evaluation.rounds.length}
        />
      )}

      {/* Score Breakdown */}
      {evaluation.synthesis && (
        <SectionCard title="Score Breakdown" icon="analytics">
          <ScoreBreakdown
            dimensionScores={evaluation.synthesis.dimensionScores}
            dimensions={scenario?.scoringDimensions ?? []}
          />
        </SectionCard>
      )}

      {/* Critical Checklist */}
      <SectionCard title="Critical Requirements" icon="checklist">
        <CriticalChecklist results={evaluation.criticalResults} />
      </SectionCard>

      {/* Answer Comparison */}
      <SectionCard title="Answer Comparison" icon="compare_arrows">
        <AnswerComparison
          comparison={evaluation.answerComparison}
          expectedAnswer={scenario?.expectedAnswer ?? ''}
          actualAnswer={run?.resultText ?? ''}
        />
      </SectionCard>

      {/* Compliance */}
      <SectionCard title="Instruction Compliance" icon="policy">
        <ComplianceTable compliance={evaluation.setupCompliance.instructionCompliance} />
      </SectionCard>

      {/* Usage */}
      <SectionCard title="Tool & Agent Usage" icon="precision_manufacturing">
        <UsagePanel compliance={evaluation.setupCompliance} />
      </SectionCard>

      {/* Strengths & Weaknesses */}
      <SectionCard title="Analysis" icon="insights">
        <StrengthsWeaknesses
          strengths={strengths}
          weaknesses={weaknesses}
          recommendations={recommendations}
        />
      </SectionCard>

      {/* Evaluation rounds detail */}
      {evaluation.rounds.length > 0 && (
        <SectionCard title={`Evaluation Rounds (${evaluation.rounds.length})`} icon="sync">
          <div className="space-y-3">
            {evaluation.rounds.map((round) => (
              <div key={round.roundNumber} className="bg-surface-container rounded-md p-3 border border-outline-variant/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-on-surface">Round {round.roundNumber}</span>
                  <span className={'text-[0.65rem] font-bold ' + (round.consensusReached ? 'text-green-400' : 'text-yellow-400')}>
                    {round.consensusReached ? 'Consensus' : 'No consensus'}
                  </span>
                </div>
                <div className="space-y-1">
                  {round.evaluations.map((ev, idx) => (
                    <div key={idx} className="text-xs text-on-surface-variant flex items-baseline gap-2">
                      <span className="font-mono text-on-surface-variant/60 w-20 flex-shrink-0">{ev.evaluatorRole}</span>
                      <span className="text-on-surface font-medium">{ev.dimension}</span>
                      <span className="font-mono ml-auto">{ev.score.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
