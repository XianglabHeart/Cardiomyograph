"use strict";

const THEME_KEY = "contrack-theme";
const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Consolas, monospace';
const NODES = [
  { key: "start", label: "Start", color: "#17BECF" },
  { key: "mcs", label: "MCS", color: "#D62728" },
  { key: "crt", label: "CRT", color: "#FF7F0E" },
  { key: "mrs", label: "MRS", color: "#BCBD22" },
  { key: "end", label: "End", color: "#111111" },
];

const S = {
  preset: "",
  rel: "",
  browseRel: "",
  data: null,
  domainId: null,
  frame: null,
  ids: null,
  mapW: 0,
  mapH: 0,
  poll: null,
};

function $(id) { return document.getElementById(id); }

function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "dark";
}
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function themeColors() {
  return {
    text: cssVar("--text"),
    text2: cssVar("--text-2"),
    text3: cssVar("--text-3"),
    grid: cssVar("--plot-grid"),
    axis: cssVar("--plot-axis"),
    accent: cssVar("--accent"),
    hoverBg: cssVar("--plot-hover-bg"),
    hoverBorder: cssVar("--plot-hover-border"),
    kp: [cssVar("--kp1"), cssVar("--kp2"), cssVar("--kp3"), cssVar("--kp4"), cssVar("--kp5")],
  };
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  if (S.frame) paintMap();
  if (S.data) drawTrace();
}
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  $("toasts").appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
async function api(url, opt) {
  const res = await fetch(url, opt);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || res.statusText);
  return data;
}
function hexRgb(hex) {
  const h = String(hex || "#888").replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.01 || a >= 1000)) return v.toExponential(2);
  return v.toFixed(3);
}

function setStatus(text, err) {
  $("statusText").textContent = text;
  $("statusPill").classList.toggle("is-err", !!err);
}
function setProgress(stage, pct, show) {
  $("progressCard").hidden = !show;
  $("progStage").textContent = stage || "—";
  $("progPct").textContent = `${Math.round(pct || 0)}%`;
  $("pbarFill").style.width = `${pct || 0}%`;
}

function renderPresets(items) {
  if (items) S.presetItems = items;
  items = S.presetItems || [];
  const box = $("presetList");
  box.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "vc-empty";
    empty.textContent = "Select a video";
    box.appendChild(empty);
    return;
  }
  items.forEach((item) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "preset-btn" + (S.preset === item.id && !S.rel ? " on" : "");
    b.innerHTML = `${item.label}<small>${item.note}</small>`;
    b.onclick = () => {
      S.rel = "";
      S.preset = item.id;
      renderPresets();
      loadPreset(item.id);
    };
    box.appendChild(b);
  });
}

function showCurrent(name) {
  const card = $("videoCard");
  card.classList.remove("empty");
  const safe = document.createElement("div");
  safe.className = "vc-name";
  safe.textContent = name;
  card.innerHTML = '<div class="vc-k">Current</div>';
  card.appendChild(safe);
}

async function loadPreset(id) {
  S.preset = id;
  showCurrent(id === "238" ? "#238" : id);
  try {
    const data = await api(`api/view?preset=${encodeURIComponent(id)}`);
    if (data.status === "done" && data.domains) {
      showView(data);
      return;
    }
    setStatus(data.stage || "Running");
    setProgress(data.stage, data.percent, true);
    $("btnRun").disabled = data.status === "running";
    if (data.status === "running" || data.status === "idle") schedulePoll(id);
    if (data.status === "error") {
      setStatus("Analysis failed", true);
      toast(data.error || "Analysis failed");
    }
  } catch (err) {
    setStatus("Analysis failed", true);
    toast(err.message);
  }
}

