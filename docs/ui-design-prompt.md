# Claude Test Bench — UI Design Prompt

## Background

Claude Test Bench (`ctb`) is a local developer tool (npm package) for benchmarking how well LLMs follow instructions when using the Claude Agent SDK. It's NOT about whether the AI writes correct code — it's about whether the AI **thinks through problems correctly**, follows setup instructions (CLAUDE.md, rules, skills), and demonstrates good reasoning behavior.

**The key question this tool answers:** "I configured my AI agent with these rules and instructions — did it actually follow them? Where did it fall short?"

### How It Works (User Flow)

1. **Configure a Test Setup** — The user defines how the AI agent should behave: which API provider, what CLAUDE.md instructions, what rules, skills, subagents, and MCP servers to use
2. **Pick a Scenario** — Choose from 8 built-in behavior-focused scenarios (or create custom ones). Each scenario tests a specific reasoning ability like "does the AI ask clarifying questions when requirements are vague?"
3. **Run** — Execute the scenario with the configured setup. The AI agent works in a sandboxed temp workspace. All thinking, tool calls, and responses are captured in real-time
4. **Evaluate** — Multiple powerful AI models (evaluators) review the execution log and grade the agent's performance against the expected answer and setup compliance
5. **View Report** — See scores, what worked, what didn't, and crucially — which CLAUDE.md instructions were followed vs. ignored

### Target Users

Senior developers and AI engineers who configure Claude Code agents and want to verify their configurations actually work. They understand CLAUDE.md, skills, and subagents. They want data, not opinions.

---

## Tech Stack

- **Frontend**: React 18 + React Router + TypeScript
- **Backend**: Express REST API at `http://localhost:3847`
- **Real-time**: Server-Sent Events (SSE) for live run/evaluation streaming
- **Styling**: Your choice — Tailwind, CSS modules, or a component library. Prioritize clean, professional, developer-tool aesthetic. Dark mode preferred.

---

## Pages & Features

### 1. Dashboard / Home (`/`)

The landing page. Shows a quick overview:

- **Recent Runs** — Last 5 runs with status badges (pending/running/completed/failed/cancelled), setup name, scenario name, duration, cost
- **Quick Start** — Two prominent buttons: "New Setup" and "Start Run"
- **Stats** — Total setups, total scenarios, total runs, average score (if evaluations exist)

### 2. Setup List (`/setups`)

A table/card view of all test setups.

**Each setup card/row shows:**
- Name
- Provider type badge (`API` or `OAuth`)
- Model name (e.g., `claude-sonnet-4-6`, `MiniMax-M2.7`)
- Timeout setting
- Created date
- Action buttons: Edit, Duplicate, Delete

**Actions:**
- "New Setup" button → navigates to Setup Editor
- Click a setup → navigates to Setup Editor for editing

**API:** `GET /api/setups` → returns `[{id, name, providerType, model, createdAt}]`

### 3. Setup Editor (`/setups/new`, `/setups/:id/edit`)

This is the most complex form. It configures everything about how the AI agent behaves during a run.

**Sections (use tabs or accordion):**

#### Section A: Basic Info
- **Name** (text input, required)
- **Description** (textarea, optional)

#### Section B: Provider Configuration
Two tabs: **API** | **OAuth**

**API tab:**
- Base URL (text input, default: `https://api.anthropic.com`)
- API Key (password input, required)
- Model ID (text input, required, e.g. `claude-sonnet-4-6`)

**OAuth tab:**
- OAuth Token (password input, required)
- Model ID (text input, required)

#### Section C: CLAUDE.md Files (max 2)
A list of up to 2 CLAUDE.md entries. Each entry has:
- **Role** selector: `project` (root CLAUDE.md) or `user` (.claude/CLAUDE.md)
- **Content** (large code editor / textarea with monospace font, markdown)
- **Load from file** button — lets user enter a file path on their machine. When set, shows the path and a "Clear" button. Content is loaded at run time from that path.
- Add / Remove buttons

#### Section D: Rules
A dynamic list of rule entries. Each has:
- **Name** (text input — becomes the filename, e.g., `no-any` → `.claude/rules/no-any.md`)
- **Content** (code editor textarea)
- **Load from file** option (same as CLAUDE.md)
- Add / Remove buttons

