// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { AuthenticatedWorkspacePreview } from "../pages/Home";

describe("authenticated workspace recent-run filter", () => {
  it("updates the visible job rows when the status filter changes", () => {
    render(createElement(AuthenticatedWorkspacePreview));
    expect(screen.getByText("Running export")).not.toBeNull();
    expect(screen.getByText("Failed export")).not.toBeNull();

    fireEvent.change(screen.getByRole("combobox", { name: /filter recent pipeline jobs/i }), { target: { value: "failed" } });

    expect(screen.queryByText("Running export")).toBeNull();
    expect(screen.getByText("Failed export")).not.toBeNull();
    expect(screen.getAllByText("Failed").length).toBeGreaterThan(0);
  });
});
