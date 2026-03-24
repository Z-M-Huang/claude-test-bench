interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  label,
  placeholder,
  rows = 6,
  readOnly = false,
}: Props): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-[0.7rem] font-bold text-on-surface-variant uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        className="w-full bg-surface-container-lowest border-none rounded-md font-mono text-sm p-4 text-on-surface focus:ring-1 focus:ring-primary/40 leading-relaxed resize-y"
      />
    </div>
  );
}
