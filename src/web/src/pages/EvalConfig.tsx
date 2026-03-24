import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import type { ProviderConfig, EvaluatorConfig, Run } from '../types.js';
import { ProviderConfigEditor } from '../components/ProviderConfig.js';

const defaultProvider: ProviderConfig = {
  kind: 'api',
  baseUrl: 'https://api.anthropic.com',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
};

const labelCls = 'block text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5';
const inputCls =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container placeholder:text-outline/50';

interface EvalEntry {
  provider: ProviderConfig;
  role: string;
}

export function EvalConfig(): React.JSX.Element {
  const { id: runId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [evaluators, setEvaluators] = useState<EvalEntry[]>([
    { provider: { ...defaultProvider }, role: 'Evaluator' },
    { provider: { ...defaultProvider }, role: 'Synthesizer' },
  ]);
  const [maxRounds, setMaxRounds] = useState(3);
  const [maxBudget, setMaxBudget] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!runId) return;
    api.runs.get(runId)
      .then(setRun)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load run'))
      .finally(() => setLoading(false));
  }, [runId]);

  function updateEvaluator(idx: number, patch: Partial<EvalEntry>) {
    setEvaluators((prev) =>
      prev.map((e, i) => {
        const updated = i === idx ? { ...e, ...patch } : e;
        // Last evaluator always labeled Synthesizer
        if (i === prev.length - 1 && updated.role !== 'Synthesizer') {
          return { ...updated, role: 'Synthesizer' };
        }
        return updated;
      }),
    );
  }

  function addEvaluator() {
    setEvaluators((prev) => {
      // Relabel previous last as regular evaluator
      const updated = prev.map((e, i) =>
        i === prev.length - 1 ? { ...e, role: `Evaluator ${prev.length}` } : e,
      );
      return [...updated, { provider: { ...defaultProvider }, role: 'Synthesizer' }];
    });
  }

  function removeEvaluator(idx: number) {
    if (evaluators.length <= 1) return;
    setEvaluators((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Ensure last is Synthesizer
      return next.map((e, i) =>
        i === next.length - 1 ? { ...e, role: 'Synthesizer' } : e,
      );
    });
  }

  async function handleStart() {
    if (!runId) return;
    setStarting(true);
    setError(null);
    try {
      const evaluatorConfigs: EvaluatorConfig[] = evaluators.map((e) => ({
        provider: e.provider,
        role: e.role,
      }));
      const evaluation = await api.evaluations.create({
        runId,
        evaluators: evaluatorConfigs,
        maxRounds,
        maxBudgetUsd: maxBudget,
      });
      navigate(`/evaluations/${evaluation.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start evaluation');
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-on-surface-variant text-sm animate-pulse">Loading run...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2 text-on-surface-variant text-xs font-mono">
          <button type="button" onClick={() => navigate(`/runs/${runId}`)} className="hover:text-on-surface transition-colors">
            Run {runId?.slice(0, 8)}
          </button>
          <span>/</span>
          <span>Evaluate</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface mb-1">Evaluation Configuration</h1>
        <p className="text-on-surface-variant text-sm">
          Configure evaluators for run against scenario{' '}
          <span className="font-medium text-on-surface">{run?.scenarioSnapshot?.name ?? ''}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-error-container/20 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Evaluator list */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>groups</span>
            Evaluators
          </h2>
          {evaluators.map((entry, idx) => {
            const isLast = idx === evaluators.length - 1;
            return (
              <div key={idx} className="bg-surface-container rounded-md p-4 space-y-3 border border-outline-variant/10">
                <div className="flex items-center justify-between">
                  <span className={'text-xs font-bold uppercase tracking-wider ' + (isLast ? 'text-primary' : 'text-on-surface-variant')}>
                    {entry.role}
                    {isLast && <span className="ml-1 text-[0.6rem] normal-case font-normal">(final arbiter)</span>}
                  </span>
                  {evaluators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEvaluator(idx)}
                      className="text-error/70 hover:text-error transition-colors p-1"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
                    </button>
                  )}
                </div>
                {!isLast && (
                  <div>
                    <label className={labelCls}>Role Name</label>
                    <input
                      type="text"
                      className={inputCls + ' max-w-[240px]'}
                      value={entry.role}
                      onChange={(e) => updateEvaluator(idx, { role: e.target.value })}
                    />
                  </div>
                )}
                <ProviderConfigEditor
                  value={entry.provider}
                  onChange={(provider) => updateEvaluator(idx, { provider })}
                />
              </div>
            );
          })}

          <button
            type="button"
            onClick={addEvaluator}
            className="w-full py-2 border border-dashed border-outline-variant/30 rounded-md text-xs font-bold text-on-surface-variant hover:text-on-surface hover:border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>add</span>
            Add Evaluator
          </button>
        </section>

        {/* Settings */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>settings</span>
            Settings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Max Rounds (1-5)</label>
              <input
                type="number"
                className={inputCls + ' max-w-[120px]'}
                min={1}
                max={5}
                value={maxRounds}
                onChange={(e) => setMaxRounds(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
              />
              <input
                type="range"
                className="w-full mt-2 accent-primary-container"
                min={1}
                max={5}
                value={maxRounds}
                onChange={(e) => setMaxRounds(Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelCls}>Max Budget (USD, optional)</label>
              <input
                type="number"
                className={inputCls + ' max-w-[160px]'}
                min={0}
                step={0.01}
                value={maxBudget ?? ''}
                placeholder="No limit"
                onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div className="text-xs text-on-surface-variant bg-surface-container rounded-md p-3">
            <span className="material-symbols-outlined text-primary/60 mr-1" style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>
              info
            </span>
            Estimated cost: {evaluators.length} evaluator{evaluators.length > 1 ? 's' : ''} x {maxRounds} round{maxRounds > 1 ? 's' : ''} = up to {evaluators.length * maxRounds} API calls.
          </div>
        </section>

        {/* Start button */}
        <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/10">
          <button
            type="button"
            onClick={() => void handleStart()}
            disabled={starting}
            className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {starting && (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '1rem' }}>progress_activity</span>
            )}
            Start Evaluation
          </button>
          <button
            type="button"
            onClick={() => navigate(`/runs/${runId}`)}
            className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors px-4 py-2.5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
