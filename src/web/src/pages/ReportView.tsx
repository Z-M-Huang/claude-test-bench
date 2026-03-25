import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, subscribeSSE } from '../api.js';
import type { Evaluation, Run } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { ReportHeader } from '../components/ReportHeader.js';
import { ScoreBreakdown } from '../components/ScoreBreakdown.js';
import { CriticalChecklist } from '../components/CriticalChecklist.js';
import { AnswerComparison } from '../components/AnswerComparison.js';
import { ComplianceTable } from '../components/ComplianceTable.js';
import { UsagePanel } from '../components/UsagePanel.js';
import { StrengthsWeaknesses } from '../components/StrengthsWeaknesses.js';

// ---------------------------------------------------------------------------
// Progress view (shown while evaluation is running)
// ---------------------------------------------------------------------------

interface ProgressEntry {
  step: string;
  detail?: string;
  timestamp: string;
}

const stepIcons: Record<string, string> = {
  preparing: 'description',
  scoring: 'analytics',
  debate: 'forum',
  synthesis: 'merge_type',
  complete: 'check_circle',
};

function EvalProgress({ steps, status }: { steps: ProgressEntry[]; status: string }): React.JSX.Element {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        {status === 'running' && (
          <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: '1.2rem' }}>progress_activity</span>
        )}
        <h2 className="text-lg font-bold text-on-surface">
          {status === 'running' ? 'Evaluation in progress...' : status === 'pending' ? 'Waiting to start...' : 'Evaluation failed'}
        </h2>
      </div>

      <div className="space-y-1">
        {steps.map((entry, i) => (
          <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-md bg-surface-container border border-outline-variant/10">
            <span className="material-symbols-outlined text-primary/60 mt-0.5" style={{ fontSize: '1rem' }}>
              {stepIcons[entry.step] ?? 'circle'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{entry.step}</div>
              {entry.detail && <div className="text-sm text-on-surface">{entry.detail}</div>}
            </div>
            <span className="text-[0.6rem] font-mono text-on-surface-variant/50 mt-0.5 shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
        {steps.length === 0 && status === 'pending' && (
          <div className="text-sm text-on-surface-variant/60 italic py-4 text-center">Queued, waiting for evaluator...</div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Report view (shown when evaluation is complete)
// ---------------------------------------------------------------------------

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }): React.JSX.Element {
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

function extractStrengthsWeaknesses(evaluation: Evaluation): { strengths: string[]; weaknesses: string[]; recommendations: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];
  for (const [dim, score] of Object.entries(evaluation.synthesis.dimensionScores)) {
    if (score >= 8) strengths.push(`Strong performance on ${dim} (${score.toFixed(1)}/10)`);
    if (score < 4) weaknesses.push(`Low score on ${dim} (${score.toFixed(1)}/10)`);
  }
  for (const f of evaluation.criticalResults.filter((r) => !r.met)) {
    weaknesses.push(`Failed: ${f.requirement}`);
    recommendations.push(`Address critical requirement: ${f.requirement}`);
  }
  for (const v of evaluation.setupCompliance.instructionCompliance.violated) {
    weaknesses.push(`Violated instruction: ${v}`);
  }
  if (strengths.length === 0) strengths.push('Evaluation completed successfully');
  return { strengths, weaknesses, recommendations };
}

function FullReport({ evaluation, run }: { evaluation: Evaluation; run: Run | null }): React.JSX.Element {
  const { strengths, weaknesses, recommendations } = extractStrengthsWeaknesses(evaluation);
  const scenario = run?.scenarioSnapshot;

  return (
    <div className="space-y-6">
      {evaluation.synthesis && (
        <ReportHeader synthesis={evaluation.synthesis} answerComparison={evaluation.answerComparison} totalCostUsd={evaluation.totalCostUsd} numRounds={evaluation.rounds.length} />
      )}
      {evaluation.synthesis && (
        <SectionCard title="Score Breakdown" icon="analytics">
          <ScoreBreakdown dimensionScores={evaluation.synthesis.dimensionScores} dimensions={scenario?.scoringDimensions ?? []} />
        </SectionCard>
      )}
      <SectionCard title="Critical Requirements" icon="checklist">
        <CriticalChecklist results={evaluation.criticalResults} />
      </SectionCard>
      <SectionCard title="Answer Comparison" icon="compare_arrows">
        <AnswerComparison comparison={evaluation.answerComparison} expectedAnswer={scenario?.expectedAnswer ?? ''} actualAnswer={run?.resultText ?? ''} />
      </SectionCard>
      <SectionCard title="Instruction Compliance" icon="policy">
        <ComplianceTable compliance={evaluation.setupCompliance.instructionCompliance} />
      </SectionCard>
      <SectionCard title="Tool & Agent Usage" icon="precision_manufacturing">
        <UsagePanel compliance={evaluation.setupCompliance} />
      </SectionCard>
      <SectionCard title="Analysis" icon="insights">
        <StrengthsWeaknesses strengths={strengths} weaknesses={weaknesses} recommendations={recommendations} />
      </SectionCard>
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

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function ReportView(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressEntry[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    api.evaluations.get(id)
      .then(async (evalData) => {
        if (cancelled) return;
        setEvaluation(evalData);
        const runData = await api.runs.get(evalData.runId);
        if (!cancelled) setRun(runData);

        // If still running, connect to SSE for live updates
        if (evalData.status === 'pending' || evalData.status === 'running') {
          const unsub = subscribeSSE(`/api/evaluations/${id}/stream`, {
            onMessage: (event) => {
              try {
                const data = JSON.parse(event.data as string) as Record<string, unknown>;
                if (data.type === 'progress') {
                  setProgressSteps((prev) => [...prev, {
                    step: data.step as string,
                    detail: data.detail as string | undefined,
                    timestamp: new Date().toISOString(),
                  }]);
                } else if (data.type === 'status' && (data.status === 'completed' || data.status === 'failed')) {
                  // Re-fetch the full evaluation
                  api.evaluations.get(id).then((fresh) => {
                    if (!cancelled) setEvaluation(fresh);
                  }).catch(() => {});
                }
              } catch { /* ignore parse errors */ }
            },
            onError: () => {
              unsub();
              unsubRef.current = null;
              // Re-fetch in case we missed the completion
              api.evaluations.get(id).then((fresh) => {
                if (!cancelled) setEvaluation(fresh);
              }).catch(() => {});
            },
          });
          unsubRef.current = unsub;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load evaluation');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubRef.current?.();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-on-surface-variant text-sm animate-pulse">Loading evaluation...</div>
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

  const isLive = evaluation.status === 'pending' || evaluation.status === 'running';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-on-surface-variant text-xs font-mono">
        <button type="button" onClick={() => navigate('/history')} className="hover:text-on-surface transition-colors">History</button>
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
            {run?.scenarioSnapshot ? `Scenario: ${run.scenarioSnapshot.name}` : `Run: ${evaluation.runId.slice(0, 8)}`}
          </p>
        </div>
        <StatusBadge status={evaluation.status} />
      </div>

      {isLive ? (
        <EvalProgress steps={progressSteps} status={evaluation.status} />
      ) : (
        <FullReport evaluation={evaluation} run={run} />
      )}
    </div>
  );
}
