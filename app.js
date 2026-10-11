'use strict';
// ---------- Program ----------
const DIAL = [5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 52.5];
const MAXW = DIAL[DIAL.length - 1];

// type: 'reps' | 'time'; bw: bodyweight (no weight input); side: per-side note; rest: auto-start rest after a ticked set
const PROGRAM = {
  A: { name: 'Day A', sub: 'Supersets', note: 'Supersets: do A1 then A2, rest 60 s, repeat. Same for B1/B2. Plank last.', rest: 60, ex: [
    { id: 'goblet_squat', grp: 'A1', name: 'Goblet squat', sets: 3, min: 8, max: 12, type: 'reps', def: 30 },
    { id: 'db_bench', grp: 'A2', name: 'DB bench press', sets: 3, min: 8, max: 12, type: 'reps', def: 25, rest: true },
    { id: 'rdl', grp: 'B1', name: 'Romanian deadlift', sets: 3, min: 10, max: 12, type: 'reps', def: 30 },
    { id: 'one_arm_row', grp: 'B2', name: 'One-arm row', sets: 3, min: 10, max: 10, type: 'reps', side: 'each side', def: 30, rest: true },
    { id: 'plank', grp: 'C', name: 'Plank', sets: 3, min: 30, max: 45, type: 'time', bw: true, def: 30, rest: true, toggle: true, vars: ['Standard', 'Harder'], varHint: 'Harder = 5 s pause per side with shoulder taps, or feet elevated / plate on back' },
  ]},
  B: { name: 'Day B', sub: 'Supersets', note: 'Supersets: A1 then A2, rest 60 s, repeat. Same for B1/B2. Farmer\u2019s carry last.', rest: 60, ex: [
    { id: 'bulgarian_split_squat', grp: 'A1', name: 'Bulgarian split squat', sets: 3, min: 8, max: 10, type: 'reps', side: 'each leg', def: 15 },
    { id: 'incline_row', grp: 'A2', name: 'Chest-supported incline row', sets: 3, min: 10, max: 12, type: 'reps', def: 20, rest: true },
    { id: 'hip_thrust', grp: 'B1', name: 'Hip thrust', sets: 3, min: 10, max: 12, type: 'reps', def: 35 },
    { id: 'shoulder_press', grp: 'B2', name: 'Seated shoulder press', sets: 3, min: 8, max: 12, type: 'reps', def: 17.5, rest: true },
    { id: 'farmers_carry', grp: 'C', name: 'Farmer\u2019s carry', sets: 3, min: 40, max: 40, type: 'time', def: 40, rest: true },
  ]},
  C: { name: 'Day C', sub: 'Circuit \u00d74', note: 'Circuit: one set of each exercise in order = 1 round. 4 rounds, 90 s rest between rounds.', rest: 90, circuit: true, ex: [
    { id: 'thruster', grp: '1', name: 'Thruster', sets: 4, min: 10, max: 10, type: 'reps', def: 12.5 },
    { id: 'renegade_row', grp: '2', name: 'Renegade row', sets: 4, min: 8, max: 8, type: 'reps', side: 'each side', def: 17.5 },
    { id: 'reverse_lunge', grp: '3', name: 'Reverse lunge', sets: 4, min: 8, max: 8, type: 'reps', side: 'each leg', def: 15 },
    { id: 'incline_pushup', grp: '4', name: 'Incline push-up', sets: 4, min: 12, max: 15, type: 'reps', bw: true, def: 0, repLadder: true, vars: ['Bench incline', 'Lower incline', 'Floor'] },
    { id: 'dead_bug', grp: '5', name: 'Dead bug', sets: 4, min: 10, max: 10, type: 'reps', side: 'each side', bw: true, def: 0, rest: true, vars: ['Normal tempo', 'Slow tempo (3 s)', 'Holding light DB'] },
  ]},
};
const ROT = ['A', 'B', 'C'];
const EXBYID = {};
for (const d of ROT) for (const e of PROGRAM[d].ex) EXBYID[e.id] = Object.assign(e, { day: d });

// ---------- Storage ----------
const KEY = 'lunchlifts.v1';
let db = load();
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && Array.isArray(d.sessions)) return Object.assign({ drafts: {} }, d); } catch (e) {}
  return { sessions: [], drafts: {} };
}
function save() { localStorage.setItem(KEY, JSON.stringify(db)); }

