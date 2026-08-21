import type { Project } from "./contracts";

export type JobStatus = "queued" | "running" | "passed" | "failed";
export type JobStatusFilter = JobStatus | "all";

export type PipelineJob = {
  id: string;
  projectId?: string;
  status: JobStatus;
  progress?: number;
  stage?: string;
  topic?: string;
  platform?: string;
  createdAt?: string;
  errorReason?: string;
  failureDetailsState?: "loading" | "ready" | "unavailable";
};

export type PipelineSummary = {
  total: number;
  queued: number;
  running: number;
  passed: number;
  failed: number;
  averageProgress: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function normalizeStatus(value: unknown): JobStatus {
  const status = String(value ?? "queued").toLowerCase();
  if (status === "processing") return "running";
  if (status === "completed" || status === "passed") return "passed";
  return status === "running" || status === "failed" ? status : "queued";
}

function readText(...values: unknown[]) {
  return values.find(value => typeof value === "string" && value.trim()) as string | undefined;
}

export function failureReason(job: PipelineJob) {
  if (job.failureDetailsState === "loading") return "Loading failure details…";
  if (job.failureDetailsState === "unavailable" && !job.errorReason) return "Failure details unavailable; job logs could not be loaded.";
  return job.errorReason || "The pipeline reported a failure without a specific reason.";
}

export function failureTooltipId(jobId: string) {
  return `pipeline-failure-tooltip-${jobId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function extractFailureReasonFromLogs(value: unknown) {
  const payload = asRecord(value);
  const records: unknown[] = Array.isArray(value)
    ? value as unknown[]
    : Array.isArray(payload.logs)
      ? payload.logs as unknown[]
      : Array.isArray(payload.data)
        ? payload.data as unknown[]
        : Array.isArray(asRecord(payload.data).logs)
          ? asRecord(payload.data).logs as unknown[]
          : [];
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = asRecord(records[index]);
    const level = String(record.level ?? record.severity ?? "").toLowerCase();
    const text = readText(record.message, record.detail, record.error, record.reason, typeof records[index] === "string" ? records[index] : undefined);
    if (text && (level === "error" || /error|fail|exception|timeout|unable|could not/i.test(text))) return text;
  }
  return undefined;
}

export function normalizeJob(value: unknown): PipelineJob {
  const job = asRecord(value);
  const nestedProject = asRecord(job.project);
  const status = normalizeStatus(job.status);
  const progress = Number(job.progress ?? job.percent);

  return {
    id: String(job.id ?? job.job_id ?? job.jobId ?? ""),
    projectId: job.project_id !== undefined || job.projectId !== undefined || nestedProject.id !== undefined
      ? String(job.project_id ?? job.projectId ?? nestedProject.id)
      : undefined,
    status,
    progress: Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : undefined,
    stage: typeof job.stage === "string" ? job.stage : undefined,
    topic: typeof job.topic === "string" ? job.topic : typeof job.title === "string" ? job.title : undefined,
    platform: typeof job.platform === "string" ? job.platform : undefined,
    createdAt: typeof job.created_at === "string" ? job.created_at : typeof job.createdAt === "string" ? job.createdAt : undefined,
    errorReason: status === "failed" ? readText(job.error, job.error_message, job.failure_reason, job.failureReason, job.message, asRecord(job.result).error) : undefined,
    failureDetailsState: status === "failed" ? "ready" : undefined,
  };
}

export function extractJobs(value: unknown): PipelineJob[] {
  const payload = asRecord(value);
  const data = asRecord(payload.data);
  const records = Array.isArray(value)
    ? value
    : Array.isArray(payload.jobs)
      ? payload.jobs
      : Array.isArray(data.jobs)
        ? data.jobs
        : Array.isArray(data.items)
          ? data.items
          : [];

  return records.map(normalizeJob).filter(job => job.id);
}

export function jobsForProject(jobs: PipelineJob[], project: Project) {
  return jobs.filter(job => job.projectId === project.id);
}

export function filterJobsByStatus(jobs: PipelineJob[], filter: JobStatusFilter) {
  return filter === "all" ? jobs : jobs.filter(job => job.status === filter);
}

export function jobProgress(job: PipelineJob) {
  return job.progress ?? (job.status === "passed" ? 100 : 0);
}

export function pipelineSummary(jobs: PipelineJob[]): PipelineSummary {
  const totalProgress = jobs.reduce((total, job) => total + jobProgress(job), 0);
  return {
    total: jobs.length,
    queued: jobs.filter(job => job.status === "queued").length,
    running: jobs.filter(job => job.status === "running").length,
    passed: jobs.filter(job => job.status === "passed").length,
    failed: jobs.filter(job => job.status === "failed").length,
    averageProgress: jobs.length ? Math.round(totalProgress / jobs.length) : 0,
  };
}
