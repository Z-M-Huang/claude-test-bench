# Claude Test Bench

A local tool for benchmarking LLM agent behavior using the Claude Agent SDK.

## What It Does

Claude Test Bench lets you systematically test how AI agent configurations affect behavior. You define a **Setup** (provider, model, CLAUDE.md, skills, subagents) and a **Scenario** (prompt, workspace files, grading rubric), then run and evaluate them through a web UI.

Key use cases:

- **CLAUDE.md A/B Testing** -- Run the same scenario with and without CLAUDE.md to measure whether your instructions actually change agent behavior.
- **Model Comparison** -- Run the same scenario against different models (Sonnet, Opus, MiniMax, etc.) to compare reasoning quality.
- **Skill & Subagent Testing** -- Test whether SKILL.md and SUBAGENT.md definitions work as intended across different scenarios.
- **Instruction Effectiveness** -- The evaluator analyzes which specific CLAUDE.md instructions were followed and which were ignored.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN

# 3. Build
npm run build

# 4. Launch (opens browser at http://localhost:3847)
node dist/bin/ctb.js
```

CLI flags:

| Flag           | Default | Description                        |
|----------------|---------|------------------------------------|
| `--port N`     | 3847    | HTTP port                          |
| `--log-level`  | info    | debug, info, warn, error           |
| `--no-open`    |         | Don't auto-open browser            |

## Core Concepts

### Setup

A **Setup** defines how the agent is configured: provider credentials, model, CLAUDE.md content, rules, skills, subagents, MCP servers, permission mode, timeout, and thinking config.

```json
{
  "provider": { "kind": "api", "baseUrl": "https://api.anthropic.com", "apiKey": "sk-...", "model": "claude-sonnet-4-6" },
  "claudeMdFiles": [{ "role": "project", "content": "# Rules\n- Always show your work" }],
  "rules": [],
  "skills": [],
  "subagents": [],
  "mcpServers": [],
  "permissionMode": "acceptEdits",
  "timeoutSeconds": 300
}
```

See `docs/schemas/setup.example.json`, `setup-oauth.example.json`, and `setup-api.example.json` for complete examples.

### Scenario

A **Scenario** defines the task: a prompt, workspace files (written to a temp directory before the run), expected answer, critical requirements, grading guidelines, and scoring dimensions.

```json
{
  "prompt": "Read migration_plan.md and create an optimal schedule...",
  "workspaceFiles": [{ "path": "migration_plan.md", "content": "..." }],
  "expectedAnswer": "The migration CANNOT fit in the 4-hour window...",
  "criticalRequirements": ["Must identify the window is exceeded"],
  "gradingGuidelines": "Grade on correctness, reasoning quality...",
  "scoringDimensions": [
    { "name": "Correctness", "weight": 0.4, "description": "..." }
  ]
}
```

The `gradingGuidelines` field IS the LLM grading prompt -- it tells the evaluator what to look for. The `scoringDimensions` define the axes and weights for scoring.

See `docs/schemas/scenario.example.json`, `scenario-baseline.example.json`, and `scenario-with-claude-md.example.json`.

### Run

A **Run** pairs one Setup with one Scenario. The agent SDK's `query()` function executes the scenario prompt inside an isolated temp workspace. The full execution transcript (tool calls, thinking, output) is captured and stored.

### Evaluation

An **Evaluation** grades a completed Run. One or more LLM evaluators read the full transcript and score it using a split-query strategy:

1. **Score query** -- Scores each dimension, compares output to the expected answer, checks critical requirements.
2. **Compliance query** -- Analyzes which CLAUDE.md/rules instructions were followed, violated, or not applicable.
3. **Debate rounds** (optional) -- Multiple evaluators discuss disagreements to reach consensus.
4. **Synthesis query** -- Produces final weighted scores, confidence level, and dissenting opinions.

## How Grading Works

Each run is graded independently by an LLM evaluator. The evaluator:

1. Reads the full execution transcript (tool calls, reasoning, output).
2. Scores against the scenario's `gradingGuidelines` and `scoringDimensions`.
3. Compares the result to the `expectedAnswer`.
4. Checks each `criticalRequirements` entry for pass/fail.
5. Reports which CLAUDE.md instructions influenced behavior and which did not.

The evaluation produces:
- Per-dimension scores (0-10) with reasoning
- Answer comparison (match, similarity 0-1, explanation)
- Critical requirement results (met/not met with evidence)
- Instruction compliance report (followed, violated, not applicable)
- Skill and subagent usage reports
- Weighted total score and confidence level

## How to Test CLAUDE.md Effectiveness

To prove (or disprove) that your CLAUDE.md instructions change agent behavior:

### Step 1: Create a Baseline Setup (no instructions)

```json
{
  "name": "Sonnet Baseline",
  "claudeMdFiles": [],
  "provider": { "kind": "api", "model": "claude-sonnet-4-6", "..." : "..." }
}
```

### Step 2: Create an Instruction Setup (with CLAUDE.md)

```json
{
  "name": "Sonnet With Instructions",
  "claudeMdFiles": [{
    "role": "project",
    "content": "# Reasoning Guidelines\n\n1. Always calculate the critical path before proposing a schedule\n2. Verify all constraints are satisfied before declaring success\n3. If a constraint cannot be met, state this clearly rather than forcing a solution\n4. Show all arithmetic work"
  }],
  "provider": { "kind": "api", "model": "claude-sonnet-4-6", "..." : "..." }
}
```

### Step 3: Create a Scenario with instruction-aware grading

Write `gradingGuidelines` that evaluate both correctness AND whether each CLAUDE.md instruction visibly influenced behavior. See `docs/schemas/scenario-with-claude-md.example.json` for a full example.

### Step 4: Run both setups against the same scenario

Use the Run page to execute the scenario twice -- once with the baseline setup, once with the instruction setup.

### Step 5: Evaluate and compare

Evaluate both runs. The instruction-aware scenario's evaluation will report which instructions were EFFECTIVE, PARTIALLY EFFECTIVE, NOT EFFECTIVE, or NOT APPLICABLE. Compare the two evaluation reports to see whether instructions changed behavior and improved scores.

## Creating Setups & Scenarios

You can create setups and scenarios through the web UI or by writing JSON files directly:

- **Via UI**: Navigate to `/setups/new` or `/scenarios/new` in the web interface.
- **Via JSON**: Write files to `.claude-test-bench/setups/{id}.json` or `.claude-test-bench/scenarios/custom/{id}.json`.
- **Via AI**: Ask an AI assistant to generate JSON matching the schemas in `docs/schemas/`.

Reference examples:
- `docs/schemas/setup.example.json` -- API provider with CLAUDE.md
- `docs/schemas/setup-oauth.example.json` -- OAuth provider (baseline, no CLAUDE.md)
- `docs/schemas/setup-api.example.json` -- API provider with reasoning instructions
- `docs/schemas/scenario.example.json` -- Multi-file refactor scenario
- `docs/schemas/scenario-baseline.example.json` -- Migration scenario (baseline grading)
- `docs/schemas/scenario-with-claude-md.example.json` -- Migration scenario (instruction-aware grading)

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format

# Dev mode (watch server compilation)
npm run dev

# Build everything (server + web)
npm run build
```