#### Section E: Skills
Same pattern as rules:
- **Name** (text input — becomes `.claude/skills/{name}/SKILL.md`)
- **Content** (code editor textarea with markdown frontmatter support)
- **Load from file** option
- Add / Remove buttons

#### Section F: Subagents
Each subagent entry:
- **Name** (text input)
- **Description** (text input)
- **Prompt** (textarea)
- **Tools** (multi-select or comma-separated: Read, Write, Edit, Grep, Glob, Bash)
- **Model** (optional text input)
- **Load from file** option (loads the prompt from file)
- Add / Remove buttons

#### Section G: MCP Servers
User provides MCP server configurations. Each entry:
- **Name** (text input)
- **Type** selector: `stdio` | `http` | `sse`
- **stdio fields**: command (text), args (comma-separated), env vars (key=value pairs)
- **http fields**: url (text), headers (key=value pairs)
- **sse fields**: url (text), headers (key=value pairs)
- Add / Remove buttons

#### Section H: Advanced Settings (collapsible)
- **Timeout** (number input, seconds, default: 300)
- **Permission Mode** (dropdown: default, acceptEdits, bypassPermissions, plan, dontAsk)
- **Max Turns** (optional number)
- **Max Budget USD** (optional number)
- **Allowed Tools** (multi-select chips: Read, Write, Edit, Grep, Glob, Bash, Task)
- **Thinking** (radio: Adaptive / Enabled with budget tokens input / Disabled)
- **Effort** (radio: Low / Medium / High)

**Save button** → POST or PUT to `/api/setups`

**API:**
- Create: `POST /api/setups` with full body
- Update: `PUT /api/setups/:id` with full body
- Secrets are masked in GET responses (`****XXXX`) but sent in full on POST/PUT

### 4. Scenario List (`/scenarios`)

Card grid grouped by category. Categories are:
- `planning` — Architecture and decomposition scenarios
- `instruction-following` — CLAUDE.md compliance scenarios
- `reasoning` — Multi-constraint logic scenarios
- `tool-strategy` — Tool usage pattern scenarios
- `error-handling` — Failure diagnosis scenarios
- `ambiguity-handling` — Clarification-seeking scenarios
- `scope-management` — Over-engineering avoidance scenarios
- `custom` — User-created scenarios

**Each scenario card shows:**
- Name
- Category badge (color-coded)
- Built-in badge (if applicable — cannot edit/delete)
- Brief description (first ~100 chars of prompt)
- Number of critical requirements
- Scoring dimensions count

**Actions:**
- "New Scenario" button → Scenario Editor
- Click card → Scenario detail/editor
- Built-in scenarios show a lock icon and open in read-only mode

**API:** `GET /api/scenarios` → returns `[{id, name, category, builtIn, createdAt}]`

### 5. Scenario Editor (`/scenarios/new`, `/scenarios/:id/edit`)

**Fields:**
- **Name** (text input, required)
- **Category** (dropdown of 8 categories)
- **Prompt** (large textarea — the task given to the agent)
- **Workspace Files** — dynamic list of `{path, content}` pairs:
  - Path (text input, e.g., `src/calculator.ts`)
  - Content (code editor)
  - Add / Remove buttons
- **Expected Answer** (large textarea — the comprehensive gold-standard answer)
- **Critical Requirements** (string list — each is a pass/fail check):
  - Text input per item (e.g., "must ask at least one clarifying question")
  - Add / Remove buttons
- **Grading Guidelines** (textarea — how to grade)
- **Scoring Dimensions** — dynamic list:
  - Name (text input)
  - Weight (number input, 0-1)
  - Description (text input)
  - **Weight sum indicator** — show the current sum and highlight red if not 1.0
  - Add / Remove buttons

**Save button** → POST or PUT to `/api/scenarios`
**Built-in scenarios**: open in read-only mode with "Duplicate as Custom" button

### 6. Run Page (`/runs/new`)

The main execution page. Split into two panels:

**Left panel: Configuration**
- **Setup selector** (dropdown of all setups, showing name + model)
- **Scenario selector** (dropdown of all scenarios, showing name + category badge)
- **"Start Run" button** (prominent, disabled until both selected)

**Right panel: Live Execution Log** (appears after run starts)
This is the most important UI element. It shows the AI agent's work in real-time via SSE.