function schedulePoll(id) {
  if (S.poll) clearInterval(S.poll);
  S.poll = setInterval(async () => {
    if (S.preset !== id) return;
    try {
      const data = await api(`api/view?preset=${encodeURIComponent(id)}`);
      if (data.status === "done" && data.domains) {
        clearInterval(S.poll);
        setProgress("Done", 100, false);
        showView(data);
      } else {
        setProgress(data.stage, data.percent, true);
        setStatus(data.stage || "Running");
        if (data.status === "error") {
          clearInterval(S.poll);
          setStatus("Analysis failed", true);
          toast(data.error || "Analysis failed");
        }
      }
    } catch (err) {
      clearInterval(S.poll);
      toast(err.message);
    }
  }, 4000);
}

function showView(data) {
  S.data = data;
  S.domainId = data.default_domain;
  $("hudDomains").textContent = String(data.n_domains);
  $("hudBeats").textContent = String(data.n_contractions);
  $("hudFps").textContent = fmt(data.fps);
  const pipe = data.pipeline || {};
  $("versionLine").textContent =
    `Motion field: ${pipe.motion_field || "C2"} · Pipeline ${pipe.version_prefix || ""} · Weight ${pipe.weight || ""} · ${pipe.weight_sha256 || ""}`;
  const sel = $("selDomain");
  sel.innerHTML = "";
  (data.domains || []).slice().sort((a, b) => b.area - a.area).forEach((d) => {
    const o = document.createElement("option");
    o.value = String(d.id);
    const group = d.group_id && d.group_id !== d.id ? ` · group of Domain ${d.group_id}` : "";
    o.textContent = `Domain ${d.id} · ${d.n_contractions} contractions${group}`;
    sel.appendChild(o);
  });
  sel.disabled = false;
  sel.value = String(S.domainId);
  if (window.ConTrackSelect) ConTrackSelect.refresh(sel);
  $("btnRun").disabled = true;
  $("btnCsv").disabled = false;
  $("mapEmpty").hidden = true;
  setStatus("Ready");
  setProgress("", 0, false);
  loadMap().then(() => selectDomain(S.domainId, false));
}

function domainById(id) {
  return (S.data.domains || []).find((d) => d.id === Number(id));
}