// ---------- Helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtW = w => (w == null ? '' : String(w));
const unit = ex => ex.type === 'time' ? 's' : '';
const fmtDate = iso => new Date(iso).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
const snapW = w => DIAL.reduce((a, b) => Math.abs(b - w) < Math.abs(a - w) ? b : a, DIAL[0]);
function nextWeight(w) { const i = DIAL.indexOf(snapW(w)); return i >= 0 && i < DIAL.length - 1 ? DIAL[i + 1] : null; }
function sessionsNewest() { return db.sessions.slice().sort((a, b) => b.date.localeCompare(a.date)); }
function lastFor(exId) {
  for (const s of sessionsNewest()) { const sets = s.entries[exId]; if (sets && sets.length) return { date: s.date, sets, v: (s.vars && s.vars[exId]) || 0 }; }
  return null;
}
function targetText(ex) {
  const r = ex.min === ex.max ? `${ex.min}` : `${ex.min}\u2013${ex.max}`;
  const u = ex.type === 'time' ? ' s' : '';
  const r2 = ex.repLadder ? `${ex.min}` : r;
  const label = PROGRAM[ex.day].circuit ? `${ex.sets} rounds \u00d7 ${r2}${u}` : `${ex.sets} \u00d7 ${r2}${u}`;
  return label + (ex.side ? ` ${ex.side}` : '') + (ex.bw ? ' \u00b7 bodyweight' : '') + (ex.repLadder ? ` (build to ${ex.max})` : '');
}
function setsText(ex, sets) {
  const vals = sets.map(s => s.v + unit(ex));
  if (ex.bw) return vals.join(', ');
  const ws = [...new Set(sets.map(s => s.w))];
  if (ws.length === 1) return `<b>${fmtW(ws[0])} lb</b> \u00d7 ${vals.join(', ')}`;
  return sets.map(s => `<b>${fmtW(s.w)}</b>\u00d7${s.v}${unit(ex)}`).join(', ') + ' lb';
}

// Progression: top of range hit on every prescribed set -> suggestion object, else null.
// vi = variation index used (bodyweight ladders).
function progression(ex, sets, vi = 0) {
  if (!sets || sets.length < ex.sets) return null;
  const vals = sets.map(s => Number(s.v));
  const per = PROGRAM[ex.day].circuit ? 'round' : 'set';
  const nextVar = ex.vars && vi < ex.vars.length - 1 ? vi + 1 : null;
  if (ex.repLadder) { // incline push-up: reps first (min..max), then next variation
    const lo = Math.min(...vals);
    if (lo >= ex.max) {
      if (nextVar != null) return { kind: 'var', to: nextVar, reps: ex.min, text: `Hit ${ex.max} on every ${per}. <strong>Next: ${ex.vars[nextVar]} push-ups</strong>, back to ${ex.min} reps.` };
      return { kind: 'top', text: `${ex.max} floor push-ups every ${per} \u2014 top of the ladder. Keep it up or ask Sam for the next step.` };
    }
    if (lo >= ex.min) return { kind: 'reps', reps: lo + 1, text: `${lo}+ reps on every ${per}. <strong>Next: aim for ${lo + 1} reps</strong> (build to ${ex.max}, then ${nextVar != null ? ex.vars[nextVar].toLowerCase() : 'hold'}).` };
    return null;
  }
  if (!vals.every(v => v >= ex.max)) return null;
  if (ex.vars) { // plank, dead bug: move up the variation ladder
    const hit = ex.type === 'time' ? `Held ${ex.max} s on every ${per}.` : `Hit ${ex.max}${ex.side ? ' ' + ex.side : ''} on every ${per}.`;
    if (nextVar != null) return { kind: 'var', to: nextVar, reps: ex.type === 'time' ? ex.min : null,
      text: `${hit} <strong>Next: ${ex.vars[nextVar].toLowerCase()} variation</strong>${ex.type === 'time' ? ` and reset to ${ex.min} s` : ''}.` };
    return { kind: 'top', text: `${hit} Top of the ladder (${ex.vars[vi]}) \u2014 keep it up or ask Sam for the next step.` };
  }
  const cur = Math.max(...sets.map(s => Number(s.w)));
  const nw = nextWeight(cur);
  if (nw == null) return { kind: 'max', from: cur, text: `Maxed the dial at ${MAXW} lb. Next: add reps, slow the tempo (3 s down), or add a pause.` };
  return { kind: 'up', from: cur, to: nw, text: `${ex.type === 'time' ? `Held ${ex.max} s` : 'Top of range'} on every ${per} at ${fmtW(cur)} lb. <strong>Go up to ${fmtW(nw)} lb.</strong>` };
}

