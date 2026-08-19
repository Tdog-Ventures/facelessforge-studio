import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowUpRight, Check, ChevronRight, CircleAlert, Clock3, Download,
  FileJson, Film, Gauge, History, KeyRound, LayoutDashboard, Loader2,
  MonitorPlay, MoreHorizontal, PanelLeft, Play, Plus, RefreshCw, Rocket,
  ScrollText, Settings2, Sparkles, UploadCloud, WifiOff, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { API_BASE, api, friendlyApiError, getApiBase } from "@/lib/api";

type BackendStatus = "queued" | "running" | "processing" | "passed" | "completed" | "failed";
type JobStatus = "queued" | "running" | "passed" | "failed";
type Stage = "script generation" | "TTS" | "scene assembly" | "encoding" | "validation";
type Job = { id: string; status: JobStatus; backendStatus?: BackendStatus; topic?: string; preset?: string; platform?: string; created_at?: string; createdAt?: string; progress?: number; stage?: Stage; elapsed?: number; error?: string; outputs?: string[]; validation?: Record<string, unknown>; };

const OUTPUTS = ["final_13min_spoken.mp4", "pexels_ids.json", "diversity_check.json", "scene_manifest_linear_fixed.json"];
const STAGES: Stage[] = ["script generation", "TTS", "scene assembly", "encoding", "validation"];
const presets = ["viral", "cinematic", "clean", "podcast"];
const platforms = ["tiktok", "youtube", "instagram", "generic"];