**Message types to render:**
- **Assistant text** — The AI's responses. Render as markdown.
- **Tool calls** — Show tool name (Read, Write, Edit, Bash, etc.) with a collapsible input/output section. Color-code by tool type.
- **Thinking blocks** — If present, show in a collapsible "Thinking" section with a brain icon. Lighter/muted styling.
- **Result** — Final result with success/failure badge

**Status bar** (fixed at top of right panel):
- Run status badge (pending → running → completed/failed)
- Elapsed time (live counter during execution)
- Turn count
- Cost (USD)
- **Abort button** (red, only visible during running status)

**After completion:**
- Show "Evaluate This Run" button → navigates to evaluation configuration

**SSE connection:** `GET /api/runs/:id/stream`
- Events: `status` (status string), `message` (SDKMessageRecord), `done` (empty)

**API:** `POST /api/runs` with `{setupId, scenarioId}` → returns `{id, status: 'pending'}`

### 7. Run History (`/runs`)

A table of all past runs with filtering.

**Columns:**
- Status badge (color-coded: green=completed, red=failed, yellow=running, gray=pending)
- Scenario name
- Setup name (with model)
- Duration
- Cost (USD)
- Turns
- Created date
- Actions: View, Evaluate, Delete

**Filters:**
- By setup (dropdown)
- By scenario (dropdown)
- By status (multi-select)

**Click a row** → Run Detail page

**API:** `GET /api/runs?setupId=X&scenarioId=Y`

### 8. Run Detail (`/runs/:id`)

Full view of a completed (or in-progress) run.

**Header:**
- Run ID, status badge, created date
- Setup name + model, Scenario name + category
- Duration, cost, turns