function selectDomain(id, fromMap) {
  S.domainId = Number(id);
  const sel = $("selDomain");
  if (String(sel.value) !== String(S.domainId)) {
    sel.value = String(S.domainId);
    if (window.ConTrackSelect) ConTrackSelect.refresh(sel);
  }
  const dom = domainById(S.domainId);
  $("hudDomain").textContent = dom ? String(dom.id) : "—";
  $("uTitle").textContent = dom ? `|U| · Domain ${dom.id}` : "|U|";
  $("sTitle").textContent = dom ? `S · Domain ${dom.id}` : "S";
  paintMap();
  drawTrace();
  drawTables();
  if (fromMap) $("uPlot").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function loadMap() {
  const map = S.data.map;
  S.mapW = map.width;
  S.mapH = map.height;
  const frame = new Image();
  const idmap = new Image();
  await Promise.all([
    new Promise((res, rej) => { frame.onload = res; frame.onerror = rej; frame.src = map.frame; }),
    new Promise((res, rej) => { idmap.onload = res; idmap.onerror = rej; idmap.src = map.idmap; }),
  ]);
  S.frame = frame;
  const off = document.createElement("canvas");
  off.width = map.width;
  off.height = map.height;
  const ctx = off.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(idmap, 0, 0, map.width, map.height);
  const px = ctx.getImageData(0, 0, map.width, map.height).data;
  const ids = new Uint16Array(map.width * map.height);
  for (let i = 0; i < ids.length; i++) ids[i] = px[i * 4];
  S.ids = ids;
}

function paintMap() {
  if (!S.frame || !S.ids) return;
  const canvas = $("mapCanvas");
  canvas.width = S.mapW;
  canvas.height = S.mapH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(S.frame, 0, 0, S.mapW, S.mapH);
  const img = ctx.getImageData(0, 0, S.mapW, S.mapH);
  const px = img.data;
  const pal = S.data.map.palette || {};
  const sel = Number(S.domainId);
  for (let i = 0; i < S.ids.length; i++) {
    const pid = S.ids[i];
    if (!pid) continue;
    const rgb = hexRgb(pal[String(pid)] || "#888888");
    const a = pid === sel ? 0.72 : 0.36;
    const o = i * 4;
    px[o] = px[o] * (1 - a) + rgb[0] * a;
    px[o + 1] = px[o + 1] * (1 - a) + rgb[1] * a;
    px[o + 2] = px[o + 2] * (1 - a) + rgb[2] * a;
  }
  ctx.putImageData(img, 0, 0);
  ctx.font = "600 13px " + MONO;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const centers = S.data.map.centers || {};
  Object.keys(centers).forEach((key) => {
    const [x, y] = centers[key];
    const on = Number(key) === sel;
    ctx.lineWidth = on ? 3 : 2;
    ctx.strokeStyle = on ? "#ffffff" : "rgba(0,0,0,0.65)";
    ctx.strokeText(key, x, y);
    ctx.fillStyle = on ? "#111" : "#fff";
    ctx.fillText(key, x, y);
  });
  maskOutsideCrop(ctx, S.mapW, S.mapH);
  fitMap();
}

function maskOutsideCrop(ctx, w, h) {
  const crop = (S.data.map && S.data.map.crop) || null;
  if (!crop || crop.width <= 0 || crop.height <= 0) return;
  if (crop.x <= 0 && crop.y <= 0 && crop.x + crop.width >= w && crop.y + crop.height >= h) return;
  const x = crop.x;
  const y = crop.y;
  const cw = crop.width;
  const ch = crop.height;
  if (y > 0) ctx.clearRect(0, 0, w, y);
  if (y + ch < h) ctx.clearRect(0, y + ch, w, h - (y + ch));
  if (x > 0) ctx.clearRect(0, y, x, ch);
  if (x + cw < w) ctx.clearRect(x + cw, y, w - (x + cw), ch);
}

function outsideCrop(x, y) {
  const crop = S.data && S.data.map && S.data.map.crop;
  if (!crop || crop.width <= 0 || crop.height <= 0) return false;
  return x < crop.x || y < crop.y || x >= crop.x + crop.width || y >= crop.y + crop.height;
}

let fitTries = 0;
function fitMap() {
  const canvas = $("mapCanvas");
  const wrap = $("mapWrap");
  if (!canvas || !wrap || !S.mapW || !S.mapH) return;
  const narrow = window.innerWidth < 1000;
  let w = 0;
  let h = 0;
  if (narrow) {
    w = wrap.clientWidth;
    if (!w) {
      if (fitTries < 8) { fitTries += 1; requestAnimationFrame(fitMap); }
      return;
    }
    h = Math.max(1, Math.round(w * S.mapH / S.mapW));
  } else {
    const availW = wrap.clientWidth;
    let availH = wrap.clientHeight;
    if (!availH && wrap.parentElement) {
      const head = wrap.parentElement.querySelector(".viewport-head");
      availH = wrap.parentElement.clientHeight - (head ? head.offsetHeight : 0);
    }
    if (!availW || !availH) {
      if (fitTries < 8) { fitTries += 1; requestAnimationFrame(fitMap); }
      return;
    }
    const scale = Math.min(availW / S.mapW, availH / S.mapH);
    w = Math.max(1, Math.floor(S.mapW * scale));
    h = Math.max(1, Math.floor(S.mapH * scale));
  }
  fitTries = 0;
  const sw = w + "px";
  const sh = h + "px";
  if (canvas.style.width === sw && canvas.style.height === sh) return;
  canvas.style.width = sw;
  canvas.style.height = sh;
}

function mapPoint(ev) {
  const canvas = $("mapCanvas");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return { x: -1, y: -1 };
  const x = Math.floor((ev.clientX - rect.left) * (canvas.width / rect.width));
  const y = Math.floor((ev.clientY - rect.top) * (canvas.height / rect.height));
  return { x, y };
}
function pidAt(x, y) {
  if (!S.ids || x < 0 || y < 0 || x >= S.mapW || y >= S.mapH) return 0;
  if (outsideCrop(x, y)) return 0;
  return S.ids[y * S.mapW + x];
}

function sampleAt(xs, ys, t) {
  if (!xs || !xs.length || t === null || t === undefined || !Number.isFinite(t)) return null;
  let lo = 0;
  let hi = xs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  if (lo === 0) return ys[0];
  const x0 = xs[lo - 1];
  const x1 = xs[lo];
  if (x1 === x0) return ys[lo];
  const w = (t - x0) / (x1 - x0);
  return ys[lo - 1] * (1 - w) + ys[lo] * w;
}

function timeRange() {
  const fps = Number(S.data && S.data.fps);
  const n = Number(S.data && S.data.n_frames);
  if (fps > 0 && n > 0) return [0, n / fps];
  const dom = domainById(S.domainId);
  const last = dom && dom.time && dom.time.length ? dom.time[dom.time.length - 1] : 1;
  return [0, last];
}

function contractionShapes(dom) {
  const shapes = [];
  (dom.contractions || []).forEach((c) => {
    const t0 = c.nodes.start;
    const t1 = c.nodes.end;
    if (t0 === null || t0 === undefined || t1 === null || t1 === undefined) return;
    const x0 = Math.min(t0, t1);
    const x1 = Math.max(t0, t1);
    if (x1 <= x0) return;
    shapes.push({
      type: "rect", xref: "x", yref: "paper", x0, x1, y0: 0, y1: 1,
      fillcolor: "rgba(23, 190, 207, 0.08)",
      line: { width: 0 },
      layer: "below",
    });
  });
  return shapes;
}

function axisLayout(yTitle, withLegend) {
  const C = themeColors();
  const layout = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: MONO, size: 11, color: C.text2 },
    margin: { l: yTitle === "S" ? 42 : 58, r: 12, t: withLegend ? 30 : 12, b: 34 },
    hovermode: "x",
    showlegend: !!withLegend,
    hoverlabel: { bgcolor: C.hoverBg, bordercolor: C.hoverBorder, font: { family: MONO, size: 11, color: C.text } },
    shapes: contractionShapes(domainById(S.domainId) || {}),
    xaxis: {
      title: { text: "Time (s)" },
      range: timeRange(),
      gridcolor: C.grid,
      zeroline: false,
      color: C.text3,
    },
    yaxis: { title: { text: yTitle }, gridcolor: C.grid, zeroline: false, color: C.text3 },
  };
  if (withLegend) {
    layout.legend = { orientation: "h", y: 1.14, x: 0, font: { size: 10, color: C.text2 } };
  }
  return layout;
}