function suggestedDay() {
  const last = sessionsNewest()[0];
  if (!last) return 'A';
  return ROT[(ROT.indexOf(last.day) + 1) % 3];
}

// ---------- Draft ----------
function makeDraft(day) {
  const entries = {}, vars = {};
  for (const ex of PROGRAM[day].ex) {
    const last = lastFor(ex.id);
    const rows = [];
    for (let i = 0; i < ex.sets; i++) {
      const ls = last ? (last.sets[i] || last.sets[last.sets.length - 1]) : null;
      rows.push({ w: ex.bw ? null : (ls && ls.w != null ? snapW(ls.w) : ex.def), v: ls ? Number(ls.v) : ex.min, done: false });
    }
    entries[ex.id] = rows;
    if (ex.vars) vars[ex.id] = last ? last.v : 0;
  }
  return { day, started: new Date().toISOString(), entries, vars };
}
function draftFor(day) {
  if (!db.drafts[day]) { db.drafts[day] = makeDraft(day); save(); }
  if (!db.drafts[day].vars) db.drafts[day].vars = {};
  return db.drafts[day];
}
function draftHasTicks(d) { return d && Object.values(d.entries).some(r => r.some(s => s.done)); }

// ---------- UI state ----------
let view = 'log';
let curDay = (() => { for (const d of ROT) if (draftHasTicks(db.drafts[d])) return d; return suggestedDay(); })();

function render() {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  if (view === 'log') renderLog(); else if (view === 'history') renderHistory(); else renderSettings();
}

function stepper(kind, exId, i, val, ex) {
  if (kind === 'w') return `<div class="step" data-k="w"><button aria-label="lighter" data-act="w-" data-ex="${exId}" data-i="${i}">\u2212</button><div class="val">${fmtW(val)}<small>lb</small></div><button aria-label="heavier" data-act="w+" data-ex="${exId}" data-i="${i}">+</button></div>`;
  return `<div class="step" data-k="v"><button aria-label="less" data-act="v-" data-ex="${exId}" data-i="${i}">\u2212</button><div class="val"><input inputmode="numeric" pattern="[0-9]*" value="${val}" data-ex="${exId}" data-i="${i}" aria-label="${ex.type === 'time' ? 'seconds' : 'reps'}"><small>${ex.type === 'time' ? 'sec' : (ex.side ? 'reps/' + ex.side.split(' ')[1] : 'reps')}</small></div><button aria-label="more" data-act="v+" data-ex="${exId}" data-i="${i}">+</button></div>`;
}

