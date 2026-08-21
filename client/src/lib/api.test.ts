import { describe, expect, it } from "vitest";
import { friendlyApiError, getApiBase, withApiAuth } from "./api";
import { extractProjects, extractSession, normalizeProject, projectPayload, projectWorkspaceMetrics } from "./contracts";
import { extractJobs, jobProgress, jobsForProject, pipelineSummary } from "./jobs";

describe("FacelessForge API configuration", () => {
  it("uses the supplied Vite endpoint without a production fallback or browser override", () => {
    expect(getApiBase("http://91.99.162.143:8000/")).toBe("http://91.99.162.143:8000");
    expect(getApiBase("https://facelessforge.ethinx.solutions/api/videoforge/")).toBe("https://facelessforge.ethinx.solutions/api/videoforge");
  });

  it("adds bearer authentication only when a session token is available", () => {
    expect(withApiAuth("studio-token").get("Authorization")).toBe("Bearer studio-token");
    expect(withApiAuth().get("Authorization")).toBeNull();
  });

  it("turns a connection failure into a visible, non-recovery error", () => {
    expect(friendlyApiError(new TypeError("Failed to fetch"))).toContain("No backend changes were attempted");
  });
});

describe("FacelessForge auth and project contracts", () => {
  it("normalizes a login response with token and profile", () => {
    expect(extractSession({ access_token: "token-1", user: { id: 7, name: "Ada Lovelace", email: "ada@example.com" } })).toEqual({ token: "token-1", user: { id: "7", name: "Ada Lovelace", email: "ada@example.com", role: undefined } });
  });

  it("accepts direct and wrapped project list payloads", () => {
    expect(extractProjects({ data: { projects: [{ project_id: 11, title: "Launch film", summary: "Outline", status: "active" }] } })).toEqual([{ id: "11", name: "Launch film", description: "Outline", status: "active", createdAt: undefined, updatedAt: undefined }]);
  });

  it("builds a trimmed project payload for create and update requests", () => {
    expect(projectPayload({ name: "  Spring launch ", description: "  Research narrative  ", status: "draft" })).toEqual({ name: "Spring launch", description: "Research narrative", status: "draft" });
    expect(normalizeProject({ id: "p-1", name: "A", status: "unknown" }).status).toBe("draft");
  });

  it("derives workspace metrics from live project fields without invented activity data", () => {
    const metrics = projectWorkspaceMetrics(normalizeProject({ id: "p-1", name: "Launch", description: "A focused launch brief", status: "active", created_at: new Date().toISOString() }));
    expect(metrics).toMatchObject([
      { label: "Brief depth", value: "4 words" },
      { label: "Setup progress", value: "100%" },
      { label: "Workspace age", value: "Today" },
    ]);
  });
});

describe("FacelessForge pipeline metrics", () => {
  const project = normalizeProject({ id: "project-1", name: "Launch campaign" });

  it("normalizes and associates only explicitly linked jobs with a project", () => {
    const jobs = extractJobs({ jobs: [
      { id: "job-1", project_id: "project-1", status: "processing", progress: 40, topic: "Explainer" },
      { id: "job-2", project_id: "other-project", status: "completed" },
      { id: "job-3", status: "queued" },
    ] });
    expect(jobsForProject(jobs, project)).toEqual([expect.objectContaining({ id: "job-1", status: "running", progress: 40 })]);
  });

  it("derives pipeline summary values from real job states and progress", () => {
    const jobs = extractJobs({ jobs: [
      { id: "job-1", project_id: "project-1", status: "running", progress: 50 },
      { id: "job-2", project_id: "project-1", status: "completed" },
      { id: "job-3", project_id: "project-1", status: "failed", progress: 20 },
    ] });
    const summary = pipelineSummary(jobsForProject(jobs, project));
    expect(summary).toMatchObject({ total: 3, running: 1, passed: 1, failed: 1, averageProgress: 57 });
    expect(jobProgress(jobs[1]!)).toBe(100);
  });
});