const PLOT_OPTS = { responsive: true, displaylogo: false, displayModeBar: false };

function drawTrace() {
  const dom = domainById(S.domainId);
  const uEmpty = $("uEmpty");
  const sEmpty = $("sEmpty");
  if (!dom || !window.Plotly) {
    if (uEmpty) uEmpty.hidden = false;
    if (sEmpty) sEmpty.hidden = false;
    return;
  }
  uEmpty.hidden = true;
  const C = themeColors();
  const uTraces = [{
    x: dom.time, y: dom.u, name: "|U|", type: "scatter", mode: "lines",
    line: { color: C.accent, width: 1.8 },
  }];
  NODES.forEach((node) => {
    const xs = [];
    const ys = [];
    (dom.contractions || []).forEach((c) => {
      const t = c.nodes[node.key];
      const y = sampleAt(dom.time, dom.u, t);
      if (y === null || !Number.isFinite(y)) return;
      xs.push(t);
      ys.push(y);
    });
    uTraces.push({
      x: xs, y: ys, name: node.label, type: "scatter", mode: "markers",
      marker: {
        color: node.color, size: 7, symbol: "circle",
        line: { color: node.key === "end" ? "#ffffff" : "rgba(255,255,255,0.85)", width: 1 },
      },
      hovertemplate: `${node.label} %{x:.3f}s<extra></extra>`,
      showlegend: true,
    });
  });
  Plotly.react($("uPlot"), uTraces, axisLayout("|U| (px / 45 ms)", true), PLOT_OPTS);
  if (dom.s && dom.s.length) {
    sEmpty.hidden = true;
    Plotly.react($("sPlot"), [{
      x: dom.time, y: dom.s, name: "S", type: "scatter", mode: "lines",
      line: { color: "#0072B2", width: 1.8 },
    }], axisLayout("S", false), PLOT_OPTS);
  } else {
    sEmpty.hidden = false;
    Plotly.react($("sPlot"), [], axisLayout("S", false), PLOT_OPTS);
  }
}

