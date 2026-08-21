import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, CalendarClock, CheckCircle2,
  ChevronRight, CirclePlus, FolderKanban, Gauge, LayoutDashboard, Loader2,
  LogOut, Menu, Pencil, Plus, RefreshCw, Settings2, ShieldCheck, Sparkles,
  Trash2, Users, X,
} from "lucide-react";
import { api, friendlyApiError, withApiAuth } from "@/lib/api";
import {
  extractProject, extractProjects, extractSession, formatProjectDate, normalizeUser,
  projectPayload, projectWorkspaceMetrics,
  type ApiUser, type AuthSession, type Project, type ProjectInput, type ProjectStatus,
} from "@/lib/contracts";
import { cn } from "@/lib/utils";

type View = "overview" | "projects" | "workspace";
type LoadState = "idle" | "loading" | "ready" | "error";
type AuthMode = "login" | "register";
type ToastMessage = { id: number; title: string; description: string };

const SESSION_STORAGE_KEY = "facelessforge.session";

function loadStoredSession(): AuthSession | null {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as AuthSession;
    return parsed?.user ? { token: parsed.token, user: normalizeUser(parsed.user) } : null;
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (!session) localStorage.removeItem(SESSION_STORAGE_KEY);
  else localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function apiInit(session: AuthSession | null, init: RequestInit = {}): RequestInit {
  return { ...init, credentials: "include", headers: withApiAuth(session?.token, init.headers) };
}

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [view, setView] = useState<View>("overview");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectState, setProjectState] = useState<LoadState>("idle");
  const [projectError, setProjectError] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectDetail, setProjectDetail] = useState<Project | null>(null);
  const [workspaceState, setWorkspaceState] = useState<LoadState>("idle");
  const [workspaceError, setWorkspaceError] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editor, setEditor] = useState<{ project?: Project } | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((title: string, description: string) => {
    setToast({ id: Date.now(), title, description });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const loadProjects = useCallback(async () => {
    if (!session) return;
    setProjectState("loading");
    setProjectError("");
    try {
      const payload = await api<unknown>("/api/projects", apiInit(session));
      setProjects(extractProjects(payload));
      setProjectState("ready");
    } catch (error) {
      setProjectState("error");
      setProjectError(friendlyApiError(error));
    }
  }, [session]);

  useEffect(() => {
    if (session) void loadProjects();
    else {
      setProjects([]);
      setProjectState("idle");
      setProjectError("");
    }
  }, [loadProjects, session]);

  const loadProjectDetail = useCallback(async (project: Project) => {
    if (!session) return;
    setSelectedProject(project);
    setProjectDetail(project);
    setView("workspace");
    setWorkspaceState("loading");
    setWorkspaceError("");
    try {
      const payload = await api<unknown>(`/api/projects/${project.id}`, apiInit(session));
      const detail = extractProject(payload);
      const resolved = { ...project, ...detail, id: detail.id || project.id, name: detail.name || project.name, description: detail.description || project.description };
      setProjectDetail(resolved);
      setSelectedProject(resolved);
      setProjects(current => current.map(item => item.id === resolved.id ? resolved : item));
      setWorkspaceState("ready");
    } catch (error) {
      setWorkspaceState("error");
      setWorkspaceError(friendlyApiError(error));
    }
  }, [session]);

  const persistSession = (next: AuthSession | null) => {
    storeSession(next);
    setSession(next);
  };

  const handleLogout = async () => {
    setIsMenuOpen(false);
    try { await api<unknown>("/api/auth/logout", apiInit(session, { method: "POST" })); } catch { /* Clear local state even if the API is down. */ }
    finally { persistSession(null); setView("overview"); setSelectedProject(null); setProjectDetail(null); }
  };

  const activeProjects = projects.filter(project => project.status === "active");
  const drafts = projects.filter(project => project.status === "draft");
  const latestProject = [...projects].sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""))[0];
  const workspaceProject = projectDetail || selectedProject;

  if (!session) return <AuthScreen onAuthenticated={persistSession} />;

  const savedProject = (project: Project) => {
    const isNew = !editor?.project;
    setProjects(current => isNew ? [project, ...current.filter(item => item.id !== project.id)] : current.map(item => item.id === project.id ? project : item));
    if (selectedProject?.id === project.id) { setSelectedProject(project); setProjectDetail(project); }
    setProjectState("ready");
    setProjectError("");
    setEditor(null);
    showToast(isNew ? "Project created" : "Project updated", isNew ? `${project.name} is ready for its first brief.` : `Changes to ${project.name} were saved.`);
    if (isNew) { setSelectedProject(project); setProjectDetail(project); setWorkspaceState("ready"); setView("workspace"); }
  };

  const deletedProject = (id: string) => {
    const removed = projects.find(project => project.id === id);
    setProjects(current => current.filter(project => project.id !== id));
    if (selectedProject?.id === id) { setSelectedProject(null); setProjectDetail(null); setView("projects"); }
    setDeleting(null);
    showToast("Project deleted", `${removed?.name || "The project"} was removed from the workspace.`);
  };

  return <div className="forge-shell">
    <aside className="forge-sidebar" aria-label="Workspace navigation">
      <Brand />
      <div className="workspace-label"><span className="workspace-pulse" /> PRIVATE WORKSPACE</div>
      <nav className="forge-nav">
        <NavButton icon={LayoutDashboard} label="Overview" active={view === "overview"} onClick={() => setView("overview")} />
        <NavButton icon={FolderKanban} label="Projects" active={view === "projects" || view === "workspace"} onClick={() => setView("projects")} count={projects.length || undefined} />
      </nav>
      <div className="sidebar-bottom">
        <div className={cn("connection-card", projectState === "error" && "connection-error")}><span className="connection-dot" /><div><strong>{projectState === "error" ? "Service unavailable" : "API workspace"}</strong><small>{projectState === "error" ? "Requests are paused" : "Direct API connection"}</small></div></div>
        <button className="user-identity" onClick={() => setIsMenuOpen(value => !value)} aria-expanded={isMenuOpen}><span className="user-initials">{initials(session.user)}</span><span><strong>{session.user.name}</strong><small>{session.user.role || "Member"}</small></span><ChevronRight size={16} /></button>
        {isMenuOpen && <div className="account-menu"><span>{session.user.email || "Signed in"}</span><button onClick={handleLogout}><LogOut size={15} /> Sign out</button></div>}
      </div>
    </aside>

    <main className="forge-main">
      <header className="forge-topbar">
        <button className="mobile-menu" onClick={() => setIsMenuOpen(value => !value)} aria-label="Open account menu"><Menu size={19} /></button>
        <div className="mobile-logo"><Sparkles size={15} /> FACELESSFORGE</div>
        <div className="breadcrumbs"><span>Studio</span><ChevronRight size={14} /><strong>{view === "workspace" ? workspaceProject?.name || "Project workspace" : view === "overview" ? "Overview" : "Projects"}</strong></div>
        <button className={cn("service-indicator", projectState === "error" && "is-offline")} onClick={() => void loadProjects()} title="Refresh projects">{projectState === "loading" ? <Loader2 size={13} className="spin" /> : <span />}{projectState === "error" ? "Service offline" : projectState === "loading" ? "Loading" : "API connected"}</button>
      </header>
      {projectState === "error" && <ServiceAlert message={projectError} onRetry={() => void loadProjects()} />}
      {view === "overview" && <Overview projectState={projectState} projects={projects} activeProjects={activeProjects} drafts={drafts} latestProject={latestProject} onNewProject={() => setEditor({})} onViewProjects={() => setView("projects")} onEditProject={project => setEditor({ project })} onOpenProject={project => void loadProjectDetail(project)} />}
      {view === "projects" && <ProjectsPage projects={projects} state={projectState} onNewProject={() => setEditor({})} onEditProject={project => setEditor({ project })} onOpenProject={project => void loadProjectDetail(project)} onDeleteProject={setDeleting} onRetry={() => void loadProjects()} />}
      {view === "workspace" && workspaceProject && <ProjectWorkspace project={workspaceProject} state={workspaceState} error={workspaceError} onBack={() => setView("projects")} onRefresh={() => void loadProjectDetail(workspaceProject)} onEdit={() => setEditor({ project: workspaceProject })} onDelete={() => setDeleting(workspaceProject)} />}
    </main>
    {editor && <ProjectEditor project={editor.project} session={session} onClose={() => setEditor(null)} onSaved={savedProject} />}
    {deleting && <DeleteDialog project={deleting} session={session} onClose={() => setDeleting(null)} onDeleted={deletedProject} />}
    {toast && <ToastMessageView toast={toast} onClose={() => setToast(null)} />}
  </div>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSubmitting(true); setError(""); try { const body = mode === "register" ? { name: name.trim(), email: email.trim(), password } : { email: email.trim(), password }; const payload = await api<unknown>(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); onAuthenticated(extractSession(payload)); } catch (requestError) { setError(friendlyApiError(requestError)); } finally { setSubmitting(false); } };
  return <div className="auth-shell"><div className="auth-aurora auth-aurora-one" /><div className="auth-aurora auth-aurora-two" /><section className="auth-story"><Brand /><div className="auth-copy"><span className="eyebrow"><span className="workspace-pulse" /> PRODUCTION CONTROL ROOM</span><h1>Build your next<br /><em>story world.</em></h1><p>FacelessForge gives your content operation a calm place to organize the projects that become remarkable videos.</p></div><div className="auth-notes"><span><CheckCircle2 size={15} /> Project-led workflow</span><span><ShieldCheck size={15} /> Direct API connection</span><span><Users size={15} /> Built for creative teams</span></div></section><section className="auth-panel"><div className="auth-card"><div className="auth-card-head"><span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "CREATE WORKSPACE ACCESS"}</span><h2>{mode === "login" ? "Sign in to your studio." : "Start shaping the pipeline."}</h2><p>{mode === "login" ? "Use your existing account to continue where your team left off." : "Create an account to begin managing video projects."}</p></div>{error && <div className="inline-error"><AlertTriangle size={16} /><span>{error}</span></div>}<form className="auth-form" onSubmit={submit}>{mode === "register" && <label>Display name<input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" autoComplete="name" required /></label>}<label>Work email<input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@studio.com" autoComplete="email" required /></label><label>Password<input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Enter your password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required /></label><button className="action-button full" disabled={submitting}>{submitting ? <Loader2 className="spin" size={17} /> : <ArrowRight size={17} />}{submitting ? "Connecting…" : mode === "login" ? "Enter the studio" : "Create account"}</button></form><p className="auth-switch">{mode === "login" ? "New to FacelessForge?" : "Already have an account?"}<button onClick={() => { setMode(value => value === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p><p className="auth-footnote">Requests go directly to the configured API. If the service is unavailable, this page will show the response without attempting any backend recovery.</p></div></section></div>;
}

function Overview({ projectState, projects, activeProjects, drafts, latestProject, onNewProject, onViewProjects, onEditProject, onOpenProject }: { projectState: LoadState; projects: Project[]; activeProjects: Project[]; drafts: Project[]; latestProject?: Project; onNewProject: () => void; onViewProjects: () => void; onEditProject: (project: Project) => void; onOpenProject: (project: Project) => void }) {
  return <div className="page-wrap"><section className="overview-hero"><div><span className="eyebrow">YOUR PRODUCTION HQ</span><h1>Make the work<br /><em>matter.</em></h1><p>Bring every video concept, workflow, and creative decision into one focused project space.</p></div><button className="action-button" onClick={onNewProject}><Plus size={17} /> New project <ArrowRight size={16} /></button></section><section className="metric-grid"><Metric icon={FolderKanban} label="All projects" value={projectState === "loading" ? "—" : String(projects.length).padStart(2, "0")} tone="blue" /><Metric icon={Gauge} label="Active projects" value={projectState === "loading" ? "—" : String(activeProjects.length).padStart(2, "0")} tone="teal" /><Metric icon={Pencil} label="Draft concepts" value={projectState === "loading" ? "—" : String(drafts.length).padStart(2, "0")} tone="violet" /><Metric icon={Sparkles} label="Latest update" value={projectState === "loading" ? "—" : latestProject ? formatProjectDate(latestProject.updatedAt || latestProject.createdAt).replace(/, \d{4}/, "") : "—"} tone="amber" /></section><section className="overview-grid"><div className="surface-card recent-card"><div className="section-heading"><div><span className="eyebrow">PROJECT PULSE</span><h2>Recent projects</h2></div><button className="text-link" onClick={onViewProjects}>View all <ArrowRight size={14} /></button></div><ProjectContent state={projectState} projects={projects.slice(0, 4)} onNewProject={onNewProject} onEditProject={onEditProject} onOpenProject={onOpenProject} compact /></div><div className="surface-card readiness-card"><div className="orbital"><div className="orbital-center"><Sparkles size={22} /></div><span /><span /><span /></div><span className="eyebrow">STUDIO SIGNAL</span><h2>Ready for your next frame.</h2><p>Create a project to capture a concept before it turns into a production schedule.</p><button className="soft-button" onClick={onNewProject}>Create a project <CirclePlus size={15} /></button></div></section></div>;
}

function ProjectsPage({ projects, state, onNewProject, onEditProject, onOpenProject, onDeleteProject, onRetry }: { projects: Project[]; state: LoadState; onNewProject: () => void; onEditProject: (project: Project) => void; onOpenProject: (project: Project) => void; onDeleteProject: (project: Project) => void; onRetry: () => void }) {
  return <div className="page-wrap projects-page"><section className="page-heading"><div><span className="eyebrow">CONTENT OPERATIONS</span><h1>Projects</h1><p>Organize the ideas, scripts, and creative direction behind your next release.</p></div><button className="action-button" onClick={onNewProject}><Plus size={17} /> New project</button></section><div className="surface-card project-table-card"><div className="project-table-head"><span>Project</span><span>Status</span><span>Last updated</span><span><button className="icon-action" onClick={onRetry} title="Refresh projects"><RefreshCw size={16} className={state === "loading" ? "spin" : ""} /></button></span></div><ProjectContent state={state} projects={projects} onNewProject={onNewProject} onEditProject={onEditProject} onOpenProject={onOpenProject} onDeleteProject={onDeleteProject} /></div></div>;
}

function ProjectContent({ state, projects, onNewProject, onEditProject, onOpenProject, onDeleteProject, compact = false }: { state: LoadState; projects: Project[]; onNewProject: () => void; onEditProject: (project: Project) => void; onOpenProject: (project: Project) => void; onDeleteProject?: (project: Project) => void; compact?: boolean }) {
  if (state === "loading") return <div className="project-loading"><Loader2 className="spin" size={19} /><span>Loading your projects…</span></div>;
  if (state === "error") return <div className="project-empty"><AlertTriangle size={25} /><strong>Projects could not be loaded.</strong><span>The service is currently unavailable. Your local interface remains ready to retry.</span></div>;
  if (!projects.length) return <div className="project-empty"><FolderKanban size={26} /><strong>No projects yet.</strong><span>Start with a concept, a name, and a clear direction.</span><button className="soft-button" onClick={onNewProject}><Plus size={15} /> Create first project</button></div>;
  return <div className={cn("project-list", compact && "compact")}>{projects.map(project => <article className="project-row" key={project.id}><div className="project-icon"><FolderKanban size={17} /></div><button className="project-info project-open" onClick={() => onOpenProject(project)} title={`Open ${project.name}`}><strong>{project.name}</strong><span>{project.description || "No project description yet."}</span></button><StatusBadge status={project.status} /><time>{formatProjectDate(project.updatedAt || project.createdAt)}</time><div className="project-actions"><button className="icon-action" onClick={() => onOpenProject(project)} title={`Open ${project.name}`}><ArrowRight size={15} /></button><button className="icon-action" onClick={() => onEditProject(project)} title={`Edit ${project.name}`}><Pencil size={15} /></button>{onDeleteProject && <button className="icon-action destructive" onClick={() => onDeleteProject(project)} title={`Delete ${project.name}`}><Trash2 size={15} /></button>}</div></article>)}</div>;
}

function ProjectWorkspace({ project, state, error, onBack, onRefresh, onEdit, onDelete }: { project: Project; state: LoadState; error: string; onBack: () => void; onRefresh: () => void; onEdit: () => void; onDelete: () => void }) {
  const metrics = projectWorkspaceMetrics(project);
  return <div className="page-wrap workspace-page"><button className="back-link" onClick={onBack}><ArrowLeft size={15} /> All projects</button><section className="workspace-hero"><div><div className="workspace-project-mark"><FolderKanban size={21} /></div><span className="eyebrow">PROJECT WORKSPACE</span><h1>{project.name}</h1><p>{project.description || "This project has no creative direction yet. Add one in project settings to shape the next production step."}</p><div className="workspace-meta"><StatusBadge status={project.status} /><span>Created {formatProjectDate(project.createdAt)}</span><span>Updated {formatProjectDate(project.updatedAt)}</span></div></div><div className="workspace-actions"><button className="soft-button" onClick={onRefresh}>{state === "loading" ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />} Refresh</button><button className="action-button" onClick={onEdit}><Settings2 size={16} /> Project settings</button></div></section>{state === "error" && <div className="workspace-alert"><AlertTriangle size={17} /><div><strong>Project detail could not be refreshed</strong><span>{error}</span></div><button className="soft-button" onClick={onRefresh}>Retry</button></div>}<section className="workspace-metric-grid">{metrics.map((metric, index) => <div className="workspace-metric" key={metric.label}><span className={cn("workspace-metric-icon", `metric-${index}`)}>{index === 0 ? <BarChart3 size={18} /> : index === 1 ? <CheckCircle2 size={18} /> : <CalendarClock size={18} />}</span><div><small>{metric.label}</small><strong>{state === "loading" ? "…" : metric.value}</strong><span>{metric.detail}</span></div></div>)}</section><section className="workspace-grid"><div className="surface-card workspace-brief"><div className="section-heading"><div><span className="eyebrow">CREATIVE DIRECTION</span><h2>Project brief</h2></div><button className="text-link" onClick={onEdit}>Edit settings <ArrowRight size={14} /></button></div><div className={cn("brief-content", !project.description && "is-empty")}>{project.description ? <p>{project.description}</p> : <><Sparkles size={22} /><strong>Give the project a stronger signal.</strong><span>A concise creative direction makes it easier to align every production decision.</span><button className="soft-button" onClick={onEdit}><Pencil size={14} /> Add creative direction</button></>}</div></div><aside className="surface-card workspace-settings"><div className="section-heading"><div><span className="eyebrow">PROJECT CONTROL</span><h2>Settings</h2></div><Settings2 size={17} className="settings-heading-icon" /></div><dl className="setting-list"><div><dt>Project status</dt><dd><StatusBadge status={project.status} /></dd></div><div><dt>Project ID</dt><dd className="mono-value">{project.id}</dd></div><div><dt>Created</dt><dd>{formatProjectDate(project.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatProjectDate(project.updatedAt)}</dd></div></dl><button className="soft-button full-settings-button" onClick={onEdit}><Settings2 size={15} /> Edit project settings</button><button className="delete-link" onClick={onDelete}><Trash2 size={14} /> Delete project</button></aside></section></div>;
}

function ProjectEditor({ project, session, onClose, onSaved }: { project?: Project; session: AuthSession; onClose: () => void; onSaved: (project: Project) => void }) {
  const [form, setForm] = useState<ProjectInput>({ name: project?.name || "", description: project?.description || "", status: project?.status || "draft" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = <K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) => setForm(current => ({ ...current, [key]: value }));
  const save = async (event: React.FormEvent) => { event.preventDefault(); if (!form.name.trim()) { setError("A project name is required."); return; } setSaving(true); setError(""); try { const payload = await api<unknown>(project ? `/api/projects/${project.id}` : "/api/projects", apiInit(session, { method: project ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(projectPayload(form)) })); const saved = extractProject(payload); onSaved({ ...saved, id: saved.id || project?.id || "", name: saved.name || form.name.trim(), description: saved.description || form.description.trim(), status: saved.status || form.status }); } catch (requestError) { setError(friendlyApiError(requestError)); } finally { setSaving(false); } };
  return <div className="modal-layer" role="presentation" onMouseDown={onClose}><form className="modal-card" onSubmit={save} onMouseDown={event => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">{project ? "EDIT PROJECT SETTINGS" : "NEW PROJECT"}</span><h2>{project ? "Refine the brief." : "Set the direction."}</h2></div><button type="button" className="icon-action" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>{error && <div className="inline-error"><AlertTriangle size={16} /><span>{error}</span></div>}<label className="field-label">Project name<input value={form.name} onChange={event => update("name", event.target.value)} placeholder="e.g. The creator economy report" maxLength={120} autoFocus /></label><label className="field-label">Creative direction<textarea value={form.description} onChange={event => update("description", event.target.value)} placeholder="What is this project designed to explore?" maxLength={600} /></label><label className="field-label">Project status<select value={form.status} onChange={event => update("status", event.target.value as ProjectStatus)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label><div className="modal-actions"><button type="button" className="soft-button" onClick={onClose}>Cancel</button><button className="action-button" disabled={saving}>{saving ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}{saving ? "Saving…" : project ? "Save changes" : "Create project"}</button></div></form></div>;
}

function DeleteDialog({ project, session, onClose, onDeleted }: { project: Project; session: AuthSession; onClose: () => void; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => { setDeleting(true); setError(""); try { await api<unknown>(`/api/projects/${project.id}`, apiInit(session, { method: "DELETE" })); onDeleted(project.id); } catch (requestError) { setError(friendlyApiError(requestError)); setDeleting(false); } };
  return <div className="modal-layer" role="presentation" onMouseDown={onClose}><div className="modal-card compact-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={event => event.stopPropagation()}><div className="danger-mark"><Trash2 size={19} /></div><h2 id="delete-title">Delete “{project.name}”?</h2><p>This removes the project from the workspace. This action cannot be undone through this interface.</p>{error && <div className="inline-error"><AlertTriangle size={16} /><span>{error}</span></div>}<div className="modal-actions"><button className="soft-button" onClick={onClose} disabled={deleting}>Cancel</button><button className="danger-button" onClick={confirm} disabled={deleting}>{deleting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}{deleting ? "Deleting…" : "Delete project"}</button></div></div></div>;
}

function ToastMessageView({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) { return <div className="toast-viewport" aria-live="polite" aria-atomic="true"><div className="success-toast" role="status"><span><CheckCircle2 size={18} /></span><div><strong>{toast.title}</strong><p>{toast.description}</p></div><button className="icon-action" onClick={onClose} aria-label="Dismiss notification"><X size={16} /></button></div></div>; }
function ServiceAlert({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="service-alert"><AlertTriangle size={18} /><div><strong>API service is unavailable</strong><span>{message}</span></div><button className="soft-button" onClick={onRetry}><RefreshCw size={14} /> Retry</button></div>; }
function Metric({ icon: Icon, label, value, tone }: { icon: typeof FolderKanban; label: string; value: string; tone: string }) { return <div className="metric-card"><span className={cn("metric-icon", tone)}><Icon size={18} /></span><div><span>{label}</span><strong>{value}</strong></div></div>; }
function StatusBadge({ status }: { status: ProjectStatus }) { return <span className={cn("status-badge", status)}>{status === "active" ? "Active" : status === "archived" ? "Archived" : "Draft"}</span>; }
function NavButton({ icon: Icon, label, active, onClick, count }: { icon: typeof LayoutDashboard; label: string; active: boolean; onClick: () => void; count?: number }) { return <button className={cn("nav-button", active && "active")} onClick={onClick}><Icon size={17} /><span>{label}</span>{count !== undefined && <small>{count}</small>}</button>; }
function Brand() { return <div className="brand-lockup"><span className="brand-mark"><Sparkles size={17} /></span><span><strong>FACELESS<span>FORGE</span></strong><small>STUDIO</small></span></div>; }
function initials(user: ApiUser) { return user.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "FF"; }
