import { useState } from 'react';

interface SubagentEntry {
  name: string;
  description: string;
  prompt: string;
  loadFromFile?: string;
}

interface Props {
  items: SubagentEntry[];
  onChange: (items: SubagentEntry[]) => void;
}

type SourceMode = 'inline' | 'file';

const labelCls = 'block text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5';
const inputCls =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container placeholder:text-outline/50';

function EntryEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: SubagentEntry;
  onUpdate: (patch: Partial<SubagentEntry>) => void;
  onRemove: () => void;
}) {
  const [mode, setMode] = useState<SourceMode>(item.loadFromFile ? 'file' : 'inline');

  function handleModeChange(newMode: SourceMode) {
    setMode(newMode);
    if (newMode === 'file') {
      onUpdate({ prompt: '', loadFromFile: item.loadFromFile ?? '' });
    } else {
      onUpdate({ prompt: item.prompt, loadFromFile: undefined });
    }
  }

  return (
    <div className="bg-surface-container rounded-md p-4 space-y-3 border border-outline-variant/10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <label className={labelCls}>Name</label>
          <input type="text" className={inputCls} value={item.name} placeholder="research-agent" onChange={(e) => onUpdate({ name: e.target.value })} />
        </div>
        <button type="button" onClick={onRemove} className="text-error/70 hover:text-error transition-colors p-1 mt-4" title="Remove">
          <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
        </button>
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <input type="text" className={inputCls} value={item.description} placeholder="Handles research and data gathering" onChange={(e) => onUpdate({ description: e.target.value })} />
      </div>

      {/* Source toggle */}
      <div>
        <label className={labelCls}>Prompt Source</label>
        <div className="flex gap-1 bg-surface-container-high rounded-md p-0.5">
          {(['inline', 'file'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleModeChange(m)}
              className={'flex-1 py-1 text-[0.6rem] font-bold uppercase tracking-wider rounded transition-colors ' +
                (mode === m
                  ? 'bg-surface-container-lowest text-on-surface shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface')}
            >
              {m === 'inline' ? 'Inline Prompt' : 'File Reference'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'inline' ? (
        <textarea
          className={inputCls + ' font-mono min-h-[80px] resize-y text-xs'}
          value={item.prompt}
          placeholder="You are a research assistant..."
          onChange={(e) => onUpdate({ prompt: e.target.value })}
        />
      ) : (
        <input
          type="text"
          className={inputCls + ' font-mono text-xs'}
          value={item.loadFromFile ?? ''}
          placeholder="/path/to/SUBAGENT.md"
          onChange={(e) => onUpdate({ loadFromFile: e.target.value || undefined })}
        />
      )}
    </div>
  );
}

export function SubagentEditor({ items, onChange }: Props): React.JSX.Element {
  function updateItem(idx: number, patch: Partial<SubagentEntry>) {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <EntryEditor key={idx} item={item} onUpdate={(patch) => updateItem(idx, patch)} onRemove={() => onChange(items.filter((_, i) => i !== idx))} />
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { name: '', description: '', prompt: '' }])}
        className="w-full py-2 border border-dashed border-outline-variant/30 rounded-md text-xs font-bold text-on-surface-variant hover:text-on-surface hover:border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>add</span>
        Add Subagent
      </button>
    </div>
  );
}
