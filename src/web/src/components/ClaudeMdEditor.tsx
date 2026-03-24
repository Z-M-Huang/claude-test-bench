interface ClaudeMdEntry {
  role: 'project' | 'user';
  content: string;
  loadFromFile?: string;
}

interface Props {
  items: ClaudeMdEntry[];
  onChange: (items: ClaudeMdEntry[]) => void;
}

const labelCls = 'block text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5';
const inputCls =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container placeholder:text-outline/50';

export function ClaudeMdEditor({ items, onChange }: Props): React.JSX.Element {
  function updateItem(idx: number, patch: Partial<ClaudeMdEntry>) {
    const next = items.map((item, i) => (i === idx ? { ...item, ...patch } : item));
    onChange(next);
  }

  function addItem() {
    onChange([...items, { role: 'project', content: '' }]);
  }

  function removeItem(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="bg-surface-container rounded-md p-4 space-y-3 border border-outline-variant/10">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-[160px]">
              <label className={labelCls}>Role</label>
              <select
                className={inputCls}
                value={item.role}
                onChange={(e) => updateItem(idx, { role: e.target.value as 'project' | 'user' })}
              >
                <option value="project">Project</option>
                <option value="user">User</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="text-error/70 hover:text-error transition-colors p-1"
              title="Remove"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>close</span>
            </button>
          </div>

          <div>
            <label className={labelCls}>Content</label>
            <textarea
              className={inputCls + ' font-mono min-h-[120px] resize-y'}
              value={item.content}
              placeholder="# CLAUDE.md content..."
              onChange={(e) => updateItem(idx, { content: e.target.value })}
            />
          </div>

          <div>
            <label className={labelCls}>Load from File (optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className={inputCls}
                value={item.loadFromFile ?? ''}
                placeholder="/path/to/CLAUDE.md"
                onChange={(e) => updateItem(idx, { loadFromFile: e.target.value || undefined })}
              />
              {item.loadFromFile && (
                <button
                  type="button"
                  onClick={() => updateItem(idx, { loadFromFile: undefined })}
                  className="text-on-surface-variant hover:text-on-surface px-2 transition-colors"
                  title="Clear path"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>backspace</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addItem}
        className="w-full py-2 border border-dashed border-outline-variant/30 rounded-md text-xs font-bold text-on-surface-variant hover:text-on-surface hover:border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>add</span>
        Add CLAUDE.md
      </button>
    </div>
  );
}