function paramTable(rows) {
  const table = document.createElement("table");
  table.className = "param-table";
  table.innerHTML = "<thead><tr><th>Parameter</th><th>Value</th><th>Unit</th></tr></thead>";
  const body = document.createElement("tbody");
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${row.name}</td><td class="mono">${fmt(row.value)}</td><td>${row.unit || ""}</td>`;
    body.appendChild(tr);
  });
  table.appendChild(body);
  return table;
}

function groupSentence(dom) {
  if (!dom || !dom.parameters_from_group || !dom.group_id) return "";
  return `Domain ${dom.id} contracts in synchrony with Domain ${dom.group_id}; parameters are reported for the synchronized group (representative: Domain ${dom.group_id}).`;
}

function setGroupNote(scrollEl, sentence) {
  if (!scrollEl || !scrollEl.parentElement) return;
  const prev = scrollEl.previousElementSibling;
  if (prev && prev.classList && prev.classList.contains("group-note")) prev.remove();
  if (!sentence) return;
  const note = document.createElement("p");
  note.className = "group-note";
  note.textContent = sentence;
  scrollEl.parentElement.insertBefore(note, scrollEl);
}

function drawTables() {
  const dom = domainById(S.domainId);
  const domainHost = document.querySelector("#domainTable") ? document.querySelector("#domainTable").parentElement : document.querySelectorAll(".table-scroll")[0];
  const beatHost = $("beatTable");
  domainHost.innerHTML = "";
  beatHost.innerHTML = "";
  if (!dom) {
    setGroupNote(domainHost, "");
    setGroupNote(beatHost, "");
    return;
  }
  const sentence = groupSentence(dom);
  setGroupNote(domainHost, sentence);
  const made = paramTable(dom.domain_parameters || []);
  made.id = "domainTable";
  domainHost.appendChild(made);
  setGroupNote(beatHost, sentence);
  (dom.median_parameters || []).forEach((row) => {
    const det = document.createElement("details");
    det.className = "beat-block";
    const sum = document.createElement("summary");
    sum.textContent = `${row.name}: ${fmt(row.value)} ${row.unit || ""}`;
    det.appendChild(sum);
    const per = document.createElement("table");
    per.className = "param-table";
    per.innerHTML = "<thead><tr><th>Contraction</th><th>Value</th></tr></thead>";
    const tb = document.createElement("tbody");
    (dom.contractions || []).forEach((c) => {
      const found = (c.parameters || []).find((p) => p.name === row.name);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${c.index}</td><td class="mono">${fmt(found ? found.value : null)}</td>`;
      tb.appendChild(tr);
    });
    per.appendChild(tb);
    det.appendChild(per);
    beatHost.appendChild(det);
  });
}

function exportCsv() {
  const dom = domainById(S.domainId);
  if (!dom) return;
  const lines = ["kind,name,contraction,value,unit"];
  (dom.domain_parameters || []).forEach((p) => {
    lines.push(["domain", csv(p.name), "", csv(p.value), csv(p.unit)].join(","));
  });
  (dom.contractions || []).forEach((c) => {
    (c.parameters || []).forEach((p) => {
      lines.push(["contraction", csv(p.name), c.index, csv(p.value), csv(p.unit)].join(","));
    });
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `domain_${dom.id}.csv`;
  a.click();
}
function csv(v) {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replaceAll('"', '""')}"`;
}

async function browse(rel) {
  S.browseRel = rel || "";
  const box = $("browser");
  box.innerHTML = "Loading…";
  const data = await api(`api/browse?rel=${encodeURIComponent(rel || "")}`);
  const crumbs = $("crumbs");
  crumbs.innerHTML = "";
  (data.crumbs || []).forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = c.name;
    b.onclick = () => browse(c.rel);
    crumbs.appendChild(b);
  });
  box.innerHTML = "";
  if (!data.is_root) {
    const up = document.createElement("button");
    up.type = "button";
    up.className = "btn btn-secondary";
    up.textContent = "Up";
    up.onclick = () => browse(data.parent);
    box.appendChild(up);
  }
  (data.dirs || []).forEach((d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-secondary btn-full";
    b.textContent = d.name;
    b.onclick = () => browse(d.rel);
    box.appendChild(b);
  });
  (data.videos || []).forEach((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-secondary btn-full";
    b.textContent = v.name;
    b.onclick = () => chooseVideo(v);
    box.appendChild(b);
  });
}

