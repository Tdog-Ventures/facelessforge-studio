import { describe, expect, it } from "vitest";
import { DEFAULT_API_BASE, friendlyApiError } from "./api";

describe("VideoForge API configuration", () => {
  it("uses the requested direct FastAPI default", () => {
    expect(DEFAULT_API_BASE).toBe("http://91.99.162.143:8000");
  });

  it("turns browser fetch failures into visible CORS guidance", () => {
    expect(friendlyApiError(new TypeError("Failed to fetch"))).toContain("CORS or network error");
  });

  it("preserves ordinary API errors for user-facing display", () => {
    expect(friendlyApiError(new Error("500 Internal Server Error"))).toBe("500 Internal Server Error");
  });
});
