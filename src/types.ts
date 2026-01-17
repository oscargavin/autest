export interface DocSection {
  id: string;
  title: string;
  content: string;
  codeExamples: string[];
}

export interface Task {
  id: string;
  docTag: string; // maps to DocSection.id
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  testCode: string; // node:test compatible test
  solutionHint?: string; // what the solution should do
}

export interface TaskSet {
  library: string;
  libraryId: string; // context7 library ID
  generatedAt: string;
  docs: DocSection[];
  tasks: Task[];
}

export interface Attempt {
  taskId: string;
  variant: 'a' | 'b';
  iteration: number;
  code: string;
  testOutput: string;
  passed: boolean;
  timestamp: string;
}

export interface Result {
  taskId: string;
  docTag: string;
  a: {
    passedFirstTry: boolean;
    finalCode?: string;
  };
  b: {
    passedFirstTry: boolean;
    passedAfterRetry: boolean; // true if failed first but passed on retry
    totalAttempts: number;
    finalCode?: string;
  };
}

export interface EvaluationReport {
  library: string;
  generatedAt: string;
  evaluatedAt: string;
  summary: {
    totalTasks: number;
    // Round 1: First attempt (apples-to-apples)
    aFirstPassRate: number;
    bFirstPassRate: number;
    docImpact: number; // percentage points improvement from docs
    // Round 2: B iteration value
    bFailedFirstPass: number;
    bRescuedByRetry: number;
    iterationValue: number; // % of B failures rescued by retry
    // Final outcome
    bFinalPassRate: number;
  };
  results: Result[];
}
