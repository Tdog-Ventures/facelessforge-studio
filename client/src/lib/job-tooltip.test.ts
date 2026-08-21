import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JobStatusBadge } from "../pages/Home";

describe("failed recent-run tooltip", () => {
  it("renders a focusable failed badge with a linked tooltip and reason", () => {
    const markup = renderToStaticMarkup(createElement(JobStatusBadge, {
      status: "failed",
      tooltipId: "pipeline-failure-tooltip-failed-1",
      errorReason: "Encoding exited with code 1",
    }));
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-describedby="pipeline-failure-tooltip-failed-1"');
    expect(markup).toContain('id="pipeline-failure-tooltip-failed-1"');
    expect(markup).toContain('role="tooltip"');
    expect(markup).toContain("Encoding exited with code 1");
  });

  it("keeps hover and keyboard focus visibility selectors in the stylesheet", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    expect(css).toContain(".failure-tooltip-wrap:hover .pipeline-failure-tooltip");
    expect(css).toContain(".failure-tooltip-wrap:focus-within .pipeline-failure-tooltip");
  });
});
