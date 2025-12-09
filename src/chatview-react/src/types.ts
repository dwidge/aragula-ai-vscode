export interface ChatMessage {
  id: string;
  parentId?: string;
  message?: {
    summary?: string;
    detail?: string;
    type?: string;
  };
  sender?: string;
  isCollapsed?: boolean;
  stepIndex?: number;
  text?: string;
  children?: ChatMessage[];
}

export interface PrivacyPair {
  search: string;
  replace: string;
}

export interface PlanStep {
  description: string;
  subPrompt: string;
  isCollapsed?: boolean;
}

export interface AIPlan {
  overallGoal: string;
  steps: PlanStep[];
}

export interface AIProviderSettings {
  name: string;
  vendor: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  provider?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface PlanState {
  status: "idle" | "planning" | "executing" | "paused" | "failed" | "completed";
  currentStepIndex: number;
  plan: AIPlan | null;
  error: string | null;
  filePaths: string[];
  providerSetting: AIProviderSettings | null;
  autoRemoveComments: boolean;
  autoFormat: boolean;
  autoFixErrors: boolean;
  stepCollapsedStates?: boolean[];
  tabId: string;
}
