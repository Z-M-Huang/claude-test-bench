import { useState, useEffect, useCallback, useRef } from 'react';
import { api, subscribeSSE } from '../api.js';
import type { TestSetup, Scenario, Run, SDKMessageRecord } from '../types.js';
import { RunStatusBar } from '../components/RunStatusBar.js';
import { MessageLog } from '../components/MessageLog.js';

export function RunPage(): React.JSX.Element {
  const [setups, setSetups] = useState<TestSetup[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedSetup, setSelectedSetup] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('');
  const [run, setRun] = useState<Run | null>(null);
  const [messages, setMessages] = useState<SDKMessageRecord[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const unsubRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([api.setups.list(), api.scenarios.list()])
      .then(([s, sc]) => {
        setSetups(s);
        setScenarios(sc);
        if (s.length > 0) setSelectedSetup(s[0].id);
        if (sc.length > 0) setSelectedScenario(sc[0].id);
      })
      .catch(() => setError('Failed to load setups/scenarios'));
  }, []);

  useEffect(() => {
    return () => {
      unsubRef.current?.();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRun = useCallback(async () => {
    if (!selectedSetup || !selectedScenario) return;
    setStarting(true);
    setError(null);
    setMessages([]);
    setElapsedMs(0);

    try {
      const newRun = await api.runs.create({ setupId: selectedSetup, scenarioId: selectedScenario });
      setRun(newRun);

      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 500);

      const unsub = subscribeSSE(`/api/runs/${newRun.id}/stream`, {
        onMessage: (event) => {
          try {
            const data = JSON.parse(event.data as string) as SDKMessageRecord | { status: string; run: Run };
            if ('status' in data && 'run' in data) {
              setRun(data.run);
              if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
                unsub();
                unsubRef.current = null;
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
              }
            } else {
              setMessages((prev) => [...prev, data as SDKMessageRecord]);
            }
          } catch {
            // Ignore parse errors from SSE
          }
        },
        onError: () => {
          unsub();
          unsubRef.current = null;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        },
      });
      unsubRef.current = unsub;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setStarting(false);
    }
  }, [selectedSetup, selectedScenario]);

  const handleAbort = useCallback(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (run) {
      setRun({ ...run, status: 'cancelled' });
    }
  }, [run]);

  const isRunning = run?.status === 'running' || run?.status === 'pending';

  const selectCls =
    'w-full bg-surface-container-low border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container';
  const labelCls = 'block text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5';

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface mb-1">New Run</h1>
        <p className="text-on-surface-variant text-sm">Execute a test scenario against a setup configuration.</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-error-container/20 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left panel: controls */}
        <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
          <div>
            <label className={labelCls}>Setup</label>
            <select className={selectCls} value={selectedSetup} onChange={(e) => setSelectedSetup(e.target.value)} disabled={isRunning}>
              {setups.length === 0 && <option value="">No setups available</option>}
              {setups.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Scenario</label>
            <select className={selectCls} value={selectedScenario} onChange={(e) => setSelectedScenario(e.target.value)} disabled={isRunning}>
              {scenarios.length === 0 && <option value="">No scenarios available</option>}
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => void startRun()}
            disabled={starting || isRunning || !selectedSetup || !selectedScenario}
            className="w-full bg-primary-container text-on-primary-container py-2.5 rounded-full font-bold text-sm hover:bg-primary transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {starting ? (
              <>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '1rem' }}>progress_activity</span>
                Starting...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>play_arrow</span>
                Start Run
              </>
            )}
          </button>

          {run && !isRunning && (
            <div className="text-xs text-on-surface-variant bg-surface-container rounded-md p-3 space-y-1">
              <div>Status: <span className="font-medium text-on-surface capitalize">{run.status}</span></div>
              <div>Duration: <span className="font-mono">{(run.durationMs / 1000).toFixed(1)}s</span></div>
              <div>Turns: <span className="font-mono">{run.numTurns}</span></div>
              <div>Cost: <span className="font-mono">${run.totalCostUsd.toFixed(4)}</span></div>
            </div>
          )}
        </div>

        {/* Right panel: message log */}
        <div className="flex-1 flex flex-col min-h-0 bg-surface-container-low rounded-lg border border-outline-variant/5 overflow-hidden">
          {run && (
            <div className="p-3 border-b border-outline-variant/10">
              <RunStatusBar
                runId={run.id}
                status={run.status}
                elapsedMs={isRunning ? elapsedMs : run.durationMs}
                turns={run.numTurns}
                costUsd={run.totalCostUsd}
                onAbort={isRunning ? handleAbort : undefined}
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {!run ? (
              <div className="flex items-center justify-center h-full text-on-surface-variant/50 text-sm">
                Select a setup and scenario, then click Start Run.
              </div>
            ) : (
              <MessageLog messages={messages} loading={isRunning && messages.length === 0} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
