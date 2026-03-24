import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import type { Scenario, ScenarioCategory, WorkspaceFile, ScoringDimension } from '../types.js';
import { CodeEditor } from '../components/CodeEditor.js';
import { DynamicList } from '../components/DynamicList.js';
import { WeightIndicator } from '../components/WeightIndicator.js';

const categories: ScenarioCategory[] = [
  'planning', 'instruction-following', 'reasoning', 'tool-strategy',
  'error-handling', 'ambiguity-handling', 'scope-management', 'custom',
];

interface FormState {
  name: string;
  category: ScenarioCategory;
  prompt: string;
  workspaceFiles: WorkspaceFile[];
  expectedAnswer: string;
  criticalRequirements: string[];
  gradingGuidelines: string;
  scoringDimensions: ScoringDimension[];
}

const emptyForm: FormState = {
  name: '', category: 'reasoning', prompt: '', workspaceFiles: [],
  expectedAnswer: '', criticalRequirements: [], gradingGuidelines: '', scoringDimensions: [],
};

function SectionHead({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <span className="material-symbols-outlined text-lg">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
    </div>
  );
}

const labelCls = 'text-[0.7rem] font-bold text-on-surface-variant uppercase tracking-wider';
const inputCls = 'w-full bg-surface-container-lowest border-none rounded focus:ring-1 focus:ring-primary/40 text-sm text-on-surface placeholder:text-on-surface-variant/30 py-2.5';

