const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Types matching backend
export interface ProgressEvent {
  stage: string;
  percent: number;
  message: string;
}

export type JobType = 'generate' | 'run' | 'evaluate' | 'export';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: JobType;
  library: string;
  status: JobStatus;
  progress: ProgressEvent | null;
  result: unknown | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface LibraryInfo {
  name: string;
  taskCount: number;
  docCount: number;
  generatedAt: string | null;
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
    passedAfterRetry: boolean;
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
    aFirstPassRate: number;
    bFirstPassRate: number;
    docImpact: number;
    bFailedFirstPass: number;
    bRescuedByRetry: number;
    iterationValue: number;
    bFinalPassRate: number;
  };
  results: Result[];
}

// API functions
export async function fetchLibraries(): Promise<LibraryInfo[]> {
  const res = await fetch(`${API_BASE}/api/libraries`);
  if (!res.ok) throw new Error('Failed to fetch libraries');
  const data = await res.json();
  return data.libraries;
}

export async function fetchResults(library: string): Promise<EvaluationReport | null> {
  const res = await fetch(`${API_BASE}/api/results/${library}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch results');
  const data = await res.json();
  return data.results;
}

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/api/jobs`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  const data = await res.json();
  return data.jobs;
}

export async function fetchJob(id: string): Promise<Job | null> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch job');
  const data = await res.json();
  return data.job;
}

export async function createJob(type: JobType, library: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, library }),
  });
  if (!res.ok) throw new Error('Failed to create job');
  const data = await res.json();
  return data.job;
}

// SSE subscription
export function subscribeToJob(
  jobId: string,
  handlers: {
    onProgress?: (event: ProgressEvent) => void;
    onComplete?: (job: Job) => void;
    onError?: (error: string) => void;
  }
): () => void {
  const eventSource = new EventSource(`${API_BASE}/api/jobs/${jobId}/sse`);

  eventSource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    handlers.onProgress?.(data);
  });

  eventSource.addEventListener('complete', (e) => {
    const data = JSON.parse(e.data);
    handlers.onComplete?.(data);
    eventSource.close();
  });

  eventSource.addEventListener('error', (e) => {
    if (e instanceof MessageEvent) {
      const data = JSON.parse(e.data);
      handlers.onError?.(data.error);
    }
    eventSource.close();
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return () => eventSource.close();
}
