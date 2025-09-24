export interface PlanStep {
  description: string;
  subPrompt: string;
}

export interface AIPlan {
  overallGoal: string;
  steps: PlanStep[];
}
