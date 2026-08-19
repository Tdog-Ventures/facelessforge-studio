export type ProjectStatus = "draft" | "active" | "archived";

export type ApiUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectInput = Pick<Project, "name" | "description" | "status">;

export type AuthSession = {
  token?: string;
  user: ApiUser;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export function normalizeUser(value: unknown): ApiUser {
  const user = asRecord(value);
  return {
    id: String(user.id ?? user.user_id ?? user.email ?? "current-user"),
    name: String(user.name ?? user.full_name ?? user.email ?? "Studio member"),
    email: typeof user.email === "string" ? user.email : undefined,
    role: typeof user.role === "string" ? user.role : undefined,
  };
}

export function extractSession(value: unknown): AuthSession {
  const payload = asRecord(value);
  const data = asRecord(payload.data);
  const rawUser = payload.user ?? data.user ?? payload;
  const token = payload.access_token ?? payload.token ?? data.access_token ?? data.token;
  const user = normalizeUser(rawUser);

  if (!user.name) throw new Error("The authentication response did not include a user profile.");

  return { token: typeof token === "string" ? token : undefined, user };
}

export function normalizeProject(value: unknown): Project {
  const project = asRecord(value);
  const rawStatus = String(project.status ?? "draft").toLowerCase();
  const status: ProjectStatus = rawStatus === "active" || rawStatus === "archived" ? rawStatus : "draft";

  return {
    id: String(project.id ?? project.project_id ?? ""),
    name: String(project.name ?? project.title ?? "Untitled project"),
    description: String(project.description ?? project.summary ?? ""),
    status,
    createdAt: typeof project.created_at === "string" ? project.created_at : typeof project.createdAt === "string" ? project.createdAt : undefined,
    updatedAt: typeof project.updated_at === "string" ? project.updated_at : typeof project.updatedAt === "string" ? project.updatedAt : undefined,
  };
}

export function extractProjects(value: unknown): Project[] {
  const payload = asRecord(value);
  const data = asRecord(payload.data);
  const records = Array.isArray(value)
    ? value
    : Array.isArray(payload.projects)
      ? payload.projects
      : Array.isArray(data.projects)
        ? data.projects
        : Array.isArray(data.items)
          ? data.items
          : [];

  return records.map(normalizeProject).filter(project => project.id);
}

export function extractProject(value: unknown): Project {
  const payload = asRecord(value);
  const data = asRecord(payload.data);
  return normalizeProject(payload.project ?? data.project ?? data ?? payload);
}

export function projectPayload(project: ProjectInput) {
  return {
    name: project.name.trim(),
    description: project.description.trim(),
    status: project.status,
  };
}

export function formatProjectDate(value?: string) {
  if (!value) return "Recently updated";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Recently updated" : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}
