import { useState } from 'react';

interface AdvancedValues {
  timeoutSeconds: number;
  permissionMode: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  allowedTools: string[];
  thinking: { kind: string; budgetTokens?: number };
  effort: 'low' | 'medium' | 'high';
}

interface Props {
  value: AdvancedValues;
  onChange: (value: AdvancedValues) => void;
}

const labelCls = 'block text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5';
const inputCls =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container placeholder:text-outline/50';

const COMMON_TOOLS = [
  'Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep',
  'WebSearch', 'WebFetch', 'NotebookEdit',
];

export function AdvancedSettings({ value, onChange }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);

  function patch(partial: Partial<AdvancedValues>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="border border-outline-variant/10 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-container hover:bg-surface-container-high transition-colors"
      >
        <span className="text-sm font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>tune</span>
          Advanced Settings
        </span>
        <span
          className={'material-symbols-outlined text-on-surface-variant transition-transform ' + (open ? 'rotate-180' : '')}
          style={{ fontSize: '1.1rem' }}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-surface-container-low/50">
          {/* Timeout */}
          <div>
            <label className={labelCls}>Timeout (seconds)</label>
            <input
              type="number"
              className={inputCls + ' max-w-[160px]'}
              min={1}
              value={value.timeoutSeconds}
              onChange={(e) => patch({ timeoutSeconds: Number(e.target.value) || 300 })}
            />
          </div>

          {/* Permission Mode */}
          <div>
            <label className={labelCls}>Permission Mode</label>
            <select
              className={inputCls + ' max-w-[200px]'}
              value={value.permissionMode}
              onChange={(e) => patch({ permissionMode: e.target.value })}
            >
              <option value="default">Default</option>
              <option value="plan">Plan</option>
              <option value="bypassPermissions">Bypass Permissions</option>
            </select>
          </div>

          {/* Max Turns */}
          <div>
            <label className={labelCls}>Max Turns</label>
            <input
              type="number"
              className={inputCls + ' max-w-[160px]'}
              min={1}
              value={value.maxTurns ?? ''}
              placeholder="No limit"
              onChange={(e) => patch({ maxTurns: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          {/* Max Budget */}
          <div>
            <label className={labelCls}>Max Budget (USD)</label>
            <input
              type="number"
              className={inputCls + ' max-w-[160px]'}
              min={0}
              step={0.01}
              value={value.maxBudgetUsd ?? ''}
              placeholder="No limit"
              onChange={(e) => patch({ maxBudgetUsd: e.target.value ? Number(e.target.value) : undefined })}
            />
          </div>

          {/* Allowed Tools */}
          <div>
            <label className={labelCls}>Allowed Tools</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {COMMON_TOOLS.map((tool) => {
                const checked = value.allowedTools.includes(tool);
                return (
                  <label
                    key={tool}
                    className={
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors border ' +
                      (checked
                        ? 'bg-primary-container/20 text-primary border-primary-container/40'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:border-outline-variant/40')
                    }
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? value.allowedTools.filter((t) => t !== tool)
                          : [...value.allowedTools, tool];
                        patch({ allowedTools: next });
                      }}
                    />
                    {tool}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Thinking */}
          <div>
            <label className={labelCls}>Thinking</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {['adaptive', 'enabled', 'disabled'].map((kind) => (
                <label
                  key={kind}
                  className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer"
                >
                  <input
                    type="radio"
                    name="thinking-kind"
                    className="text-primary-container focus:ring-primary-container"
                    checked={value.thinking.kind === kind}
                    onChange={() => patch({ thinking: { kind, budgetTokens: kind === 'enabled' ? 10000 : undefined } })}
                  />
                  <span className="capitalize">{kind}</span>
                </label>
              ))}
            </div>
            {value.thinking.kind === 'enabled' && (
              <div className="mt-2">
                <label className={labelCls}>Budget Tokens</label>
                <input
                  type="number"
                  className={inputCls + ' max-w-[160px]'}
                  min={1}
                  value={value.thinking.budgetTokens ?? 10000}
                  onChange={(e) =>
                    patch({ thinking: { kind: 'enabled', budgetTokens: Number(e.target.value) || 10000 } })
                  }
                />
              </div>
            )}
          </div>

          {/* Effort */}
          <div>
            <label className={labelCls}>Effort</label>
            <div className="flex gap-3 mt-1">
              {(['low', 'medium', 'high'] as const).map((level) => (
                <label
                  key={level}
                  className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer"
                >
                  <input
                    type="radio"
                    name="effort-level"
                    className="text-primary-container focus:ring-primary-container"
                    checked={value.effort === level}
                    onChange={() => patch({ effort: level })}
                  />
                  <span className="capitalize">{level}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
