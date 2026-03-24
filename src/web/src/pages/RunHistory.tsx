import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import type { Run, RunStatus, TestSetup, Scenario } from '../types.js';
import { StatusBadge } from '../components/StatusBadge.js';

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}:${sec.toString().padStart(2, '0')}` : `${sec}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RunHistory(): React.JSX.Element {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<Run[]>([]);
  const [setups, setSetups] = useState<TestSetup[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSetup, setFilterSetup] = useState('');
  const [filterScenario, setFilterScenario] = useState('');
  const [filterStatus, setFilterStatus] = useState<RunStatus | ''>('');

  useEffect(() => {
    Promise.all([api.runs.list(), api.setups.list(), api.scenarios.list()])
      .then(([r, s, sc]) => {
        setRuns(r);
        setSetups(s);
        setScenarios(sc);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setupMap = new Map(setups.map((s) => [s.id, s.name]));
  const scenarioMap = new Map(scenarios.map((s) => [s.id, s.name]));

  const filtered = runs.filter((r) => {
    if (filterSetup && r.setupId !== filterSetup) return false;
    if (filterScenario && r.scenarioId !== filterScenario) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const selectCls =
    'bg-surface-container-low border border-outline-variant/20 rounded-md px-2 py-1 text-xs text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface mb-1">Run History</h1>
        <p className="text-on-surface-variant text-sm">Browse and filter all previous test runs.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className={selectCls} value={filterSetup} onChange={(e) => setFilterSetup(e.target.value)}>
          <option value="">All Setups</option>
          {setups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={selectCls} value={filterScenario} onChange={(e) => setFilterScenario(e.target.value)}>
          <option value="">All Scenarios</option>
          {scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className={selectCls} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RunStatus | '')}>
          <option value="">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-surface-container-low rounded-lg overflow-hidden border border-outline-variant/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container text-[0.65rem] text-on-surface-variant uppercase tracking-widest border-b border-outline-variant/10">
              <tr>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Scenario</th>
                <th className="px-6 py-3 font-semibold">Setup</th>
                <th className="px-6 py-3 font-semibold">Duration</th>
                <th className="px-6 py-3 font-semibold text-center">Turns</th>
                <th className="px-6 py-3 font-semibold text-right">Cost</th>
                <th className="px-6 py-3 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="text-[0.75rem] divide-y divide-outline-variant/5">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant animate-pulse">
                    Loading runs...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant/50">
                    No runs found.
                  </td>
                </tr>
              )}
              {filtered.map((run) => (
                <tr
                  key={run.id}
                  onClick={() => navigate(`/runs/${run.id}`)}
                  className="hover:bg-surface-container-highest/40 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">
                    {scenarioMap.get(run.scenarioId) ?? run.scenarioId.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 font-mono text-on-surface">
                    {setupMap.get(run.setupId) ?? run.setupId.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {formatDuration(run.durationMs)}
                  </td>
                  <td className="px-6 py-4 font-mono text-center">
                    {run.numTurns}
                  </td>
                  <td className="px-6 py-4 font-mono text-right">
                    ${run.totalCostUsd.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant text-right">
                    {formatDate(run.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