function renderLog() {
  const sug = suggestedDay();
  const P = PROGRAM[curDay];
  const d = draftFor(curDay);
  let h = `<div class="days">${ROT.map(k => `<button class="day ${k === curDay ? 'active' : ''}" data-day="${k}">${PROGRAM[k].name}<small>${PROGRAM[k].sub}</small>${k === sug ? '<span class="sug">NEXT</span>' : ''}</button>`).join('')}</div>`;
  h += `<div class="daynote">${esc(P.note)}</div>`;
  for (const ex of P.ex) {
    const rows = d.entries[ex.id];
    const last = lastFor(ex.id);
    const allDone = rows.length && rows.every(r => r.done);
    h += `<section class="card ${allDone ? 'done' : ''}" id="ex-${ex.id}"><div class="exhead"><span class="grp">${P.circuit ? '#' + ex.grp : ex.grp}</span><span class="exname">${esc(ex.name)}</span><span class="target">${targetText(ex)}</span></div>`;
    const vi = ex.vars ? (d.vars[ex.id] || 0) : 0;
    if (last) {
      h += `<div class="last">Last time \u00b7 ${fmtDate(last.date)}${ex.vars ? ` (${esc(ex.vars[last.v] || ex.vars[0])})` : ''}: ${setsText(ex, last.sets)}</div>`;
      const pg = progression(ex, last.sets, last.v);
      if (pg) {
        let btn = '';
        if (pg.kind === 'up') btn = rows.every(r => r.w === pg.to) ? '<span>\u2713 set</span>' : `<button data-act="apply" data-ex="${ex.id}" data-w="${pg.to}">Use ${fmtW(pg.to)} lb</button>`;
        else if (pg.kind === 'var') btn = vi === pg.to ? '<span>\u2713 set</span>' : `<button data-act="applyvar" data-ex="${ex.id}" data-v="${pg.to}"${pg.reps != null ? ` data-r="${pg.reps}"` : ''}>${ex.toggle ? 'Turn on' : 'Switch'}</button>`;
        else if (pg.kind === 'reps') btn = rows.every(r => Number(r.v) >= pg.reps) ? '<span>\u2713 set</span>' : `<button data-act="applyreps" data-ex="${ex.id}" data-r="${pg.reps}">Aim ${pg.reps}</button>`;
        h += `<div class="flag"><span>\u2b06\ufe0f ${pg.text}</span>${btn}</div>`;
      }
    } else {
      const msg = ex.type === 'time' && ex.bw ? `Hold as long as you cleanly can (target ${ex.min}\u2013${ex.max} s).`
        : ex.bw ? 'Pick your variation and log what you do.'
        : `Suggested start: <b>${fmtW(ex.def)} lb</b>. Adjust with \u2212/+ until the last reps are hard but clean.`;
      h += `<div class="calib"><span class="badge">Calibration</span> First time. ${msg} Whatever you log becomes your baseline.</div>`;
    }
    if (ex.vars) {
      if (ex.toggle) h += `<button class="toggle ${vi ? 'on' : ''}" data-act="toggle" data-ex="${ex.id}" aria-pressed="${vi ? 'true' : 'false'}"><span class="knob"></span>Harder variation: <b>${vi ? 'ON' : 'off'}</b></button><div class="varhint">${esc(ex.varHint)}</div>`;
      else h += `<div class="seg" role="group" aria-label="variation">${ex.vars.map((v, k) => `<button class="${k === vi ? 'on' : ''}" data-act="setvar" data-ex="${ex.id}" data-v="${k}">${esc(v)}</button>`).join('')}</div>`;
    }
    h += `<div class="hdrrow ${ex.bw ? 'bw' : ''}"><span>${P.circuit ? 'Rd' : 'Set'}</span>${ex.bw ? '' : '<span>Weight</span>'}<span>${ex.type === 'time' ? 'Seconds' : 'Reps'}</span><span>Done</span></div><div class="sets">`;
    rows.forEach((r, i) => {
      h += `<div class="setrow ${ex.bw ? 'bw' : ''}"><span class="setno">${i + 1}</span>${ex.bw ? '' : stepper('w', ex.id, i, r.w, ex)}${stepper('v', ex.id, i, r.v, ex)}<button class="check ${r.done ? 'on' : ''}" data-act="done" data-ex="${ex.id}" data-i="${i}" aria-label="mark set done">\u2713</button></div>`;
    });
    h += `</div><div class="row-actions"><button class="ghost" data-act="addset" data-ex="${ex.id}">+ set</button>${rows.length > 1 ? `<button class="ghost" data-act="rmset" data-ex="${ex.id}">\u2212 set</button>` : ''}</div>`;
    const live = allDone ? progression(ex, rows, vi) : null;
    if (live) h += `<div class="flag live"><span>\ud83d\udd25 ${live.kind === 'up' ? `Top of range on every ${P.circuit ? 'round' : 'set'}! Next time: <strong>${fmtW(live.to)} lb</strong>.` : live.text}</span></div>`;
    h += `</section>`;
  }
  h += `<button class="primary" data-act="finish">Finish &amp; save ${P.name}</button>`;
  h += `<button class="secondary" data-act="reset">Reset today\u2019s inputs to last time</button>`;
  $('#main').innerHTML = h;
}

