# Claude Test Bench -- Project Guidelines

## Project Goal

Build a benchmarking tool for testing Claude agent configurations. The tool measures whether CLAUDE.md instructions, skills, subagents, and rules actually influence agent behavior. Users create Setups (agent config) and Scenarios (task + rubric), run them, and evaluate results through a web UI.

## Architecture

```
bin/ctb.ts  -->  Express app (src/server/index.ts)  -->  React SPA (src/web/)
                      |
         IStorage  IRunner  IEvaluator  ILogger
            |          |         |          |
     JsonFileStorage  ScenarioRunner  EvaluationOrchestrator  JsonLogger
            |          |         |
     .claude-test-bench/   SDK query()   SDK query() (split-query eval)
```

- **Express 5 backend** (`src/server/`) with REST API + SSE for run progress
- **React 19 frontend** (`src/web/`) with Tailwind CSS v4 (no component libraries)
- **File-based JSON storage** in `.claude-test-bench/` (setups, scenarios, runs, evaluations)
- **Claude Agent SDK** for scenario execution (`query()`) and evaluation (`query()` with eval prompts)
- **LLM-based evaluation** with instruction compliance analysis (split-query strategy)

## Code Rules

- No file exceeds 300 lines (README.md and CLAUDE.md are exempt)
- No `any` types -- use discriminated unions and strong types
- Every service class implements an interface (`IStorage`, `IRunner`, `IEvaluator`, `ILogger`, `IWorkspaceBuilder`)
- Unit test coverage > 95% (vitest)
- E2E tests with Playwright
- ESM imports with `.js` extensions (required for Node ESM resolution)
- Tailwind CSS for all styling (inline styles OK for dynamic values only)
- Route handlers use factory functions (`createSetupRoutes(deps)`, etc.)

## Key Patterns

### Interface-First Design

Every service has an interface in `src/server/interfaces/`. Implementations live in `src/server/services/`. Route factories accept interfaces, not implementations. This enables testing with mocks.

```
interfaces/storage.ts   -->  IStorage
services/storage.ts     -->  JsonFileStorage implements IStorage
routes/setups.ts        -->  createSetupRoutes(storage: IStorage, logger: ILogger)
```

### FsAdapter

File system operations go through `FsAdapter` (defined in `services/fs-adapter.ts`). Tests inject a mock adapter instead of touching the real file system. The default adapter delegates to `node:fs/promises`.

### Route Factories

All route files export a factory function that takes dependencies and returns an Express Router:

```typescript
export function createSetupRoutes(storage: IStorage, logger: ILogger): Router { ... }
```

### SDK Integration

The `ScenarioRunner` calls `query()` from `@anthropic-ai/claude-agent-sdk`. Environment variables are built by `env-builder.ts` from the Setup's provider config. Subagents and MCP servers are mapped to SDK types by `agent-mapper.ts`. Workspaces are created by `WorkspaceBuilder` in isolated temp directories.

### Evaluation Split-Query Strategy

The `EvaluationOrchestrator` runs multiple SDK queries per evaluation:

1. **Score query** (`buildScorePrompt`) -- Scores each dimension, compares answer, checks critical requirements
2. **Compliance query** (`buildCompliancePrompt`) -- Analyzes CLAUDE.md instruction compliance
3. **Debate rounds** (`buildDebatePrompt`) -- Optional multi-evaluator consensus
4. **Synthesis query** (`buildSynthesisPrompt`) -- Final weighted scores and confidence

Prompts are built in `eval-prompts.ts`, responses parsed in `eval-parsers.ts`.

## Data Storage

All data lives in `.claude-test-bench/` in the project root:

```
.claude-test-bench/
  setups/{id}.json            # TestSetup records (contains API keys -- gitignored)
  scenarios/custom/{id}.json  # User-created Scenario records
  runs/{id}.json              # Run records with full transcript
  evaluations/{id}.json       # Evaluation records with scores and compliance
  logs/ctb.log                # JSON log file (rotated at 2MB, 25 files max)
```

This directory is in `.gitignore`. Never commit it.

## How Setups Work

A `TestSetup` defines the full agent configuration:

1. **Provider** (`ProviderConfig`) -- API key + base URL, or OAuth token, plus model ID
2. **CLAUDE.md** (`ClaudeMdEntry[]`) -- Up to 2 entries (project/user role), inline content or loaded from file
3. **Rules** (`RuleEntry[]`) -- Named rule entries
4. **Skills** (`SkillEntry[]`) -- Named skill definitions
5. **Subagents** (`SubagentEntry[]`) -- Named subagent definitions with description, prompt, tools, model
6. **MCP Servers** (`McpServerEntry[]`) -- stdio, http, or sse transport configs
7. **Execution config** -- permissionMode, maxTurns, maxBudgetUsd, timeoutSeconds, thinking, effort, allowedTools

At run time, `env-builder.ts` converts the provider config into environment variables (`ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_DEFAULT_MODEL`, etc.). `agent-mapper.ts` converts subagents and MCP servers to SDK types. `WorkspaceBuilder` writes CLAUDE.md files, rules, skills, and workspace files to a temp directory.

## How Scenarios Work

A `Scenario` defines the task and its evaluation criteria:

- **prompt** -- The task given to the agent
- **workspaceFiles** -- Files written to the workspace before execution (e.g., source code, config files, data files)
- **expectedAnswer** -- The ground truth answer for comparison
- **criticalRequirements** -- Must-pass checks (binary pass/fail with evidence)
- **gradingGuidelines** -- This IS the LLM grading prompt. It tells the evaluator what to look for, what to penalize, and how to weight different aspects. For instruction-aware scenarios, include criteria that evaluate whether CLAUDE.md instructions visibly influenced behavior.
- **scoringDimensions** -- Named dimensions with weights (must sum to 1.0) and descriptions. Each is scored 0-10.

Categories: `planning`, `instruction-following`, `reasoning`, `tool-strategy`, `error-handling`, `ambiguity-handling`, `scope-management`, `custom`.

## How Evaluation Works

1. A completed Run is submitted for evaluation with one or more evaluator configs (each specifying a provider and role).
2. The `EvaluationOrchestrator` formats the run transcript using `transcript-formatter.ts`.
3. The `instruction-parser.ts` splits CLAUDE.md and rules into individual testable instruction blocks.
4. Score query: Each evaluator scores each dimension and evaluates critical requirements.
5. Compliance query: Each evaluator reports which instructions were followed, violated, or not applicable.
6. Debate (optional): If multiple evaluators disagree, they exchange arguments for up to `maxRounds`.
7. Synthesis: Final scores are computed as weighted averages with confidence and dissent tracking.

The evaluation record stores everything: rounds, answer comparison, critical results, setup compliance (instruction compliance + skill/subagent usage), synthesis, and cost ledger.

## Don't

- Don't add dependencies without checking `package.json` first
- Don't modify test files to make tests pass -- fix the source code
- Don't commit `.env` or `.claude-test-bench/` data
- Don't use CSS modules or component libraries -- Tailwind only
- Don't create files over 300 lines -- split into sub-components or sub-modules
- Don't use `any` -- find or create proper types
- Don't suppress errors silently -- crashes are data
- Don't skip `.js` extensions in ESM imports
- Don't use `React.FC` -- use plain function components with explicit return types
- Don't store secrets in scenario or run JSON -- they belong in setup JSON only (which is gitignored)
