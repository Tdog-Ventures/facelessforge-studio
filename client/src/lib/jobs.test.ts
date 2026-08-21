import { describe, expect, it } from "vitest";
import { failureReason, failureTooltipId, filterJobsByStatus, normalizeJob } from "./jobs";

describe("recent pipeline jobs", () => {
  it("extracts a specific failure reason from backend error fields", () => {
    const job = normalizeJob({ id: "failed-1", status: "failed", error_message: "Whisper transcription timed out" });
    expect(job.errorReason).toBe("Whisper transcription timed out");
    expect(failureReason(job)).toBe("Whisper transcription timed out");
  });

  it("uses a clear fallback when a failed job has no message", () => {
    expect(failureReason(normalizeJob({ id: "failed-2", status: "failed" }))).toContain("without a specific reason");
  });

  it("creates unique safe tooltip IDs for multiple failed rows", () => {
    expect(failureTooltipId("failed/one")).toBe("pipeline-failure-tooltip-failed-one");
    expect(failureTooltipId("failed/two")).not.toBe(failureTooltipId("failed/one"));
  });

  it("filters recent jobs by the selected status", () => {
    const jobs = [
      normalizeJob({ id: "q", status: "queued" }),
      normalizeJob({ id: "r", status: "running" }),
      normalizeJob({ id: "p", status: "completed" }),
      normalizeJob({ id: "f", status: "failed" }),
    ];
    expect(filterJobsByStatus(jobs, "failed").map(job => job.id)).toEqual(["f"]);
    expect(filterJobsByStatus(jobs, "running").map(job => job.id)).toEqual(["r"]);
    expect(filterJobsByStatus(jobs, "all")).toHaveLength(4);
  });
});