function renderHistory() {
  const ss = sessionsNewest();
  let h = `<h2>History <span class="muted">(${ss.length} sessions)</span></h2><div class="hist">`;
  if (!ss.length) h += `<p class="muted">No sessions yet. Log your first workout on the Log tab.</p>`;
  for (const s of ss) {
    h += `<div class="sess"><h3><span>${PROGRAM[s.day].name} \u00b7 ${fmtDate(s.date)}</span><button class="del" data-act="del" data-id="${s.id}">Delete</button></h3>`;
    for (const [id, sets] of Object.entries(s.entries)) {
      const ex = EXBYID[id]; if (!ex) continue;
      const v = (s.vars && s.vars[id]) || 0;
      const pg = progression(ex, sets, v);
      h += `<div class="line">${esc(ex.name)}${ex.vars ? ` (${esc(ex.vars[v])})` : ''}: ${setsText(ex, sets)}${pg && pg.kind !== 'reps' && pg.kind !== 'top' ? ' \u2b06\ufe0f' : ''}</div>`;
    }
    h += `</div>`;
  }
  $('#main').innerHTML = h + '</div>';
}

function renderSettings() {
  $('#main').innerHTML = `<h2>Backup &amp; data</h2>
  <div class="card"><p class="muted" style="margin-top:0">Your data lives only on this phone (browser storage). Export a backup now and then, especially before clearing browser data or switching phones.</p>
  <button class="primary" data-act="export">Export backup (JSON)</button>
  <label class="secondary" style="display:block;text-align:center">Import backup file<input id="importFile" type="file" accept="application/json,.json" hidden></label>
  <p class="muted">${db.sessions.length} saved sessions.</p>
  <button class="secondary danger" data-act="wipe">Erase all data</button></div>
  <div class="card"><b>Dial</b><p class="muted">${DIAL.join(', ')} lb</p><b>Rule</b><p class="muted">Hit the top of the rep range on every set \u2192 go up one dial setting next time.</p></div>`;
  $('#importFile').addEventListener('change', importFile);
}

// ---------- Actions ----------
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2200); }

