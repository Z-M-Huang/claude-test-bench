import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import type { ProviderConfig, TestSetup } from '../types.js';
import { ProviderConfigEditor } from '../components/ProviderConfig.js';
import { ClaudeMdEditor } from '../components/ClaudeMdEditor.js';
import { McpServerEditor } from '../components/McpServerEditor.js';
import { SubagentEditor } from '../components/SubagentEditor.js';
import { AdvancedSettings } from '../components/AdvancedSettings.js';
import { NameContentList } from '../components/NameContentList.js';
import type { NameContentEntry } from '../components/NameContentList.js';

const labelCls = 'block text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5';
const inputCls =
  'w-full bg-surface-container-low border border-outline-variant/20 rounded-md px-3 py-2 text-sm text-on-surface focus:ring-1 focus:ring-primary-container focus:border-primary-container placeholder:text-outline/50';

const defaultProvider: ProviderConfig = {
  kind: 'api',
  baseUrl: 'https://api.anthropic.com',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
};

export function SetupEditor(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<ProviderConfig>(defaultProvider);
  const [claudeMdFiles, setClaudeMdFiles] = useState<{ role: 'project' | 'user'; content: string; loadFromFile?: string }[]>([]);
  const [rules, setRules] = useState<NameContentEntry[]>([]);
  const [skills, setSkills] = useState<NameContentEntry[]>([]);
  const [subagents, setSubagents] = useState<{ name: string; description: string; prompt: string; loadFromFile?: string }[]>([]);
  const [mcpServers, setMcpServers] = useState<{ name: string; config: Record<string, unknown> }[]>([]);
  const [advanced, setAdvanced] = useState({
    timeoutSeconds: 300,
    permissionMode: 'default',
    maxTurns: undefined as number | undefined,
    maxBudgetUsd: undefined as number | undefined,
    allowedTools: [] as string[],
    thinking: { kind: 'adaptive' } as { kind: string; budgetTokens?: number },
    effort: 'medium' as 'low' | 'medium' | 'high',
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.setups.get(id).then((setup) => {
      if (cancelled) return;
      setName(setup.name);
      setDescription(setup.description);
      setProvider(setup.provider);
      setClaudeMdFiles(setup.claudeMdFiles.map((f) => ({ ...f })));
      setRules(setup.rules.map((r) => ({ ...r })));
      setSkills(setup.skills.map((s) => ({ ...s })));
      setSubagents(setup.subagents.map((s) => ({ ...s })));
      setMcpServers(setup.mcpServers.map((s) => ({ ...s })));
      setAdvanced({
        timeoutSeconds: setup.timeoutSeconds,
        permissionMode: setup.permissionMode,
        maxTurns: setup.maxTurns,
        maxBudgetUsd: setup.maxBudgetUsd,
        allowedTools: setup.allowedTools ? [...setup.allowedTools] : [],
        thinking: setup.thinking ? { ...setup.thinking } : { kind: 'adaptive' },
        effort: setup.effort ?? 'medium',
      });
      setLoading(false);
    }).catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Failed to load setup');
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [id]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<TestSetup> = {
        name,
        description,
        provider,
        claudeMdFiles,
        rules,
        skills,
        subagents,
        mcpServers,
        permissionMode: advanced.permissionMode,
        timeoutSeconds: advanced.timeoutSeconds,
        maxTurns: advanced.maxTurns,
        maxBudgetUsd: advanced.maxBudgetUsd,
        allowedTools: advanced.allowedTools.length > 0 ? advanced.allowedTools : undefined,
        thinking: advanced.thinking.kind !== 'adaptive' ? advanced.thinking : undefined,
        effort: advanced.effort,
      };
      if (id) {
        await api.setups.update(id, payload);
      } else {
        await api.setups.create(payload);
      }
      navigate('/setups');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const sectionCls = 'space-y-3';
  const sectionHeadingCls = 'text-sm font-bold text-on-surface flex items-center gap-2';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-on-surface-variant text-sm animate-pulse">Loading setup...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-on-surface mb-1">
          {isNew ? 'New Setup' : 'Edit Setup'}
        </h1>
        <p className="text-on-surface-variant text-sm">
          {isNew ? 'Configure a new test environment.' : `Editing setup ${id}`}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-error-container/20 border border-error/20 text-error text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {/* Basic Info */}
        <section className={sectionCls}>
          <h2 className={sectionHeadingCls}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>info</span>
            Basic Information
          </h2>
          <div>
            <label className={labelCls}>Name</label>
            <input type="text" className={inputCls} value={name} placeholder="my-test-setup" onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={inputCls + ' min-h-[60px] resize-y'} value={description} placeholder="Describe this setup..." onChange={(e) => setDescription(e.target.value)} />
          </div>
        </section>

        {/* Provider */}
        <section className={sectionCls}>
          <h2 className={sectionHeadingCls}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>cloud</span>
            Provider Configuration
          </h2>
          <ProviderConfigEditor value={provider} onChange={setProvider} />
        </section>

        {/* CLAUDE.md files */}
        <section className={sectionCls}>
          <h2 className={sectionHeadingCls}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>description</span>
            CLAUDE.md Files
          </h2>
          <ClaudeMdEditor items={claudeMdFiles} onChange={setClaudeMdFiles} />
        </section>

        {/* Rules */}
        <section className={sectionCls}>
          <h2 className={sectionHeadingCls}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>gavel</span>
            Rules
          </h2>
          <NameContentList items={rules} onChange={setRules} label="Rule" namePlaceholder="Rule name" contentPlaceholder="Rule content..." />
        </section>

        {/* Skills */}
        <section className={sectionCls}>
          <h2 className={sectionHeadingCls}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>build</span>
            Skills
          </h2>
          <NameContentList items={skills} onChange={setSkills} label="Skill" namePlaceholder="Skill name" contentPlaceholder="Skill definition..." />
        </section>

        {/* Subagents */}
        <section className={sectionCls}>
          <h2 className={sectionHeadingCls}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>smart_toy</span>
            Subagents
          </h2>
          <SubagentEditor items={subagents} onChange={setSubagents} />
        </section>

        {/* MCP Servers */}
        <section className={sectionCls}>
          <h2 className={sectionHeadingCls}>
            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>dns</span>
            MCP Servers
          </h2>
          <McpServerEditor items={mcpServers} onChange={setMcpServers} />
        </section>

        {/* Advanced Settings */}
        <section>
          <AdvancedSettings value={advanced} onChange={setAdvanced} />
        </section>

        {/* Save */}
        <div className="flex items-center gap-3 pt-4 border-t border-outline-variant/10">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !name.trim()}
            className="bg-primary-container text-on-primary-container px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '1rem' }}>progress_activity</span>
            )}
            {isNew ? 'Create Setup' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/setups')}
            className="text-on-surface-variant hover:text-on-surface text-sm font-medium transition-colors px-4 py-2.5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
