import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import type { Run } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';
import { MessageLog } from '../components/MessageLog.js';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec.toString().padStart(2, '0')}s` : `${sec}s`;
}

function CollapsiblePanel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-outline-variant/10 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-container hover:bg-surface-container-high transition-colors"
      >
        <span className="text-sm font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>{icon}</span>
          {title}
        </span>
        <span
          className={'material-symbols-outlined text-on-surface-variant transition-transform ' + (open ? 'rotate-180' : '')}
          style={{ fontSize: '1.1rem' }}
        >
          expand_more
        </span>
      </button>
      {open && <div className="p-4 bg-surface-container-low/50">{children}</div>}
    </div>
  );
}

export function RunDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.runs.get(id)
      .then(setRun)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load run'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-on-surface-variant text-sm animate-pulse">Loading run...</div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-error text-sm">{error ?? 'Run not found'}</div>
      </div>
    );
  }

  const setup = run.setupSnapshot;
  const scenario = run.scenarioSnapshot;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-on-surface-variant text-xs font-mono">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="hover:text-on-surface transition-colors"
          >
            History
          </button>
          <span>/</span>
          <span>{run.id.slice(0, 8)}</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface mb-1">Run Detail</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-container-low p-4 rounded-md">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Status</div>
          <StatusBadge status={run.status} />
        </div>
        <div className="bg-surface-container-low p-4 rounded-md">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Duration</div>
          <div className="text-lg font-mono font-bold text-on-surface">{formatDuration(run.durationMs)}</div>
        </div>
        <div className="bg-surface-container-low p-4 rounded-md">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Turns</div>
          <div className="text-lg font-mono font-bold text-on-surface">{run.numTurns}</div>
        </div>
        <div className="bg-surface-container-low p-4 rounded-md">
          <div className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Cost</div>
          <div className="text-lg font-mono font-bold text-on-surface">${run.totalCostUsd.toFixed(4)}</div>
        </div>
      </div>

      {/* Error */}
      {run.error && (
        <div className="p-3 rounded-md bg-error-container/20 border border-error/20 text-error text-sm font-mono">
          {run.error}
        </div>
      )}

      {/* Message Log */}
      <div className="bg-surface-container-low rounded-lg border border-outline-variant/5 overflow-hidden">
        <div className="px-4 py-3 bg-surface-container border-b border-outline-variant/10">
          <h2 className="text-sm font-bold text-on-surface">Message Log</h2>
        </div>
        <div className="max-h-[500px] overflow-y-auto">
          <MessageLog messages={run.messages} />
        </div>
      </div>

      {/* Result */}
      {run.resultText && (
        <div className="bg-surface-container-low rounded-lg border border-outline-variant/5 p-4">
          <h2 className="text-sm font-bold text-on-surface mb-2">Result</h2>
          <div className="text-sm text-on-surface-variant whitespace-pre-wrap font-mono">{run.resultText}</div>
        </div>
      )}

      {/* Setup Snapshot */}
      <CollapsiblePanel title="Setup Snapshot" icon="settings_input_component">
        <div className="space-y-2 text-xs">
          <div><span className="text-on-surface-variant">Name:</span> <span className="text-on-surface font-medium">{setup.name}</span></div>
          <div><span className="text-on-surface-variant">Model:</span> <span className="text-on-surface font-mono">{setup.provider.model}</span></div>
          <div><span className="text-on-surface-variant">Provider:</span> <span className="text-on-surface">{setup.provider.kind}</span></div>
          <div><span className="text-on-surface-variant">Permission Mode:</span> <span className="text-on-surface">{setup.permissionMode}</span></div>
          <div><span className="text-on-surface-variant">Timeout:</span> <span className="text-on-surface font-mono">{setup.timeoutSeconds}s</span></div>
          {setup.maxTurns && <div><span className="text-on-surface-variant">Max Turns:</span> <span className="text-on-surface font-mono">{setup.maxTurns}</span></div>}
          {setup.effort && <div><span className="text-on-surface-variant">Effort:</span> <span className="text-on-surface capitalize">{setup.effort}</span></div>}
        </div>
      </CollapsiblePanel>

      {/* Scenario Snapshot */}
      <CollapsiblePanel title="Scenario Snapshot" icon="schema">
        <div className="space-y-2 text-xs">
          <div><span className="text-on-surface-variant">Name:</span> <span className="text-on-surface font-medium">{scenario.name}</span></div>
          <div><span className="text-on-surface-variant">Category:</span> <span className="text-on-surface capitalize">{scenario.category}</span></div>
          <div>
            <span className="text-on-surface-variant">Prompt:</span>
            <div className="mt-1 text-on-surface font-mono whitespace-pre-wrap bg-surface-container p-2 rounded text-[0.7rem]">
              {scenario.prompt}
            </div>
          </div>
          {scenario.expectedAnswer && (
            <div>
              <span className="text-on-surface-variant">Expected Answer:</span>
              <div className="mt-1 text-on-surface font-mono whitespace-pre-wrap bg-surface-container p-2 rounded text-[0.7rem]">
                {scenario.expectedAnswer}
              </div>
            </div>
          )}
        </div>
      </CollapsiblePanel>

      {/* Evaluate button */}
      {run.status === 'completed' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/runs/${run.id}/evaluate`)}
            className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary transition-colors active:scale-95 flex items-center gap-2"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>rate_review</span>
            Evaluate This Run
          </button>
        </div>
      )}
    </div>
  );
}