async function chooseVideo(v) {
  $("browseModal").hidden = true;
  S.rel = v.rel;
  renderPresets();
  showCurrent(v.name);
  $("btnRun").disabled = false;
  setStatus("Ready");
}

async function runCurrent() {
  if (!S.preset) {
    toast("Select a video");
    return;
  }
  $("btnRun").disabled = true;
  setStatus("Running");
  setProgress("Queued", 1, true);
  const body = { preset: S.preset };
  try {
    const data = await api("api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    S.preset = data.preset;
    S.rel = "";
    schedulePoll(data.preset);
  } catch (err) {
    $("btnRun").disabled = false;
    setStatus("Analysis failed", true);
    toast(err.message);
  }
}

function bindMap() {
  const canvas = $("mapCanvas");
  const tip = $("mapTip");
  canvas.addEventListener("mousemove", (ev) => {
    if (!S.ids) return;
    const p = mapPoint(ev);
    const pid = pidAt(p.x, p.y);
    if (!pid) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.textContent = `Domain ${pid}`;
    const rect = $("mapWrap").getBoundingClientRect();
    tip.style.left = `${ev.clientX - rect.left + 12}px`;
    tip.style.top = `${ev.clientY - rect.top + 12}px`;
  });
  canvas.addEventListener("mouseleave", () => { tip.hidden = true; });
  canvas.addEventListener("click", (ev) => {
    if (!S.ids) return;
    const p = mapPoint(ev);
    const pid = pidAt(p.x, p.y);
    if (pid) selectDomain(pid, true);
  });
}

async function refreshPresets() {
  const data = await api("api/presets");
  renderPresets(data.presets || []);
}
async function uploadSelected(file) {
  const body = new FormData();
  body.append("file", file, file.name);
  const data = await api("api/upload", { method: "POST", body });
  S.preset = data.preset;
  S.rel = "";
  showCurrent(data.label || file.name);
  await refreshPresets();
  setStatus("Ready");
  $("btnRun").disabled = false;
}
$("btnTheme").onclick = () => applyTheme(getTheme() === "dark" ? "light" : "dark");
$("btnSelect").onclick = () => $("fileVideo").click();
$("fileVideo").onchange = async (ev) => {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = "";
  if (!file) return;
  try {
    await uploadSelected(file);
  } catch (err) {
    toast(err.message);
  }
};
$("btnCloseModal").onclick = () => { $("browseModal").hidden = true; };
$("browseModal").onclick = (ev) => { if (ev.target === $("browseModal")) $("browseModal").hidden = true; };
$("btnRun").onclick = runCurrent;
$("btnCsv").onclick = exportCsv;
$("selDomain").onchange = () => selectDomain($("selDomain").value, false);
bindMap();
refreshPresets().catch((err) => toast(err.message));
function resizePlots() {
  if (!window.Plotly) return;
  ["uPlot", "sPlot"].forEach((id) => {
    const plot = $(id);
    if (plot && plot.data) Plotly.Plots.resize(plot);
  });
}
if (window.ResizeObserver) {
  const watch = new ResizeObserver(() => resizePlots());
  watch.observe($("uPlot"));
  watch.observe($("sPlot"));
  new ResizeObserver(() => fitMap()).observe($("mapWrap"));
}
window.addEventListener("resize", () => fitMap());