## Project Structure

```
claude-test-bench/
  bin/
    ctb.ts                          # CLI entry point (port, log-level, --no-open)
  docs/
    schemas/                        # Example JSON for setups and scenarios
  e2e/                              # Playwright end-to-end tests
  src/
    server/
      index.ts                      # Express app factory (createApp)
      interfaces/
        evaluator.ts                # IEvaluator
        logger.ts                   # ILogger
        runner.ts                   # IRunner
        storage.ts                  # IStorage
        workspace.ts                # IWorkspaceBuilder
      routes/
        setups.ts                   # /api/setups CRUD
        scenarios.ts                # /api/scenarios CRUD
        runs.ts                     # /api/runs + run execution
        evaluations.ts              # /api/evaluations + eval pipeline
        run-queue.ts                # Run queue management
        eval-queue.ts               # Eval queue management
        run-sse.ts                  # SSE streaming for run progress
      services/
        storage.ts                  # JsonFileStorage (file-based JSON)
        runner.ts                   # ScenarioRunner (SDK query())
        evaluator.ts                # EvaluationOrchestrator (split-query eval)
        workspace.ts                # WorkspaceBuilder (temp dir per run)
        agent-mapper.ts             # Setup types -> SDK option types
        env-builder.ts              # Provider config -> env vars
        eval-prompts.ts             # Prompt builders for eval queries
        eval-parsers.ts             # Response parsers for eval results
        eval-parsers-debate-impl.ts # Debate round parsing
        eval-helpers.ts             # Consensus, answer comparison, compliance merge
        instruction-parser.ts       # Splits CLAUDE.md into testable blocks
        transcript-formatter.ts     # Formats run messages for eval context
        fs-adapter.ts               # File system abstraction for testing
        logger.ts                   # JsonLogger with file output
        log-rotator.ts              # Log rotation (2MB/file, 25 files)
        seeder.ts                   # Seed storage on first launch
      types/
        setup.ts                    # TestSetup, ProviderConfig, ClaudeMdEntry, etc.
        scenario.ts                 # Scenario, WorkspaceFile, ScenarioCategory
        run.ts                      # Run, RunStatus, SDKMessageRecord
        evaluation.ts               # Evaluation, EvaluationRound, InstructionCompliance
        index.ts                    # Re-exports
    web/
      src/
        App.tsx                     # React router (all page routes)
        api.ts                      # API client
        main.tsx                    # Entry point
        index.css                   # Tailwind CSS entry
        components/                 # Shared UI components
        pages/
          Dashboard.tsx             # /
          SetupList.tsx             # /setups
          SetupEditor.tsx           # /setups/new, /setups/:id/edit
          ScenarioList.tsx          # /scenarios
          ScenarioEditor.tsx        # /scenarios/new, /scenarios/:id
          RunPage.tsx               # /run
          RunHistory.tsx            # /history
          RunDetail.tsx             # /runs/:id
          EvalConfig.tsx            # /runs/:id/evaluate
          ReportView.tsx            # /evaluations/:id
  .env.example                      # Environment template
  package.json                      # Scripts, deps, bin entries
  tsconfig.json                     # Base TypeScript config
  tsconfig.server.json              # Server build config
  tsconfig.bin.json                 # CLI build config
  vite.config.ts                    # Vite config (web build)
  vitest.config.ts                  # Test runner config
  playwright.config.ts              # E2E test config
  tailwind.config.ts                # Tailwind configuration
```

## Tech Stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Backend   | Express 5, Node.js (ESM)                                |
| Frontend  | React 19, React Router 7, Tailwind CSS 4                |
| Build     | TypeScript 5, Vite 6                                    |
| Agent SDK | `@anthropic-ai/claude-agent-sdk` (query, streaming)     |
| Testing   | Vitest (unit), Playwright (E2E), Supertest (routes)     |
| Storage   | File-based JSON in `.claude-test-bench/`                 |

## License

ISC