document.addEventListener('click', e => {
  const tab = e.target.closest('.tab'); if (tab) { view = tab.dataset.view; render(); window.scrollTo(0, 0); return; }
  const day = e.target.closest('[data-day]'); if (day) { curDay = day.dataset.day; render(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, exId = b.dataset.ex, i = Number(b.dataset.i);
  const d = db.drafts[curDay];
  const rows = d && exId ? d.entries[exId] : null;
  const ex = exId ? EXBYID[exId] : null;
  switch (act) {
    case 'w-': case 'w+': {
      const k = DIAL.indexOf(rows[i].w); const nk = Math.max(0, Math.min(DIAL.length - 1, k + (act === 'w+' ? 1 : -1)));
      const old = rows[i].w; rows[i].w = DIAL[nk];
      // changing set 1 carries to later sets that matched it (common case: same weight all sets)
      if (i === 0) for (let j = 1; j < rows.length; j++) if (rows[j].w === old && !rows[j].done) rows[j].w = DIAL[nk];
      break; }
    case 'v-': case 'v+': {
      const step = ex.type === 'time' ? 5 : 1;
      rows[i].v = Math.max(0, Number(rows[i].v) + (act === 'v+' ? step : -step)); break; }
    case 'done': {
      rows[i].done = !rows[i].done;
      if (rows[i].done && ex.rest && !(PROGRAM[curDay].circuit && i === rows.length - 1)) startRest(PROGRAM[curDay].rest);
      break; }
    case 'apply': { const w = Number(b.dataset.w); rows.forEach(r => { if (!r.done) { r.w = w; r.v = ex.min; } }); toast(`Set to ${w} lb`); break; }
    case 'applyvar': { d.vars[exId] = Number(b.dataset.v); if (b.dataset.r) rows.forEach(r => { if (!r.done) r.v = Number(b.dataset.r); }); toast(ex.toggle ? 'Harder variation on \u2014 target reset to ' + ex.min + ' s' : 'Switched to ' + ex.vars[d.vars[exId]]); break; }
    case 'applyreps': { const n = Number(b.dataset.r); rows.forEach(r => { if (!r.done && Number(r.v) < n) r.v = n; }); break; }
    case 'setvar': d.vars[exId] = Number(b.dataset.v); break;
    case 'toggle': { d.vars[exId] = d.vars[exId] ? 0 : 1; if (d.vars[exId]) { rows.forEach(r => { if (!r.done) r.v = ex.min; }); toast('Harder variation on \u2014 target reset to ' + ex.min + ' s'); } break; }
    case 'addset': { const l = rows[rows.length - 1]; rows.push({ w: l.w, v: l.v, done: false }); break; }
    case 'rmset': rows.pop(); break;
    case 'finish': return finish();
    case 'reset': if (confirm('Reset today\u2019s inputs for ' + PROGRAM[curDay].name + '?')) { db.drafts[curDay] = makeDraft(curDay); } break;
    case 'del': if (confirm('Delete this session?')) { db.sessions = db.sessions.filter(s => s.id !== b.dataset.id); save(); render(); } return;
    case 'export': return exportData();
    case 'wipe': if (confirm('Erase ALL workouts on this phone? This cannot be undone.')) { db = { sessions: [], drafts: {} }; save(); curDay = 'A'; toast('All data erased'); render(); } return;
  }
  save(); render();
});

document.addEventListener('change', e => {
  const inp = e.target.closest('input[data-ex]'); if (!inp) return;
  const rows = db.drafts[curDay].entries[inp.dataset.ex];
  const n = parseInt(inp.value, 10); rows[Number(inp.dataset.i)].v = isNaN(n) ? 0 : Math.max(0, n);
  save(); render();
});
document.addEventListener('focusin', e => { if (e.target.matches('input[data-ex]')) e.target.select(); });

function finish() {
  const d = db.drafts[curDay];
  const entries = {};
  for (const [id, rows] of Object.entries(d.entries)) {
    const done = rows.filter(r => r.done).map(r => (EXBYID[id].bw ? { v: Number(r.v) } : { w: r.w, v: Number(r.v) }));
    if (done.length) entries[id] = done;
  }
  if (!Object.keys(entries).length) { toast('Tick \u2713 the sets you finished first'); return; }
  const missing = Object.values(d.entries).reduce((n, r) => n + r.filter(x => !x.done).length, 0);
  if (missing && !confirm(`${missing} set(s) not ticked \u2014 save only the ticked sets?`)) return;
  const vars = {}; for (const id of Object.keys(entries)) if (EXBYID[id].vars) vars[id] = (d.vars && d.vars[id]) || 0;
  db.sessions.push({ id: Date.now().toString(36), day: curDay, date: new Date().toISOString(), entries, vars });
  delete db.drafts[curDay];
  save();
  curDay = suggestedDay();
  toast(`Saved! Next up: ${PROGRAM[curDay].name}`);
  stopRest();
  render(); window.scrollTo(0, 0);
}

function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'lunchlifts', version: 1, exported: new Date().toISOString(), sessions: db.sessions }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `lunch-lifts-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function importFile(e) {
  const f = e.target.files[0]; if (!f) return;
  f.text().then(t => {
    const j = JSON.parse(t); const ss = Array.isArray(j) ? j : j.sessions;
    if (!Array.isArray(ss)) throw new Error('bad');
    const ids = new Set(db.sessions.map(s => s.id)); let n = 0;
    for (const s of ss) if (s && s.id && s.day && s.date && s.entries && !ids.has(s.id)) { db.sessions.push(s); n++; }
    save(); toast(`Imported ${n} session(s)`); render();
  }).catch(() => toast('Could not read that backup file'));
}

// ---------- Rest timer ----------
let restEnd = 0, restInt = null, audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach(t => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.2, audioCtx.currentTime + t); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2); });
  } catch (e) {}
}
function startRest(sec) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume && audioCtx.resume(); } catch (e) {}
  restEnd = Date.now() + sec * 1000; clearInterval(restInt); restInt = setInterval(tick, 200); tick();
}
function stopRest() { clearInterval(restInt); restInt = null; const c = $('#restclock'); c.textContent = '--'; c.className = 'restclock'; }
function tick() {
  const c = $('#restclock'); const left = Math.ceil((restEnd - Date.now()) / 1000);
  if (left > 0) { c.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`; c.className = 'restclock running'; return; }
  clearInterval(restInt); restInt = null; c.textContent = 'GO!'; c.className = 'restclock end';
  if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]);
  beep(); setTimeout(() => { if (!restInt) { c.textContent = '--'; c.className = 'restclock'; } }, 4000);
}
$('#rest60').addEventListener('click', () => startRest(60));
$('#rest90').addEventListener('click', () => startRest(90));
$('#restclock').addEventListener('click', stopRest);

// ---------- Boot ----------
render();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__LL = { DIAL, PROGRAM, progression, nextWeight, db: () => db };