export function ScenarioEditor(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [builtIn, setBuiltIn] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const isNew = !id;
  const readOnly = builtIn;

  useEffect(() => {
    if (!id) return;
    api.scenarios.get(id).then((sc) => {
      setForm({
        name: sc.name, category: sc.category, prompt: sc.prompt,
        workspaceFiles: [...sc.workspaceFiles], expectedAnswer: sc.expectedAnswer,
        criticalRequirements: [...sc.criticalRequirements],
        gradingGuidelines: sc.gradingGuidelines, scoringDimensions: [...sc.scoringDimensions],
      });
      setBuiltIn(sc.builtIn);
    }).catch(() => navigate('/scenarios')).finally(() => setLoading(false));
  }, [id, navigate]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    if (readOnly) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  }, [readOnly]);

  async function handleSave() {
    if (readOnly) return;
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.scenarios.create(form as Partial<Scenario>);
        navigate(`/scenarios/${created.id}`);
      } else {
        await api.scenarios.update(id!, form as Partial<Scenario>);
      }
    } finally { setSaving(false); }
  }

  function updateWsFile(i: number, patch: Partial<WorkspaceFile>) {
    set('workspaceFiles', form.workspaceFiles.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function updateReq(i: number, v: string) {
    set('criticalRequirements', form.criticalRequirements.map((r, idx) => (idx === i ? v : r)));
  }
  function updateDim(i: number, patch: Partial<ScoringDimension>) {
    set('scoringDimensions', form.scoringDimensions.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  if (loading) return <p className="text-on-surface-variant py-12 text-center">Loading scenario...</p>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">
            {isNew ? 'Create New Scenario' : builtIn ? 'View Scenario' : 'Edit Scenario'}
          </h2>
          <p className="text-sm text-on-surface-variant">
            {builtIn ? 'This built-in scenario is read-only.' : 'Define evaluation parameters and ground truth for model testing.'}
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/scenarios')} className="px-6 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high transition-colors">Discard</button>
            <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Scenario'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column */}
        <section className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-container p-5 rounded-lg space-y-4">
            <SectionHead icon="info" title="Basic Information" />
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className={labelCls}>Scenario Name</label>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} readOnly={readOnly} placeholder="e.g. complex_math_reasoning_01" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Category</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value as ScenarioCategory)} disabled={readOnly} className={inputCls}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-surface-container p-5 rounded-lg space-y-4">
            <SectionHead icon="rule" title="Critical Requirements" />
            <DynamicList label="" items={form.criticalRequirements}
              onAdd={() => set('criticalRequirements', [...form.criticalRequirements, ''])}
              onRemove={(i) => set('criticalRequirements', form.criticalRequirements.filter((_, idx) => idx !== i))}
              renderItem={(item, i) => (
                <input type="text" value={item} onChange={(e) => updateReq(i, e.target.value)} readOnly={readOnly} placeholder="Requirement..." className="w-full bg-transparent border-none text-xs text-on-surface p-0 focus:ring-0" />
              )}
            />
          </div>
        </section>

        {/* Right Column */}
        <section className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-surface-container p-5 rounded-lg space-y-4">
            <SectionHead icon="terminal" title="User Prompt" />
            <CodeEditor value={form.prompt} onChange={(v) => set('prompt', v)} placeholder="Enter the user test prompt here..." rows={8} readOnly={readOnly} />
          </div>
          <div className="bg-surface-container p-5 rounded-lg space-y-4">
            <SectionHead icon="folder_open" title="Workspace Files" />
            <DynamicList label="" items={form.workspaceFiles}
              onAdd={() => set('workspaceFiles', [...form.workspaceFiles, { path: '', content: '' }])}
              onRemove={(i) => set('workspaceFiles', form.workspaceFiles.filter((_, idx) => idx !== i))}
              renderItem={(file, i) => (
                <div className="space-y-2">
                  <input type="text" value={file.path} onChange={(e) => updateWsFile(i, { path: e.target.value })} readOnly={readOnly} placeholder="src/path/to/file.ts" className="w-full bg-surface-container-high border-none rounded text-[10px] font-mono text-on-surface-variant py-1.5 px-2 focus:ring-1 focus:ring-primary/40" />
                  <CodeEditor value={file.content} onChange={(v) => updateWsFile(i, { content: v })} placeholder="File content..." rows={4} readOnly={readOnly} />
                </div>
              )}
            />
          </div>
        </section>

        {/* Full Width: Expected Answer & Scoring */}
        <section className="col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container p-5 rounded-lg space-y-4">
            <SectionHead icon="verified" title="Expected Answer" />
            <CodeEditor value={form.expectedAnswer} onChange={(v) => set('expectedAnswer', v)} placeholder="Describe the ideal response..." rows={10} readOnly={readOnly} />
          </div>
          <div className="bg-surface-container p-5 rounded-lg space-y-4 flex flex-col">
            <SectionHead icon="analytics" title="Grading & Scoring" />
            <CodeEditor label="Grading Guidelines" value={form.gradingGuidelines} onChange={(v) => set('gradingGuidelines', v)} placeholder="General grading instructions..." rows={4} readOnly={readOnly} />
            <div className="flex-1">
              <DynamicList label="Scoring Dimensions" items={form.scoringDimensions}
                onAdd={() => set('scoringDimensions', [...form.scoringDimensions, { name: '', weight: 0, description: '' }])}
                onRemove={(i) => set('scoringDimensions', form.scoringDimensions.filter((_, idx) => idx !== i))}
                renderItem={(dim, i) => (
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <input type="text" value={dim.name} onChange={(e) => updateDim(i, { name: e.target.value })} readOnly={readOnly} placeholder="Dimension name" className="bg-transparent border-none text-xs font-bold text-on-surface p-0 focus:ring-0 flex-1" />
                      <div className="flex items-center gap-2 bg-surface-container px-2 py-1 rounded">
                        <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">Weight</span>
                        <input type="number" step="0.1" min="0" max="1" value={dim.weight} onChange={(e) => updateDim(i, { weight: parseFloat(e.target.value) || 0 })} readOnly={readOnly} className="bg-transparent border-none text-xs font-mono text-primary p-0 w-10 focus:ring-0 text-center" />
                      </div>
                    </div>
                    <input type="text" value={dim.description} onChange={(e) => updateDim(i, { description: e.target.value })} readOnly={readOnly} placeholder="Description of this dimension..." className="w-full bg-transparent border-none text-[0.7rem] text-on-surface-variant italic p-0 focus:ring-0" />
                  </div>
                )}
              />
            </div>
            <WeightIndicator weights={form.scoringDimensions.map((d) => d.weight)} />
          </div>
        </section>
      </div>
    </div>
  );
}
