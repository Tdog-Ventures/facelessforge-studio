export type UiStatus = "queued" | "running" | "passed" | "failed";
export type BackendStatus = "queued" | "running" | "processing" | "passed" | "completed" | "failed";

export function normalizeStatus(status?: BackendStatus): UiStatus {
  if (status === "processing") return "running";
  if (status === "completed") return "passed";
  return status === "running" || status === "passed" || status === "failed" ? status : "queued";
}

export function buildUploadFormData(file: File, preset: string, platform: string, settingsOverride: string, duration: string, voiceModel: string, footageSource: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("preset", preset);
  form.append("platform", platform);
  const parsed = settingsOverride.trim() ? JSON.parse(settingsOverride) : {};
  form.append("settings_override", JSON.stringify({ ...parsed, duration: Number(duration), voice_model: voiceModel, footage_source: footageSource }));
  return form;
}
