// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import Home from "../pages/Home";

const session = { token: "test-token", user: { id: "user-1", name: "Test Operator", email: "operator@example.com", role: "Member" } };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("authenticated Home workspace flow", () => {
  it("loads a project, opens its workspace, and filters visible recent jobs", async () => {
    localStorage.setItem("facelessforge.session", JSON.stringify(session));
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async input => {
      const url = String(input);
      if (url.endsWith("/api/projects")) return jsonResponse({ projects: [{ id: "project-1", name: "Launch film", description: "A focused brief", status: "active", created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-02T00:00:00Z" }] });
      if (url.endsWith("/api/projects/project-1")) return jsonResponse({ project: { id: "project-1", name: "Launch film", description: "A focused brief", status: "active" } });
      if (url.includes("/api/v1/jobs?")) return jsonResponse({ jobs: [
        { id: "running-job", project_id: "project-1", status: "running", topic: "Running export", progress: 42 },
        { id: "failed-job", project_id: "project-1", status: "failed", topic: "Failed export", error: "Encoder stopped" },
      ] });
      if (url.endsWith("/api/v1/jobs/failed-job/logs")) return jsonResponse({ logs: [{ level: "error", message: "Encoder stopped" }] });
      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      render(createElement(Home));
      await waitFor(() => expect(screen.getByText("Launch film")).not.toBeNull());
      fireEvent.click(screen.getAllByRole("button", { name: "Open Launch film" })[0]);
      await waitFor(() => expect(screen.getByText("Job metrics")).not.toBeNull());
      expect(screen.getByText("Running export")).not.toBeNull();
      expect(screen.getByText("Failed export")).not.toBeNull();

      fireEvent.change(screen.getByRole("combobox", { name: /filter recent pipeline jobs/i }), { target: { value: "failed" } });

      expect(screen.queryByText("Running export")).toBeNull();
      expect(screen.getByText("Failed export")).not.toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/v1/jobs/failed-job/logs"), expect.anything());
    } finally {
      fetchMock.mockRestore();
      localStorage.removeItem("facelessforge.session");
    }
  });
});
