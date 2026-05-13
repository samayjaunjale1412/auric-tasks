import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Work", "Study", "Health", "Finance", "Personal"];
const PRIORITIES = ["High", "Medium", "Low"];
const MOODS = ["Easy", "Important", "Stressful", "Boring"];
const MOTIVATIONAL_QUOTES = [
  "The secret of getting ahead is getting started.",
  "Small progress is still progress.",
  "You planned this task for a reason.",
  "Starting now can reduce stress later.",
  "Focus on progress, not perfection.",
  "Your future self will thank you.",
  "Discipline is choosing between what you want now and what you want most.",
];

// ─── STORAGE (localStorage-based, IndexedDB-style API) ───────────────────────
const DB = {
  get: (key) => { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

function loadTasks() { return DB.get("auric_tasks") || []; }
function saveTasks(tasks) { DB.set("auric_tasks", tasks); }
function loadSettings() { return DB.get("auric_settings") || { pomodoroWork: 25, pomodoroBreak: 5, productivityGoal: 5, theme: "dark" }; }
function saveSettings(s) { DB.set("auric_settings", s); }

// ─── UTILITIES ────────────────────────────────────────────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function today() { return new Date().toISOString().slice(0, 10); }
function fmt(d) { if (!d) return "—"; const dt = new Date(d + "T00:00"); return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function isOverdue(task) { if (!task.dueDate || task.completed) return false; return task.dueDate < today(); }
function isDueToday(task) { return task.dueDate === today() && !task.completed; }
function weekDays() {
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(now.getDate() - now.getDay() + i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=Playfair+Display:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0d0f;
    --bg2: #13131a;
    --bg3: #1a1a24;
    --bg4: #22222e;
    --gold: #c9a84c;
    --gold2: #e8c96a;
    --gold3: #f5e6b0;
    --goldDim: rgba(201,168,76,0.15);
    --goldGlow: rgba(201,168,76,0.08);
    --text: #f0ead8;
    --textMuted: #8a8278;
    --textDim: #5a5550;
    --border: rgba(201,168,76,0.12);
    --borderHover: rgba(201,168,76,0.28);
    --high: #e85a4f;
    --highDim: rgba(232,90,79,0.15);
    --med: #c9a84c;
    --medDim: rgba(201,168,76,0.15);
    --low: #6b7b8a;
    --lowDim: rgba(107,123,138,0.15);
    --green: #4caf7d;
    --greenDim: rgba(76,175,125,0.15);
    --radius: 12px;
    --radiusSm: 8px;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
    --shadowGold: 0 0 20px rgba(201,168,76,0.12);
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 14px; line-height: 1.6; overflow-x: hidden; }

  .auric-app { display: flex; min-height: 100vh; }

  /* Sidebar */
  .sidebar { width: 220px; min-height: 100vh; background: var(--bg2); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 24px 0; position: fixed; top: 0; left: 0; z-index: 100; }
  .sidebar-logo { padding: 0 20px 28px; display: flex; align-items: center; gap: 10px; }
  .sidebar-logo .logo-icon { width: 32px; height: 32px; background: var(--gold); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; color: #000; font-weight: 700; }
  .sidebar-logo .logo-text { font-family: 'Playfair Display', serif; font-size: 16px; color: var(--gold2); letter-spacing: 0.02em; }
  .sidebar-logo .logo-sub { font-size: 10px; color: var(--textMuted); letter-spacing: 0.1em; text-transform: uppercase; }
  .nav-section { padding: 0 12px; flex: 1; }
  .nav-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--textDim); padding: 0 8px 8px; margin-top: 16px; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: var(--radiusSm); cursor: pointer; color: var(--textMuted); font-size: 13px; transition: all 0.2s; margin-bottom: 2px; border: 1px solid transparent; }
  .nav-item:hover { background: var(--goldGlow); color: var(--text); border-color: var(--border); }
  .nav-item.active { background: var(--goldDim); color: var(--gold2); border-color: var(--borderHover); }
  .nav-item .badge { margin-left: auto; background: var(--high); color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 10px; font-weight: 600; }

  /* Main */
  .main { margin-left: 220px; flex: 1; min-height: 100vh; }
  .topbar { height: 64px; background: rgba(13,13,15,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 32px; gap: 16px; position: sticky; top: 0; z-index: 50; }
  .topbar-title { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--gold2); flex: 1; }
  .topbar-date { font-size: 12px; color: var(--textMuted); }
  .page { padding: 32px; }

  /* Cards */
  .glass-card { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: border-color 0.2s, box-shadow 0.2s; }
  .glass-card:hover { border-color: var(--borderHover); box-shadow: var(--shadowGold); }
  .glass-card.gold-glow { border-color: rgba(201,168,76,0.3); box-shadow: 0 0 30px rgba(201,168,76,0.08); }

  /* Stats grid */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; }
  .stat-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--textMuted); margin-bottom: 8px; }
  .stat-value { font-size: 28px; font-weight: 600; color: var(--gold2); line-height: 1; }
  .stat-sub { font-size: 11px; color: var(--textMuted); margin-top: 4px; }

  /* Task list */
  .task-list { display: flex; flex-direction: column; gap: 8px; }
  .task-item { display: flex; align-items: center; gap: 12px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radiusSm); padding: 12px 16px; cursor: pointer; transition: all 0.18s; position: relative; overflow: hidden; }
  .task-item::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; }
  .task-item.high::before { background: var(--high); }
  .task-item.medium::before { background: var(--gold); }
  .task-item.low::before { background: var(--low); }
  .task-item:hover { border-color: var(--borderHover); background: var(--bg4); transform: translateX(2px); }
  .task-item.completed { opacity: 0.5; }
  .task-item.overdue { border-color: rgba(232,90,79,0.3); }
  .task-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; cursor: pointer; }
  .task-check:hover { border-color: var(--gold); }
  .task-check.done { background: var(--green); border-color: var(--green); }
  .task-title { font-size: 13px; font-weight: 500; flex: 1; color: var(--text); }
  .task-title.done { text-decoration: line-through; color: var(--textMuted); }
  .task-meta { display: flex; align-items: center; gap: 8px; }
  .tag { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 500; letter-spacing: 0.03em; }
  .tag.high { background: var(--highDim); color: var(--high); }
  .tag.medium { background: var(--medDim); color: var(--gold2); }
  .tag.low { background: var(--lowDim); color: var(--low); }
  .tag.cat { background: var(--goldGlow); color: var(--textMuted); border: 1px solid var(--border); }
  .tag.overdue { background: var(--highDim); color: var(--high); }
  .tag.today { background: var(--greenDim); color: var(--green); }

  /* Buttons */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: var(--radiusSm); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid; transition: all 0.18s; font-family: inherit; }
  .btn-gold { background: var(--gold); border-color: var(--gold); color: #000; font-weight: 600; }
  .btn-gold:hover { background: var(--gold2); border-color: var(--gold2); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(201,168,76,0.3); }
  .btn-ghost { background: transparent; border-color: var(--border); color: var(--textMuted); }
  .btn-ghost:hover { border-color: var(--borderHover); color: var(--text); background: var(--goldGlow); }
  .btn-danger { background: var(--highDim); border-color: var(--high); color: var(--high); }
  .btn-danger:hover { background: var(--high); color: #fff; }
  .btn-sm { padding: 5px 10px; font-size: 11px; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .modal { background: var(--bg2); border: 1px solid var(--borderHover); border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 64px rgba(0,0,0,0.6); }
  .modal-header { padding: 24px 28px 0; display: flex; align-items: center; justify-content: space-between; }
  .modal-title { font-family: 'Playfair Display', serif; font-size: 20px; color: var(--gold2); }
  .modal-body { padding: 20px 28px 28px; }
  .form-group { margin-bottom: 16px; }
  .form-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--textMuted); margin-bottom: 6px; display: block; }
  .form-input { width: 100%; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radiusSm); padding: 9px 12px; color: var(--text); font-size: 13px; font-family: inherit; transition: border-color 0.2s; }
  .form-input:focus { outline: none; border-color: var(--gold); box-shadow: 0 0 0 2px var(--goldDim); }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-select { appearance: none; }
  textarea.form-input { resize: vertical; min-height: 80px; }

  /* Section headers */
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-title { font-family: 'Playfair Display', serif; font-size: 16px; color: var(--gold2); }
  .section-sub { font-size: 12px; color: var(--textMuted); }

  /* Progress bar */
  .progress-bar { height: 4px; background: var(--bg4); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold2)); border-radius: 2px; transition: width 0.6s ease; }

  /* Focus mode */
  .focus-mode { position: fixed; inset: 0; background: var(--bg); z-index: 300; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .focus-ring-outer { width: 240px; height: 240px; position: relative; display: flex; align-items: center; justify-content: center; margin-bottom: 40px; }
  .focus-ring-svg { position: absolute; inset: 0; transform: rotate(-90deg); }
  .focus-timer { font-size: 52px; font-weight: 300; color: var(--gold2); letter-spacing: -0.02em; font-family: 'Playfair Display', serif; }
  .focus-label { font-size: 12px; color: var(--textMuted); text-align: center; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 4px; }

  /* Chart */
  .mini-chart { display: flex; align-items: flex-end; gap: 6px; height: 60px; }
  .chart-bar { flex: 1; background: var(--goldDim); border-radius: 3px 3px 0 0; transition: all 0.4s; border-bottom: none; }
  .chart-bar.today { background: var(--gold); }
  .chart-day { font-size: 10px; color: var(--textDim); text-align: center; }

  /* Calendar */
  .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .cal-day-header { font-size: 10px; color: var(--textDim); text-align: center; padding: 4px; letter-spacing: 0.06em; }
  .cal-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 4px; border-radius: 6px; cursor: pointer; border: 1px solid transparent; position: relative; font-size: 12px; color: var(--textMuted); transition: all 0.15s; }
  .cal-day:hover { background: var(--goldGlow); border-color: var(--border); color: var(--text); }
  .cal-day.today { background: var(--goldDim); border-color: var(--gold); color: var(--gold2); font-weight: 600; }
  .cal-day.other-month { opacity: 0.3; }
  .cal-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--gold); margin-top: 2px; }
  .cal-dot.high { background: var(--high); }

  /* Notification */
  .notif { position: fixed; bottom: 24px; right: 24px; z-index: 500; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
  .notif-item { background: var(--bg2); border: 1px solid var(--borderHover); border-radius: var(--radius); padding: 14px 18px; box-shadow: var(--shadow); pointer-events: all; max-width: 320px; display: flex; gap: 12px; align-items: flex-start; }
  .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); flex-shrink: 0; margin-top: 4px; }
  .notif-text { font-size: 12px; color: var(--text); }
  .notif-sub { font-size: 11px; color: var(--textMuted); margin-top: 2px; }

  /* Empty state */
  .empty-state { text-align: center; padding: 60px 20px; }
  .empty-icon { font-size: 48px; color: var(--textDim); margin-bottom: 16px; }
  .empty-title { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--textMuted); margin-bottom: 8px; }
  .empty-sub { font-size: 12px; color: var(--textDim); }

  /* Search */
  .search-bar { display: flex; align-items: center; gap: 8px; background: var(--bg3); border: 1px solid var(--border); border-radius: var(--radiusSm); padding: 8px 12px; flex: 1; max-width: 280px; }
  .search-bar input { background: transparent; border: none; color: var(--text); font-size: 13px; font-family: inherit; flex: 1; outline: none; }
  .search-bar input::placeholder { color: var(--textDim); }

  /* Filters */
  .filter-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .filter-btn { padding: 5px 12px; border-radius: 20px; border: 1px solid var(--border); background: transparent; color: var(--textMuted); font-size: 12px; cursor: pointer; transition: all 0.15s; font-family: inherit; }
  .filter-btn:hover { border-color: var(--gold); color: var(--gold2); }
  .filter-btn.active { background: var(--goldDim); border-color: var(--gold); color: var(--gold2); }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bg4); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--textDim); }

  /* Animations */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes shimmer { 0% { opacity: 0.4; } 50% { opacity: 0.8; } 100% { opacity: 0.4; } }
  @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.3); } 50% { box-shadow: 0 0 0 8px rgba(201,168,76,0); } }

  .fade-up { animation: fadeUp 0.3s ease both; }
  .fade-in { animation: fadeIn 0.3s ease both; }

  /* Mobile */
  @media (max-width: 768px) {
    .sidebar { width: 100%; min-height: auto; position: fixed; bottom: 0; top: auto; left: 0; right: 0; flex-direction: row; padding: 8px 12px; border-top: 1px solid var(--border); border-right: none; z-index: 100; }
    .sidebar-logo { display: none; }
    .nav-section { display: flex; flex-direction: row; padding: 0; gap: 0; flex: 1; }
    .nav-label { display: none; }
    .nav-item { flex-direction: column; gap: 3px; padding: 6px 4px; font-size: 9px; flex: 1; justify-content: center; border-radius: 8px; margin: 0; }
    .main { margin-left: 0; margin-bottom: 70px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .form-row { grid-template-columns: 1fr; }
    .topbar { padding: 0 16px; }
    .page { padding: 20px 16px; }
  }

  /* Voice indicator */
  @keyframes voicePulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; } }
  .voice-active { animation: voicePulse 0.8s ease-in-out infinite; }

  /* Streak */
  .streak-badge { display: inline-flex; align-items: center; gap: 6px; background: var(--goldDim); border: 1px solid var(--gold); border-radius: 20px; padding: 4px 12px; font-size: 12px; color: var(--gold2); font-weight: 500; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  @media (max-width: 900px) { .two-col { grid-template-columns: 1fr; } }

  .overdue-banner { background: rgba(232,90,79,0.08); border: 1px solid rgba(232,90,79,0.2); border-radius: var(--radiusSm); padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
`;

// ─── TASK MODAL ───────────────────────────────────────────────────────────────
function TaskModal({ task, onSave, onClose }) {
  const [form, setForm] = useState(task || {
    title: "", description: "", category: "Work", priority: "Medium",
    dueDate: today(), dueTime: "", mood: "Easy", repeat: "none",
    reminder: "30min", estimatedDuration: ""
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...form, id: form.id || genId(), completed: form.completed || false, createdAt: form.createdAt || Date.now() });
  };

  return (
    <div className="modal-overlay fade-in" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-up">
        <div className="modal-header">
          <div className="modal-title">{task ? "Edit Task" : "New Task"}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input className="form-input" placeholder="What needs to be done?" value={form.title} onChange={e => set("title", e.target.value)} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" placeholder="Add notes or details..." value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-input form-select" value={form.category} onChange={e => set("category", e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-input form-select" value={form.priority} onChange={e => set("priority", e.target.value)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Due Time</label>
              <input className="form-input" type="time" value={form.dueTime} onChange={e => set("dueTime", e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Reminder</label>
              <select className="form-input form-select" value={form.reminder} onChange={e => set("reminder", e.target.value)}>
                <option value="none">No reminder</option>
                <option value="30min">30 minutes before</option>
                <option value="2h">2 hours before</option>
                <option value="1day">1 day before</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Repeat</label>
              <select className="form-input form-select" value={form.repeat} onChange={e => set("repeat", e.target.value)}>
                <option value="none">No repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Mood Tag</label>
              <select className="form-input form-select" value={form.mood} onChange={e => set("mood", e.target.value)}>
                {MOODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Est. Duration (min)</label>
              <input className="form-input" type="number" placeholder="30" value={form.estimatedDuration} onChange={e => set("estimatedDuration", e.target.value)} min="1" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-gold" onClick={handleSave}>
              {task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TASK ITEM ────────────────────────────────────────────────────────────────
function TaskItem({ task, onToggle, onEdit, onDelete, onDuplicate, onFocus }) {
  const [menu, setMenu] = useState(false);
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  return (
    <div className={`task-item ${task.priority.toLowerCase()} ${task.completed ? "completed" : ""} ${overdue ? "overdue" : ""}`} onClick={() => onEdit(task)}>
      <div className={`task-check ${task.completed ? "done" : ""}`} onClick={e => { e.stopPropagation(); onToggle(task.id); }}>
        {task.completed && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={`task-title ${task.completed ? "done" : ""}`}>{task.title}</div>
        {task.description && <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>}
      </div>
      <div className="task-meta">
        {overdue && <span className="tag overdue">Overdue</span>}
        {dueToday && !overdue && <span className="tag today">Today</span>}
        {task.dueDate && !overdue && !dueToday && <span style={{ fontSize: 11, color: "var(--textMuted)" }}>{fmt(task.dueDate)}</span>}
        <span className={`tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
        <span className="tag cat">{task.category}</span>
        <div style={{ position: "relative" }}>
          <button className="btn btn-ghost btn-sm" style={{ padding: "3px 8px", fontSize: 16 }} onClick={e => { e.stopPropagation(); setMenu(m => !m); }}>⋮</button>
          {menu && (
            <div style={{ position: "absolute", right: 0, top: "100%", background: "var(--bg2)", border: "1px solid var(--borderHover)", borderRadius: "var(--radiusSm)", padding: "4px", zIndex: 10, minWidth: 140, boxShadow: "var(--shadow)" }} onClick={e => e.stopPropagation()}>
              {[
                ["Focus", () => { onFocus(task); setMenu(false); }],
                ["Edit", () => { onEdit(task); setMenu(false); }],
                ["Duplicate", () => { onDuplicate(task); setMenu(false); }],
                ["Delete", () => { onDelete(task.id); setMenu(false); }],
              ].map(([label, action]) => (
                <div key={label} style={{ padding: "7px 10px", cursor: "pointer", borderRadius: "var(--radiusSm)", fontSize: 12, color: label === "Delete" ? "var(--high)" : "var(--text)" }}
                  onMouseEnter={e => e.target.style.background = "var(--bg4)"}
                  onMouseLeave={e => e.target.style.background = ""}
                  onClick={action}>{label}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FOCUS MODE ───────────────────────────────────────────────────────────────
function FocusMode({ task, settings, onClose }) {
  const [seconds, setSeconds] = useState(settings.pomodoroWork * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("work");
  const totalSeconds = phase === "work" ? settings.pomodoroWork * 60 : settings.pomodoroBreak * 60;
  const progress = 1 - seconds / totalSeconds;
  const circumference = 2 * Math.PI * 100;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          setRunning(false);
          setPhase(p => p === "work" ? "break" : "work");
          return phase === "work" ? settings.pomodoroBreak * 60 : settings.pomodoroWork * 60;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, phase, settings]);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="focus-mode fade-in">
      <div style={{ position: "absolute", top: 24, right: 24 }}>
        <button className="btn btn-ghost" onClick={onClose}>✕ Exit Focus</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--textMuted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8 }}>
        {phase === "work" ? "Deep Work" : "Rest Break"}
      </div>
      {task && <div style={{ fontSize: 18, color: "var(--text)", fontFamily: "'Playfair Display', serif", marginBottom: 40, textAlign: "center", maxWidth: 400 }}>{task.title}</div>}
      <div className="focus-ring-outer">
        <svg className="focus-ring-svg" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r="100" fill="none" stroke="var(--bg3)" strokeWidth="6" />
          <circle cx="120" cy="120" r="100" fill="none" stroke="var(--gold)" strokeWidth="6"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ textAlign: "center" }}>
          <div className="focus-timer">{mins}:{secs}</div>
          <div className="focus-label">{phase === "work" ? "Focus" : "Break"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={() => { setSeconds(totalSeconds); setRunning(false); }}>Reset</button>
        <button className="btn btn-gold" style={{ minWidth: 120 }} onClick={() => setRunning(r => !r)}>
          {running ? "⏸ Pause" : "▶ Start"}
        </button>
        <button className="btn btn-ghost" onClick={() => { setPhase(p => p === "work" ? "break" : "work"); setRunning(false); setSeconds(phase === "work" ? settings.pomodoroBreak * 60 : settings.pomodoroWork * 60); }}>
          Skip
        </button>
      </div>
      <div style={{ marginTop: 32, fontSize: 13, color: "var(--textMuted)", fontStyle: "italic", maxWidth: 300, textAlign: "center" }}>
        {MOTIVATIONAL_QUOTES[Math.floor(Date.now() / 10000) % MOTIVATIONAL_QUOTES.length]}
      </div>
    </div>
  );
}

// ─── CALENDAR VIEW ────────────────────────────────────────────────────────────
function CalendarView({ tasks }) {
  const [current, setCurrent] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const { year, month } = current;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const taskMap = {};
  tasks.forEach(t => { if (t.dueDate) { if (!taskMap[t.dueDate]) taskMap[t.dueDate] = []; taskMap[t.dueDate].push(t); } });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: prevMonthDays - firstDay + i + 1, curr: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ day: i, curr: true });
  while (cells.length < 42) cells.push({ day: cells.length - firstDay - daysInMonth + 1, curr: false });

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const dayHeaders = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "var(--gold2)" }}>{monthNames[month]} {year}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(c => { const d = new Date(c.year, c.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>‹</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(); setCurrent({ year: d.getFullYear(), month: d.getMonth() }); }}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrent(c => { const d = new Date(c.year, c.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}>›</button>
        </div>
      </div>
      <div className="calendar-grid" style={{ marginBottom: 8 }}>
        {dayHeaders.map(h => <div key={h} className="cal-day-header">{h}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((cell, i) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
          const dayTasks = taskMap[dateStr] || [];
          const isToday = dateStr === today() && cell.curr;
          return (
            <div key={i} className={`cal-day ${isToday ? "today" : ""} ${!cell.curr ? "other-month" : ""}`}>
              <span>{cell.day}</span>
              {dayTasks.slice(0, 3).map((t, j) => <div key={j} className={`cal-dot ${t.priority === "High" ? "high" : ""}`} title={t.title} />)}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 24 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>Tasks this Month</div>
        {tasks.filter(t => t.dueDate && t.dueDate.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).length === 0
          ? <div style={{ color: "var(--textDim)", fontSize: 12 }}>No tasks scheduled this month.</div>
          : tasks.filter(t => t.dueDate && t.dueDate.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 10).map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 11, color: "var(--textMuted)", minWidth: 36 }}>{t.dueDate.slice(8)}</span>
              <span style={{ flex: 1, fontSize: 13, color: t.completed ? "var(--textDim)" : "var(--text)", textDecoration: t.completed ? "line-through" : "none" }}>{t.title}</span>
              <span className={`tag ${t.priority.toLowerCase()}`}>{t.priority}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(t => isOverdue(t)).length;
  const rate = total ? Math.round((completed / total) * 100) : 0;

  const byCat = CATEGORIES.map(c => ({ name: c, count: tasks.filter(t => t.category === c).length, done: tasks.filter(t => t.category === c && t.completed).length }));
  const days = weekDays();
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  const weekData = days.map(d => ({
    day: dayNames[new Date(d).getDay()],
    done: tasks.filter(t => t.dueDate === d && t.completed).length,
    total: tasks.filter(t => t.dueDate === d).length,
    isToday: d === today(),
  }));
  const maxVal = Math.max(...weekData.map(d => d.total), 1);

  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[["Total Tasks", total, "All time"], ["Completed", completed, "Tasks done"], ["Completion Rate", rate + "%", "Success rate"], ["Overdue", overdue, "Need attention"]].map(([label, val, sub]) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{val}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="glass-card">
          <div className="section-header"><div className="section-title">Weekly Activity</div></div>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
            {weekData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 2, height: 60, justifyContent: "flex-end" }}>
                  <div style={{ height: `${(d.total / maxVal) * 60}px`, background: d.isToday ? "var(--gold)" : "var(--bg4)", borderRadius: "3px 3px 0 0", minHeight: d.total ? 4 : 0, transition: "height 0.4s" }} />
                </div>
                <div style={{ fontSize: 10, color: d.isToday ? "var(--gold2)" : "var(--textDim)" }}>{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <div className="section-header"><div className="section-title">By Category</div></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {byCat.filter(c => c.count > 0).map(c => (
              <div key={c.name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12 }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: "var(--textMuted)" }}>{c.done}/{c.count}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${c.count ? (c.done / c.count) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
            {byCat.every(c => c.count === 0) && <div style={{ color: "var(--textDim)", fontSize: 12 }}>No tasks yet.</div>}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: 20 }}>
        <div className="section-header"><div className="section-title">Priority Distribution</div></div>
        <div style={{ display: "flex", gap: 16 }}>
          {PRIORITIES.map(p => {
            const count = tasks.filter(t => t.priority === p).length;
            return (
              <div key={p} style={{ flex: 1, textAlign: "center", padding: 16, background: "var(--bg3)", borderRadius: "var(--radiusSm)" }}>
                <div style={{ fontSize: 24, fontWeight: 600, color: p === "High" ? "var(--high)" : p === "Medium" ? "var(--gold2)" : "var(--low)" }}>{count}</div>
                <div style={{ fontSize: 11, color: "var(--textMuted)", marginTop: 4 }}>{p}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
function Settings({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ maxWidth: 480 }}>
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Productivity Goals</div>
        <div className="form-group">
          <label className="form-label">Daily Task Goal</label>
          <input className="form-input" type="number" min="1" max="20" value={form.productivityGoal} onChange={e => set("productivityGoal", Number(e.target.value))} />
        </div>
      </div>
      <div className="glass-card" style={{ marginBottom: 16 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Focus Timer</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Work Duration (min)</label>
            <input className="form-input" type="number" min="1" max="90" value={form.pomodoroWork} onChange={e => set("pomodoroWork", Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Break Duration (min)</label>
            <input className="form-input" type="number" min="1" max="30" value={form.pomodoroBreak} onChange={e => set("pomodoroBreak", Number(e.target.value))} />
          </div>
        </div>
      </div>
      <button className="btn btn-gold" onClick={() => onSave(form)}>Save Settings</button>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ tasks, onEdit, onToggle, onDelete, onDuplicate, onFocus, settings }) {
  const todayTasks = tasks.filter(t => isDueToday(t));
  const overdueTasks = tasks.filter(t => isOverdue(t));
  const upcomingTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate > today()).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  const completedToday = tasks.filter(t => t.completed && t.dueDate === today()).length;
  const streak = DB.get("auric_streak") || 0;
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length];
  const goal = settings.productivityGoal;
  const goalProgress = Math.min(100, Math.round((completedToday / goal) * 100));

  return (
    <div>
      {/* Greeting */}
      <div className="glass-card gold-glow" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--textMuted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "var(--gold2)", marginBottom: 8 }}>Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}</div>
          <div style={{ fontSize: 13, color: "var(--textMuted)", fontStyle: "italic" }}>&ldquo;{quote}&rdquo;</div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div className="streak-badge">🔥 {streak} day streak</div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: "var(--textMuted)", marginBottom: 6 }}>Daily Goal: {completedToday}/{goal}</div>
            <div className="progress-bar" style={{ width: 120 }}>
              <div className="progress-fill" style={{ width: `${goalProgress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          ["Today", todayTasks.length, "tasks due"],
          ["Overdue", overdueTasks.length, "need attention"],
          ["Done Today", completedToday, "completed"],
          ["Upcoming", upcomingTasks.length, "this week"],
        ].map(([label, val, sub]) => (
          <div key={label} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color: label === "Overdue" && val > 0 ? "var(--high)" : "var(--gold2)" }}>{val}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Overdue alert */}
      {overdueTasks.length > 0 && (
        <div className="overdue-banner">
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, color: "var(--high)", fontWeight: 500 }}>You have {overdueTasks.length} overdue task{overdueTasks.length > 1 ? "s" : ""}</div>
            <div style={{ fontSize: 11, color: "var(--textMuted)" }}>Your deadline has passed. Consider rescheduling or completing them now.</div>
          </div>
        </div>
      )}

      <div className="two-col">
        {/* Today's Tasks */}
        <div>
          <div className="section-header">
            <div className="section-title">Today's Tasks</div>
            <span className="section-sub">{todayTasks.length} tasks</span>
          </div>
          {todayTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 20px" }}>
              <div className="empty-icon">✦</div>
              <div className="empty-title">Clear schedule</div>
              <div className="empty-sub">No tasks for today</div>
            </div>
          ) : (
            <div className="task-list">
              {todayTasks.sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)).map(t => (
                <TaskItem key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onFocus={onFocus} />
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div>
          <div className="section-header">
            <div className="section-title">Upcoming</div>
            <span className="section-sub">Next 7 days</span>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "30px 20px" }}>
              <div className="empty-icon">📅</div>
              <div className="empty-title">All clear ahead</div>
              <div className="empty-sub">No upcoming tasks</div>
            </div>
          ) : (
            <div className="task-list">
              {upcomingTasks.map(t => (
                <TaskItem key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onFocus={onFocus} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ALL TASKS ────────────────────────────────────────────────────────────────
function AllTasks({ tasks, onEdit, onToggle, onDelete, onDuplicate, onFocus, onAdd }) {
  const [search, setSearch] = useState("");
  const [filterPrio, setFilterPrio] = useState("All");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("Active");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const filtered = tasks.filter(t => {
    if (filterStatus === "Active" && t.completed) return false;
    if (filterStatus === "Completed" && !t.completed) return false;
    if (filterPrio !== "All" && t.priority !== filterPrio) return false;
    if (filterCat !== "All" && t.category !== filterCat) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const pd = PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority);
    if (pd !== 0) return pd;
    return (a.dueDate || "").localeCompare(b.dueDate || "");
  });

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported in your browser."); return; }
    const r = new SR();
    r.lang = "en-US";
    r.onstart = () => setIsListening(true);
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const dateMatch = text.match(/tomorrow|today|monday|tuesday|wednesday|thursday|friday/i);
      const timeMatch = text.match(/(\d{1,2})\s*(am|pm)/i);
      let dueDate = today();
      if (dateMatch && dateMatch[0].toLowerCase() === "tomorrow") {
        const d = new Date(); d.setDate(d.getDate() + 1);
        dueDate = d.toISOString().slice(0, 10);
      }
      const cleanTitle = text.replace(/remind me|tomorrow|today|at \d+\s*(am|pm)/gi, "").trim();
      onAdd({ title: cleanTitle || text, dueDate, dueTime: timeMatch ? timeMatch[0] : "" });
    };
    r.onend = () => setIsListening(false);
    r.start();
    recognitionRef.current = r;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div className="search-bar">
          <span style={{ color: "var(--textDim)", fontSize: 14 }}>🔍</span>
          <input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className={`btn btn-ghost ${isListening ? "voice-active" : ""}`} onClick={startVoice} title="Voice input" style={{ borderColor: isListening ? "var(--gold)" : undefined }}>
          🎤 {isListening ? "Listening..." : "Voice"}
        </button>
        <button className="btn btn-gold" style={{ marginLeft: "auto" }} onClick={() => onAdd(null)}>+ New Task</button>
      </div>

      <div className="filter-row">
        {["All", "Active", "Completed"].map(s => (
          <button key={s} className={`filter-btn ${filterStatus === s ? "active" : ""}`} onClick={() => setFilterStatus(s)}>{s}</button>
        ))}
        <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
        {["All", ...PRIORITIES].map(p => (
          <button key={p} className={`filter-btn ${filterPrio === p ? "active" : ""}`} onClick={() => setFilterPrio(p)}>{p}</button>
        ))}
        <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
        {["All", ...CATEGORIES].map(c => (
          <button key={c} className={`filter-btn ${filterCat === c ? "active" : ""}`} onClick={() => setFilterCat(c)}>{c}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◇</div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-sub">{search ? "Try a different search term" : "Add your first task to get started"}</div>
        </div>
      ) : (
        <div className="task-list">
          {filtered.map(t => (
            <TaskItem key={t.id} task={t} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onDuplicate={onDuplicate} onFocus={onFocus} />
          ))}
        </div>
      )}
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--textDim)" }}>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function AuricTasks() {
  const [tasks, setTasks] = useState(loadTasks);
  const [settings, setSettings] = useState(loadSettings);
  const [view, setView] = useState("dashboard");
  const [modal, setModal] = useState(null); // null | "new" | task object
  const [focusTask, setFocusTask] = useState(null);
  const [notifs, setNotifs] = useState([]);

  const pushNotif = useCallback((text, sub) => {
    const id = genId();
    setNotifs(n => [...n, { id, text, sub }]);
    setTimeout(() => setNotifs(n => n.filter(x => x.id !== id)), 5000);
  }, []);

  // Reminder checker
  useEffect(() => {
    const check = () => {
      const now = new Date();
      tasks.filter(t => !t.completed && t.dueDate && t.dueTime).forEach(t => {
        const due = new Date(`${t.dueDate}T${t.dueTime}`);
        const diff = (due - now) / 60000;
        if (diff > 0 && diff < 31 && diff > 28) {
          pushNotif(`⏰ "${t.title}"`, "Due in 30 minutes. Your deadline is getting close.");
        }
        if (diff < 0 && diff > -5) {
          pushNotif(`🚨 "${t.title}" is overdue`, "You planned this for a reason. Start now.");
        }
      });
    };
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, [tasks, pushNotif]);

  // Streak update
  useEffect(() => {
    const lastDate = DB.get("auric_last_date");
    const todayStr = today();
    if (lastDate !== todayStr) {
      DB.set("auric_last_date", todayStr);
      const streak = DB.get("auric_streak") || 0;
      DB.set("auric_streak", streak + 1);
    }
  }, []);

  const saveTasks2 = (t) => { setTasks(t); saveTasks(t); };

  const handleSaveTask = (task) => {
    const exists = tasks.find(t => t.id === task.id);
    const updated = exists ? tasks.map(t => t.id === task.id ? task : t) : [task, ...tasks];
    saveTasks2(updated.sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority)));
    setModal(null);
    pushNotif(exists ? "Task updated" : "Task created", `"${task.title}" — ${task.priority} priority`);
  };

  const handleToggle = (id) => {
    const task = tasks.find(t => t.id === id);
    const updated = tasks.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null } : t);
    saveTasks2(updated);
    if (task && !task.completed) pushNotif("Task completed ✓", `"${task.title}"`);
  };

  const handleDelete = (id) => {
    saveTasks2(tasks.filter(t => t.id !== id));
    pushNotif("Task deleted", "Removed from your list");
  };

  const handleDuplicate = (task) => {
    const dup = { ...task, id: genId(), title: task.title + " (copy)", completed: false, createdAt: Date.now() };
    saveTasks2([dup, ...tasks]);
    pushNotif("Task duplicated", `"${dup.title}"`);
  };

  const handleSaveSettings = (s) => {
    setSettings(s);
    saveSettings(s);
    pushNotif("Settings saved", "Your preferences have been updated");
  };

  const overdueCount = tasks.filter(t => isOverdue(t)).length;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "⊞" },
    { id: "tasks", label: "All Tasks", icon: "☰" },
    { id: "calendar", label: "Calendar", icon: "📅" },
    { id: "analytics", label: "Analytics", icon: "◎" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];

  const pageTitle = navItems.find(n => n.id === view)?.label || "Dashboard";

  if (focusTask !== undefined && focusTask !== null || (focusTask === null && view === "focus")) {
    return (
      <>
        <style>{css}</style>
        <FocusMode task={focusTask} settings={settings} onClose={() => setFocusTask(undefined)} />
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="auric-app">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">A</div>
            <div>
              <div className="logo-text">Auric</div>
              <div className="logo-sub">Tasks</div>
            </div>
          </div>
          <div className="nav-section">
            <div className="nav-label">Navigation</div>
            {navItems.map(item => (
              <div key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.id === "tasks" && overdueCount > 0 && <span className="badge">{overdueCount}</span>}
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <div className="nav-label">Quick Focus</div>
              <div className="nav-item" onClick={() => setFocusTask(tasks.find(t => !t.completed && t.priority === "High") || null)}>
                <span style={{ fontSize: 15 }}>▶</span>
                <span>Start Focus</span>
              </div>
            </div>
          </div>
          <div style={{ padding: "0 20px 8px" }}>
            <button className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => setModal("new")}>+ New Task</button>
          </div>
        </nav>

        {/* Main */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-date">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
          <div className="page fade-up">
            {view === "dashboard" && <Dashboard tasks={tasks} onEdit={setModal} onToggle={handleToggle} onDelete={handleDelete} onDuplicate={handleDuplicate} onFocus={setFocusTask} settings={settings} />}
            {view === "tasks" && <AllTasks tasks={tasks} onEdit={setModal} onToggle={handleToggle} onDelete={handleDelete} onDuplicate={handleDuplicate} onFocus={setFocusTask} onAdd={(t) => setModal(t || "new")} />}
            {view === "calendar" && <CalendarView tasks={tasks} />}
            {view === "analytics" && <Analytics tasks={tasks} />}
            {view === "settings" && <Settings settings={settings} onSave={handleSaveSettings} />}
          </div>
        </main>

        {/* Task Modal */}
        {modal !== null && (
          <TaskModal task={modal === "new" ? null : modal} onSave={handleSaveTask} onClose={() => setModal(null)} />
        )}

        {/* Notifications */}
        <div className="notif">
          {notifs.map(n => (
            <div key={n.id} className="notif-item fade-up">
              <div className="notif-dot" />
              <div>
                <div className="notif-text">{n.text}</div>
                {n.sub && <div className="notif-sub">{n.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
