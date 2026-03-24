const labelCls = 'block text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5';
const inputCls =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container placeholder:text-outline/50';

export interface NameContentEntry {
  name: string;
  content: string;
}

interface Props {
  items: NameContentEntry[];
  onChange: (items: NameContentEntry[]) => void;
  label: string;
  namePlaceholder: string;
  contentPlaceholder: string;
}

export function NameContentList({
  items,
  onChange,
  label,
  namePlaceholder,
  contentPlaceholder,
}: Props): React.JSX.Element {
  function updateItem(idx: number, patch: Partial<NameContentEntry>) {
    onChange(items.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className="bg-surface-container rounded-md p-3 space-y-2 border border-outline-variant/10">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className={labelCls}>Name</label>
              <input
                type="text"
                className={inputCls}
                value={item.name}
                placeholder={namePlaceholder}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="text-error/70 hover:text-error transition-colors p-1 mt-4"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>close</span>
            </button>
          </div>
          <div>
            <label className={labelCls}>Content</label>
            <textarea
              className={inputCls + ' font-mono min-h-[60px] resize-y'}
              value={item.content}
              placeholder={contentPlaceholder}
              onChange={(e) => updateItem(idx, { content: e.target.value })}
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { name: '', content: '' }])}
        className="w-full py-2 border border-dashed border-outline-variant/30 rounded-md text-xs font-bold text-on-surface-variant hover:text-on-surface hover:border-outline-variant/60 transition-colors flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '0.9rem' }}>add</span>
        Add {label}
      </button>
    </div>
  );
}
