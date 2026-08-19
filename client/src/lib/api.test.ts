import { describe, expect, it } from "vitest";
import { friendlyApiError, getApiBase } from "./api";
import { buildUploadFormData, normalizeStatus } from "./contracts";

describe("VideoForge API configuration", () => {
  it("uses the supplied Vite environment endpoint without a hardcoded production fallback", () => {
    expect(getApiBase("http://91.99.162.143:8000")).toBe("http://91.99.162.143:8000");
    expect(getApiBase("https://facelessforge.ethinx.solutions/api/videoforge")).toBe("https://facelessforge.ethinx.solutions/api/videoforge");
  });

  it("turns browser fetch failures into visible CORS guidance", () => {
    expect(friendlyApiError(new TypeError("Failed to fetch"))).toContain("CORS or network error");
  });

  it("preserves ordinary API errors for user-facing display", () => {
    expect(friendlyApiError(new Error("500 Internal Server Error"))).toBe("500 Internal Server Error");
  });
});

describe("VideoForge job contract", () => {
  it.each([
    ["queued", "queued"],
    ["processing", "running"],
    ["completed", "passed"],
    ["failed", "failed"],
  ] as const)("normalizes backend status %s to %s", (input, expected) => {
    expect(normalizeStatus(input)).toBe(expected);
  });

  it("builds the required multipart upload payload", () => {
    const file = new File(["source"], "source.mp4", { type: "video/mp4" });
    const form = buildUploadFormData(file, "viral", "youtube", '{"quality":"high"}', "13", "eleven_multilingual_v2", "Pexels library");
    expect(form.get("file")).toBe(file);
    expect(form.get("preset")).toBe("viral");
    expect(form.get("platform")).toBe("youtube");
    expect(JSON.parse(String(form.get("settings_override")))).toMatchObject({ duration: 13, voice_model: "eleven_multilingual_v2", footage_source: "Pexels library", quality: "high" });
  });
});