**Main content: Message Log** (same component as Run Page's live log, but static)
- All assistant messages, tool calls, thinking blocks rendered
- Collapsible sections for long content
- Search/filter within messages (optional but nice)

**Sidebar or bottom panel:**
- **Setup Snapshot** — collapsible view of the exact setup config at run time
- **Scenario Snapshot** — collapsible view of the scenario

**Actions:**
- "Evaluate This Run" button → opens evaluation configuration modal/page
- "Re-run" button → starts a new run with same setup+scenario
- "Delete" button

**API:** `GET /api/runs/:id` (full run with messages)

### 9. Evaluation Configuration (modal or page, triggered from Run Detail)

Before starting an evaluation, the user configures evaluator models.

**Fields:**
- **Evaluators** — dynamic list (at least 1, last one is the synthesizer):
  - Provider config (same API/OAuth pattern as setup)
  - Role name (text input, e.g., "Reasoning Analyst", "Code Quality Reviewer")
  - Add / Remove buttons
  - Visual indicator: last evaluator labeled as "Synthesizer"
- **Max Rounds** (number input, 1-5, default: 1)
  - If > 1, show info text: "Multi-round debate: evaluators will review each other's assessments and refine. More thorough but more expensive."
- **Max Budget USD** (optional number input)
- **Cost estimate** — show `evaluators × rounds × ~$0.XX per call`

**"Start Evaluation" button** → `POST /api/evaluations`

### 10. Report View (`/evaluations/:id`)

The final output — the evaluation report. This page has the most information density.

**Header:**
- Overall weighted score (large, prominent, 0-10 scale with color gradient)
- Answer closeness score (0-10)
- Evaluation status
- Cost, rounds completed, consensus reached (yes/no)

**Section A: Score Breakdown**
- Bar chart or radar chart of dimension scores
- Each dimension: name, score (0-10), weight, weighted contribution
- Color-coded: green (8-10), yellow (5-7), red (0-4)

**Section B: Critical Requirements**
- Checklist view: each critical requirement with pass/fail icon
- Evidence text for each (collapsible)
- Summary: "X of Y critical requirements met"

**Section C: Answer Comparison**
- Side-by-side or diff view:
  - Left: Expected answer (from scenario)
  - Right: Actual result (from run)
- Similarity score
- Missed critical parts highlighted
- Extra good parts highlighted (things the agent did that weren't expected)

**Section D: Setup Effectiveness** (THE KEY DIFFERENTIATOR)
This section answers: "Which of my CLAUDE.md instructions actually worked?"

**Instruction Compliance Table:**
| Instruction | Source | Status | Evidence |
|-------------|--------|--------|----------|
| "Never use any types" | CLAUDE.md (project) | Followed | Agent used strict types throughout |
| "Always run tests first" | CLAUDE.md (project) | Ignored | Agent wrote code without running tests |
| "Avoid over-engineering" | rules/simplicity.md | Followed | Agent created a single function |

Status badges: `Followed` (green), `Partially Followed` (yellow), `Ignored` (red), `Not Applicable` (gray), `Contradicted` (red with warning)

**Skill Usage Table:**
| Skill | Invoked | Effective | Notes |
|-------|---------|-----------|-------|

**Subagent Usage Table:**
| Subagent | Invoked | Effective | Notes |
|----------|---------|-----------|-------|

**Overall compliance rate** — percentage bar

**Section E: Strengths & Weaknesses**
- Bulleted lists with clear, specific findings
- Recommendations for improving the setup

**Section F: Evaluator Details** (collapsible accordion)
For each evaluator:
- Role, model, cost
- Individual scores
- Individual reasoning
- If multi-round: show position evolution across rounds

**Section G: Debate Timeline** (only if multi-round, maxRounds > 1)
- Round-by-round view showing how evaluators' positions evolved
- Verdicts per round (AGREE/DISAGREE/PARTIAL)
- Consensus indicator
- What changed between rounds

**API:** `GET /api/evaluations/:id`

---

## Design Guidelines

### Visual Identity
- **Dark mode first** — developer tool, used alongside code editors
- **Monospace for code** — all code content, file paths, CLAUDE.md content
- **Color system:**
  - Status: green (success/followed), red (failed/ignored), yellow (running/partial), gray (pending/na)
  - Categories: each scenario category gets a distinct muted color
  - Scores: gradient from red (0) through yellow (5) to green (10)

### Component Patterns
- **Code editor** — Large textarea with monospace font, line numbers optional. Used for CLAUDE.md, skills, rules, prompts, expected answers, workspace file content.
- **Dynamic lists** — Setup fields like rules, skills, subagents, MCP servers, workspace files, scoring dimensions, critical requirements. Each with Add/Remove. Some with "Load from file" option.
- **Collapsible sections** — Tool call details, thinking blocks, evaluator details, setup/scenario snapshots
- **Status badges** — Colored pill badges for run status, evaluation status, compliance status, category
- **SSE-powered live updates** — The message log on Run Page must stream in real-time

### Information Hierarchy
1. **Scores and status** — immediate visual impact (large numbers, color-coded badges)
2. **Compliance table** — the key insight (did instructions work?)
3. **Details on demand** — collapsible sections for deep dives (individual evaluator reasoning, message log, snapshots)

### Navigation
- **Sidebar** — Fixed left sidebar with nav links:
  - Home / Dashboard
  - Setups
  - Scenarios
  - New Run
  - Run History
  - (No direct link to evaluations — accessed through run detail)
- **Breadcrumbs** — Show context path (e.g., Runs > Run #abc123 > Evaluation #def456)

---

## API Reference (Quick)

```
Base URL: http://localhost:3847

GET    /api/health                    → { status: "ok", timestamp }
GET    /api/setups                    → SetupMetadata[]
POST   /api/setups                    → TestSetup (201)
GET    /api/setups/:id                → TestSetup (masked secrets)
PUT    /api/setups/:id                → TestSetup
DELETE /api/setups/:id                → 204

GET    /api/scenarios                 → ScenarioMetadata[]
POST   /api/scenarios                 → Scenario (201)
GET    /api/scenarios/:id             → Scenario
PUT    /api/scenarios/:id             → Scenario (403 if builtIn)
DELETE /api/scenarios/:id             → 204 (403 if builtIn)

POST   /api/runs                      → { id, status } (202)
GET    /api/runs                      → Run[] (no messages)
GET    /api/runs/:id                  → Run (full with messages)
GET    /api/runs/:id/summary          → Run (no messages)
GET    /api/runs/:id/stream           → SSE (status, message, done events)
DELETE /api/runs/:id                  → 204 (aborts if running)

POST   /api/evaluations               → { id, status } (202)
GET    /api/evaluations               → Evaluation[]
GET    /api/evaluations/:id           → Evaluation (full)
GET    /api/evaluations/:id/stream    → SSE (status, message, done events)
```

---

## What NOT to Build

- No authentication/login — single-user localhost tool
- No database — backend uses JSON files, UI just calls REST APIs
- No file upload — "Load from file" sends a file PATH string, not file content
- No real-time collaboration — single user
- No mobile responsive — desktop developer tool