function normalizeStatus(status?: BackendStatus): JobStatus {
  if (status === "processing") return "running";
  if (status === "completed") return "passed";
  return status === "running" || status === "passed" || status === "failed" ? status : "queued";
}
function statusTone(status: JobStatus) {
  return { queued: "status-queued", running: "status-running", passed: "status-passed", failed: "status-failed" }[status];
}
function formatDate(value?: string) { return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Just now"; }
function normalizeJob(raw: any): Job { return { ...raw, id: String(raw.id || raw.job_id || raw.jobId), backendStatus: raw.status, status: normalizeStatus(raw.status), progress: raw.progress ?? raw.percent ?? 0 }; }
function friendlyError(error: unknown) { return friendlyApiError(error); }


export default function Home() {
  const [view, setView] = useState<"overview" | "new" | "history" | "settings">("overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<Job | null>(null);
  const [topic, setTopic] = useState("");
  const [preset, setPreset] = useState("viral");
  const [platform, setPlatform] = useState("youtube");
  const [duration, setDuration] = useState("13");
  const [voiceModel, setVoiceModel] = useState("eleven_multilingual_v2");
  const [footageSource, setFootageSource] = useState("Pexels library");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [settingsOverride, setSettingsOverride] = useState("{}");
  const [voice, setVoice] = useState(() => localStorage.getItem("vf.voice") || "Bella");
  const [model, setModel] = useState(() => localStorage.getItem("vf.model") || "eleven_multilingual_v2");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("vf.apiKey") || "");
  const [apiBase, setApiBase] = useState(() => getApiBase());
  const [now, setNow] = useState(() => Date.now());
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSources = useRef<Record<string, EventSource>>({});

  const loadJobs = useCallback(async () => {
    try { const data = await api("/api/v1/jobs?limit=50&offset=0"); setJobs((Array.isArray(data) ? data : data.jobs || []).map(normalizeJob)); setError(""); }
    catch (e) { setError(friendlyError(e)); }
  }, []);

  useEffect(() => { loadJobs(); const id = window.setInterval(loadJobs, 3000); return () => window.clearInterval(id); }, [loadJobs]);
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { if (!selected || !["queued", "running"].includes(selected.status)) return; const loadLogs = async () => { try { const data = await api(`/api/v1/jobs/${selected.id}/logs`); const next = Array.isArray(data) ? data : data.logs || []; setLogs(current => next.length >= current.length ? next : [...current, ...next.filter((line: string) => !current.includes(line))]); } catch (e) { setError(friendlyError(e)); } }; loadLogs(); const id = window.setInterval(loadLogs, 3000); return () => window.clearInterval(id); }, [selected?.id, selected?.status]);
  useEffect(() => () => Object.values(eventSources.current).forEach(source => source.close()), []);

  useEffect(() => {
    jobs.filter(job => ["queued", "running"].includes(job.status)).forEach(job => {
      if (eventSources.current[job.id]) return;
      try {
        const source = new EventSource(`${API_BASE}/api/v1/jobs/${job.id}/stream`);
        source.onmessage = event => { try { const payload = normalizeJob(JSON.parse(event.data)); setJobs(current => current.map(item => item.id === job.id ? { ...item, ...payload } : item)); } catch { setLogs(current => [...current.slice(-80), event.data]); } };
        source.onerror = () => { source.close(); delete eventSources.current[job.id]; };
        eventSources.current[job.id] = source;
      } catch { /* polling remains active */ }
    });
  }, [jobs]);

  const activeJobs = jobs.filter(job => ["queued", "running"].includes(job.status));
  const passedJobs = jobs.filter(job => job.status === "passed");
  const selectedProgress = selected?.progress ?? (selected?.status === "passed" ? 100 : 0);
  const elapsedFor = (job: Job) => { const start = job.created_at || job.createdAt; return start && ["queued", "running"].includes(job.status) ? Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000)) : job.elapsed ?? 0; };

  async function startJob(file?: File) {
    setLoading(true); setError("");
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      form.append("preset", preset); form.append("platform", platform);
      let override: Record<string, unknown> = {};
      try { override = settingsOverride.trim() ? JSON.parse(settingsOverride) : {}; } catch { throw new Error("Settings override must be valid JSON."); }
      form.append("settings_override", JSON.stringify({ ...override, duration: Number(duration), voice_model: voiceModel, footage_source: footageSource }));
      const created = await api("/api/v1/jobs", { method: "POST", body: form });
      const job = normalizeJob(created.job || created); setJobs(current => [job, ...current.filter(item => item.id !== job.id)]); setSelected(job); setView("overview");
    } catch (e) { setError(friendlyError(e)); }
    finally { setLoading(false); }
  }
  async function selectJob(job: Job) {
    setSelected(job); setLogs([]);
    try { const detail = await api(`/api/v1/jobs/${job.id}`); setSelected({ ...job, ...normalizeJob(detail) }); const logData = await api(`/api/v1/jobs/${job.id}/logs`); setLogs(Array.isArray(logData) ? logData : logData.logs || []); }
    catch (e) { setError(friendlyError(e)); }
  }
  function saveSettings() { localStorage.setItem("vf.voice", voice); localStorage.setItem("vf.model", model); localStorage.setItem("vf.apiKey", apiKey); setError(""); }
  const currentStage = selected?.stage || (selected?.status === "passed" ? "validation" : "script generation");

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={17} /></div><div><div className="brand-name">VideoForge</div><div className="brand-sub">AI production studio</div></div></div>
      <div className="workspace-pill"><span className="avatar">OF</span><span>OptiVid workspace</span><MoreHorizontal size={16} className="muted" /></div>
      <nav className="nav-list">
        {([ { key: "overview", Icon: LayoutDashboard, label: "Overview" }, { key: "new", Icon: Plus, label: "New job" }, { key: "history", Icon: History, label: "Job history" }, { key: "settings", Icon: Settings2, label: "Settings" } ] as const).map(({ key, Icon, label }) => <button key={key} className={cn("nav-item", view === key && "active")} onClick={() => setView(key)}><Icon size={17} />{label}<ChevronRight size={14} className="nav-chevron" /></button>)}
      </nav>
      <div className="sidebar-bottom"><div className="system-card"><div className="system-dot" /><div><strong>API connection</strong><span>{API_BASE.replace("http://", "")}</span></div><WifiOff size={15} className="muted" /></div><div className="user-chip"><div className="avatar avatar-small">OF</div><div><strong>OptiVid creator</strong><span>Local workspace</span></div><MoreHorizontal size={15} className="muted" /></div></div>
    </aside>
    <main className="main-content">
      <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><Sparkles size={15} /></div>VideoForge</div><div className="crumb"><span>Studio</span><ChevronRight size={14} /><strong>{view === "overview" ? "Overview" : view === "new" ? "New job" : view === "history" ? "Job history" : "Settings"}</strong></div><div className="top-actions"><div className="api-status"><span className="status-pulse" /> API connected</div><button className="icon-button"><PanelLeft size={18} /></button></div></header>
      {error && <div className="error-banner"><CircleAlert size={17} /><span>{error}</span><button onClick={() => setError("")}><X size={15} /></button></div>}
      {view === "overview" && <>
        <section className="hero-row"><div><div className="eyebrow">OptiVid / VideoForge - Proven 13min Pipeline</div><h1>Build videos that<br /><em>move people.</em></h1><p className="hero-copy">Turn a single idea into a complete, platform-ready video with intelligent scripting, voice, scenes, and validation.</p></div><button className="primary-button hero-cta" onClick={() => setView("new")}><Rocket size={18} /> Start a new job <ArrowUpRight size={17} /></button></section>
        <section className="metric-grid"><Metric icon={<Activity />} label="Active jobs" value={String(activeJobs.length).padStart(2, "0")} tone="violet" /><Metric icon={<Check />} label="Passed outputs" value={String(passedJobs.length).padStart(2, "0")} tone="mint" /><Metric icon={<Gauge />} label="Avg. completion" value="—" tone="amber" /><Metric icon={<Clock3 />} label="Last run" value={jobs[0] ? formatDate(jobs[0].created_at || jobs[0].createdAt).split(",")[0] : "—"} tone="blue" /></section>
        <section className="content-grid"><div className="panel-card jobs-panel"><div className="panel-heading"><div><div className="eyebrow">LIVE PIPELINE</div><h2>Recent jobs</h2></div><button className="text-button" onClick={() => setView("history")}>View all <ArrowUpRight size={14} /></button></div>{jobs.length === 0 ? <EmptyState onClick={() => setView("new")} /> : <div className="job-list">{jobs.slice(0, 5).map(job => <JobRow key={job.id} job={job} elapsed={elapsedFor(job)} onClick={() => selectJob(job)} />)}</div>}</div><div className="panel-card signal-panel"><div className="panel-heading"><div><div className="eyebrow">WORKSPACE SIGNAL</div><h2>Studio health</h2></div><Activity size={17} className="accent-icon" /></div><div className="signal-orb"><div className="orb-core" /><div className="orb-ring orb-ring-one" /><div className="orb-ring orb-ring-two" /></div><div className="signal-caption"><strong>Ready to create</strong><span>All systems are standing by for your next idea.</span></div><div className="signal-bars"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div></div></section>
      </>}
      {view === "new" && <NewJob topic={topic} setTopic={setTopic} preset={preset} setPreset={setPreset} platform={platform} setPlatform={setPlatform} duration={duration} setDuration={setDuration} voiceModel={voiceModel} setVoiceModel={setVoiceModel} footageSource={footageSource} setFootageSource={setFootageSource} settingsOverride={settingsOverride} setSettingsOverride={setSettingsOverride} selectedFile={selectedFile} onFile={file => { if (file.size > 500 * 1024 * 1024) { setError("This source file is larger than the 500 MB limit."); return; } if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) { setError("Choose a video or audio source file."); return; } setSelectedFile(file); setError(""); }} onStart={() => startJob(selectedFile || undefined)} loading={loading} inputRef={inputRef} />}
      {view === "history" && <section className="page-section"><div className="page-heading"><div><div className="eyebrow">ARCHIVE / ALL RUNS</div><h1>Job history</h1><p>Every generation, tracked from first prompt to final validation.</p></div><button className="primary-button" onClick={() => setView("new")}><Plus size={17} /> New job</button></div><div className="panel-card history-card">{jobs.length ? jobs.map(job => <JobRow key={job.id} job={job} elapsed={elapsedFor(job)} onClick={() => selectJob(job)} />) : <EmptyState onClick={() => setView("new")} />}</div></section>}
      {view === "settings" && <SettingsView apiBase={apiBase} setApiBase={setApiBase} voice={voice} setVoice={setVoice} model={model} setModel={setModel} apiKey={apiKey} setApiKey={setApiKey} save={() => { localStorage.setItem("vf.apiBase", apiBase.replace(/\/$/, "")); saveSettings(); window.location.reload(); }} />}
    </main>
    {selected && <JobDrawer job={selected} progress={selectedProgress} stage={currentStage} logs={logs} onClose={() => setSelected(null)} onRefresh={() => selectJob(selected)} />}
  </div>;
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) { return <div className="metric-card"><div className={cn("metric-icon", tone)}>{icon}</div><div><span>{label}</span><strong>{value}</strong></div><ArrowUpRight size={15} className="metric-arrow" /></div>; }
function EmptyState({ onClick }: { onClick: () => void }) { return <div className="empty-state"><div className="empty-icon"><Film size={22} /></div><strong>No jobs yet</strong><span>Your next production starts with one good idea.</span><button className="text-button" onClick={onClick}>Create your first job <ArrowUpRight size={14} /></button></div>; }
function JobRow({ job, elapsed, onClick }: { job: Job; elapsed: number; onClick: () => void }) { return <button className="job-row" onClick={onClick}><div className="job-thumb"><Film size={17} /></div><div className="job-main"><strong>{job.topic || `Video job ${job.id.slice(0, 8)}`}</strong><span>{formatDate(job.created_at || job.createdAt)} · {job.id}</span></div><Badge className={cn("status-badge", statusTone(job.status))}>{job.status}</Badge>{["queued", "running"].includes(job.status) && <span className="elapsed-chip"><Clock3 size={12} /> {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>}<div className="job-progress"><span>{job.progress ?? (job.status === "passed" ? 100 : 0)}%</span><Progress value={job.progress ?? (job.status === "passed" ? 100 : 0)} /></div><ChevronRight size={17} className="muted" /></button>; }
function NewJob({ topic, setTopic, preset, setPreset, platform, setPlatform, duration, setDuration, voiceModel, setVoiceModel, footageSource, setFootageSource, settingsOverride, setSettingsOverride, selectedFile, onStart, loading, onFile, inputRef }: { topic: string; setTopic: (value: string) => void; preset: string; setPreset: (value: string) => void; platform: string; setPlatform: (value: string) => void; duration: string; setDuration: (value: string) => void; voiceModel: string; setVoiceModel: (value: string) => void; footageSource: string; setFootageSource: (value: string) => void; settingsOverride: string; setSettingsOverride: (value: string) => void; selectedFile: File | null; onStart: () => void; loading: boolean; onFile: (file: File) => void; inputRef: React.RefObject<HTMLInputElement | null> }) { const [dragging, setDragging] = useState(false); return <section className="page-section new-job-page"><div className="page-heading"><div><div className="eyebrow">NEW PRODUCTION / STEP 01</div><h1>Give it a direction.</h1><p>Set the creative brief and let VideoForge handle the heavy lifting.</p></div><div className="step-indicator"><span className="step-active">01</span><span>02</span><span>03</span></div></div><div className="new-job-grid"><div className="panel-card form-card"><label>Creative topic <span>Required</span></label><Textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. The hidden psychology behind great product launches" className="topic-area" /><div className="field-hint">{topic.length}/500 characters</div><div className="form-row"><div><label>Preset</label><select value={preset} onChange={e => setPreset(e.target.value)}>{presets.map((item: string) => <option key={item}>{item}</option>)}</select></div><div><label>Platform</label><select value={platform} onChange={e => setPlatform(e.target.value)}>{platforms.map((item: string) => <option key={item}>{item}</option>)}</select></div></div><div className="form-row"><div><label>Duration</label><select value={duration} onChange={e => setDuration(e.target.value)}><option value="1">1 minute</option><option value="3">3 minutes</option><option value="5">5 minutes</option><option value="13">13 minutes</option></select></div><div><label>Voice model</label><select value={voiceModel} onChange={e => setVoiceModel(e.target.value)}><option>eleven_multilingual_v2</option><option>eleven_turbo_v2_5</option><option>eleven_flash_v2_5</option></select></div></div><label>Footage source</label><select value={footageSource} onChange={e => setFootageSource(e.target.value)}><option>Pexels library</option><option>Uploaded source</option></select><label>Settings override <span>Optional JSON</span></label><Textarea value={settingsOverride} onChange={e => setSettingsOverride(e.target.value)} className="settings-area" placeholder='{"duration": 13, "voice": "Bella"}' /><div className="form-footer"><span className="secure-note"><KeyRound size={14} /> Settings stay in your browser</span><button className="primary-button" disabled={loading || !topic.trim() || !selectedFile} onClick={() => onStart()}>{loading ? <Loader2 className="spin" size={17} /> : <Rocket size={17} />} {loading ? "Starting…" : "Start generation"}</button></div></div><div className="panel-card upload-card" onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); onFile(e.dataTransfer.files[0]); }}><div className={cn("dropzone", dragging && "dragging")} onClick={() => inputRef.current?.click()}><input ref={inputRef} type="file" hidden accept="video/*,audio/*" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} /><div className="upload-icon"><UploadCloud size={22} /></div><strong>Drop a source file here</strong><span>or browse from your computer</span><small>MP4, MOV, MP3 · up to 500 MB</small></div>{selectedFile && <div className="selected-file"><Film size={14} /><span>{selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(1)} MB</span><Check size={14} /></div>}<div className="source-note"><div className="source-mark">P</div><div><strong>Pexels footage library</strong><span>Smart stock footage is available during scene assembly.</span></div><Check size={16} className="check-icon" /></div></div></div></section>; }
function JobDrawer({ job, progress, stage, logs, onClose, onRefresh }: { job: Job; progress: number; stage: Stage; logs: string[]; onClose: () => void; onRefresh: () => void }) { return <div className="drawer-backdrop" onClick={onClose}><aside className="job-drawer" onClick={e => e.stopPropagation()}><div className="drawer-head"><div><div className="eyebrow">JOB DETAIL</div><h2>{job.topic || `Video job ${job.id.slice(0, 8)}`}</h2><span className="drawer-id">{job.id}</span></div><button className="icon-button" onClick={onClose}><X size={18} /></button></div><div className="drawer-status"><Badge className={cn("status-badge", statusTone(job.status))}>{job.status}</Badge><span className="drawer-elapsed"><Clock3 size={13} /> {job.created_at || job.createdAt ? formatDate(job.created_at || job.createdAt) : "Elapsed time unavailable"}</span><button className="text-button" onClick={onRefresh}><RefreshCw size={14} /> Refresh</button></div><div className="drawer-progress"><div className="progress-meta"><span>Pipeline progress</span><strong>{progress}%</strong></div><Progress value={progress} /><span className="stage-label">Current stage · <b>{stage}</b></span></div><div className="pipeline-steps">{STAGES.map((item, index) => <div className={cn("pipeline-step", STAGES.indexOf(stage) >= index && "complete", item === stage && "current")} key={item}><span>{STAGES.indexOf(stage) > index ? <Check size={12} /> : index + 1}</span><label>{item}</label></div>)}</div><div className="drawer-section"><div className="section-label"><ScrollText size={14} /> Live logs</div><div className="log-box">{logs.length ? logs.map((line, index) => <div key={index}><span>{String(index + 1).padStart(2, "0")}</span>{line}</div>) : <div className="log-empty">Waiting for pipeline events…</div>}</div></div>{job.status === "passed" && <OutputBrowser job={job} />}</aside></div>; }
function OutputBrowser({ job }: { job: Job }) { const formats: Record<string, string> = { "final_13min_spoken.mp4": "mp4", "pexels_ids.json": "pexels_ids", "diversity_check.json": "diversity_check", "scene_manifest_linear_fixed.json": "scene_manifest_linear_fixed" }; return <div className="drawer-section"><div className="section-label"><Download size={14} /> Output files</div><div className="output-list">{OUTPUTS.map(name => <a className="output-row" href={`${API_BASE}/api/v1/jobs/${job.id}/download/${formats[name]}`} target="_blank" rel="noreferrer" key={name}><div className="file-icon">{name.endsWith(".mp4") ? <Film size={15} /> : <FileJson size={15} />}</div><span>{name}</span><Download size={14} /></a>)}</div><div className="preview-wrap"><div className="section-label"><MonitorPlay size={14} /> Preview</div><video controls preload="metadata" src={`${API_BASE}/api/v1/jobs/${job.id}/download/mp4`} /></div></div>; }
function SettingsView({ apiBase, setApiBase, voice, setVoice, model, setModel, apiKey, setApiKey, save }: any) { return <section className="page-section"><div className="page-heading"><div><div className="eyebrow">WORKSPACE / PREFERENCES</div><h1>Settings</h1><p>Keep your production defaults close and your credentials private.</p></div><button className="primary-button" onClick={save}><Check size={17} /> Save changes</button></div><div className="settings-grid"><div className="panel-card form-card"><div className="settings-title"><div className="settings-symbol"><KeyRound size={18} /></div><div><h2>Voice generation</h2><p>Defaults are saved locally in this browser.</p></div></div><label>API base URL</label><Input value={apiBase} onChange={e => setApiBase(e.target.value)} placeholder="http://91.99.162.143:8000" /><div className="field-hint">Direct browser endpoint; no proxy or backend changes.</div><label>ElevenLabs API key</label><Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk_…" /><div className="field-hint">Used only by your configured generation workflow.</div><label>Default voice</label><Input value={voice} onChange={e => setVoice(e.target.value)} placeholder="Bella" /><label>Default model</label><select value={model} onChange={e => setModel(e.target.value)}><option>eleven_multilingual_v2</option><option>eleven_turbo_v2_5</option><option>eleven_flash_v2_5</option></select></div><div className="panel-card privacy-card"><div className="privacy-orb"><KeyRound size={25} /></div><h2>Designed for control.</h2><p>This interface calls the FastAPI backend directly. It does not proxy, modify, or deploy backend requests.</p><div className="privacy-line"><Check size={15} /> Direct API requests</div><div className="privacy-line"><Check size={15} /> Local browser preferences</div><div className="privacy-line"><Check size={15} /> Visible CORS errors</div></div></div></section>; }
