import type { Scenario } from '../types/index.js';

export interface WorkspaceResult {
  readonly workspacePath: string;
  readonly cleanup: () => Promise<void>;
}

export interface IWorkspaceBuilder {
  createWorkspace(scenario: Scenario): Promise<WorkspaceResult>;
}
