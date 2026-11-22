"use strict";
/* VeloPlan – edytor treningów (UC9). Dane w localStorage, bez serwera. */
const STORE = "veloplan.workouts";
const $ = (id) => document.getElementById(id);
let intervals = [];

const ftp = () => Number($("ftp").value) || 0;
const watts = (pct) => Math.round((ftp() * pct) / 100);
const fmtTime = (min) => {
  const s = Math.round(min * 60);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return (h ? h + " h " : "") + m + " min" + (r ? " " + r + " s" : "");
};

function mark(input, errEl, text) {
  input.classList.toggle("invalid", !!text);
  if (errEl) errEl.textContent = text || "";
}

function validateInterval() {
  const dur = Number($("dur").value), pct = Number($("pct").value);
  const cadRaw = $("cad").value.trim(), cad = Number(cadRaw);
  let ok = true, text = "";
  mark($("dur"), null, ""); mark($("pct"), null, ""); mark($("cad"), null, "");
  if (!(dur > 0) || dur > 240) { mark($("dur"), null, "x"); text = "Czas musi być w zakresie 0,5–240 min."; ok = false; }
  else if (!(pct >= 20 && pct <= 200)) { mark($("pct"), null, "x"); text = "Moc musi być w zakresie 20–200% FTP."; ok = false; }
  else if (cadRaw !== "" && !(cad >= 40 && cad <= 140)) { mark($("cad"), null, "x"); text = "Kadencja musi być w zakresie 40–140 rpm."; ok = false; }
  $("err-int").textContent = text;
  return ok ? { dur, pct, cad: cadRaw === "" ? null : cad } : null;
}

function render() {
  const ol = $("intervals");
  ol.innerHTML = "";
  intervals.forEach((iv, i) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `${fmtTime(iv.dur)} · ${iv.pct}% FTP (${watts(iv.pct)} W)` + (iv.cad ? ` · ${iv.cad} rpm` : "");
    const del = document.createElement("button");
    del.type = "button"; del.textContent = "Usuń"; del.setAttribute("aria-label", "Usuń interwał " + (i + 1));
    del.addEventListener("click", () => { intervals.splice(i, 1); render(); });
    li.append(span, del);
    ol.append(li);
  });
  const total = intervals.reduce((a, b) => a + b.dur, 0);
  $("summary").textContent = intervals.length
    ? `Łączny czas: ${fmtTime(total)} · interwałów: ${intervals.length}`
    : "Brak interwałów.";
  drawProfile();
}

function drawProfile() {
  const c = $("profile"), g = c.getContext("2d"), W = c.width, H = c.height;
  g.clearRect(0, 0, W, H);
  const total = intervals.reduce((a, b) => a + b.dur, 0);
  if (!total) return;
  const maxPct = Math.max(120, ...intervals.map((i) => i.pct));
  let x = 0;
  g.font = "12px Calibri, Arial"; g.textBaseline = "top";
  intervals.forEach((iv) => {
    const w = (iv.dur / total) * W, h = (iv.pct / maxPct) * (H - 18);
    g.fillStyle = iv.pct < 60 ? "#74c0fc" : iv.pct < 90 ? "#69db7c" : iv.pct < 105 ? "#ffd43b" : iv.pct < 120 ? "#ff922b" : "#fa5252";
    g.fillRect(x + 1, H - h, Math.max(w - 2, 1), h);
    if (w > 46) { g.fillStyle = "#1f2933"; g.fillText(watts(iv.pct) + " W", x + 5, H - h + 4); }
    x += w;
  });
}

function getLib() {
  try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch { return []; }
}
function setLib(list) {
  try { localStorage.setItem(STORE, JSON.stringify(list)); return true; } catch { return false; }
}

function renderLib() {
  const list = getLib(), ul = $("library");
  ul.innerHTML = "";
  $("empty").hidden = list.length > 0;
  list.forEach((w, idx) => {
    const total = w.intervals.reduce((a, b) => a + b.dur, 0);
    const li = document.createElement("li");
    const box = document.createElement("div");
    const strong = document.createElement("strong"); strong.textContent = w.name;
    const small = document.createElement("small");
    small.textContent = `${fmtTime(total)} · ${w.intervals.length} interw. · FTP ${w.ftp} W`;
    box.append(strong, small);
    const del = document.createElement("button");
    del.type = "button"; del.textContent = "Usuń";
    del.addEventListener("click", () => { list.splice(idx, 1); setLib(list); renderLib(); });
    li.append(box, del);
    ul.append(li);
  });
}

function say(text, ok) { const m = $("msg"); m.textContent = text; m.className = "msg " + (ok ? "ok" : "bad"); }

$("add").addEventListener("click", () => {
  const iv = validateInterval();
  if (!iv) return;
  intervals.push(iv); render(); say("", true);
});
$("ftp").addEventListener("input", render);
$("clear").addEventListener("click", () => {
  intervals = []; $("name").value = ""; mark($("name"), $("err-name"), ""); $("err-int").textContent = ""; say("", true); render();
});

$("workout-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("name").value.trim();
  let ok = true;
  mark($("name"), $("err-name"), name ? "" : "Podaj nazwę treningu.");
  if (!name) ok = false;
  if (!intervals.length) { $("err-int").textContent = "Dodaj co najmniej jeden interwał."; ok = false; }
  if (!(ftp() >= 50 && ftp() <= 600)) { mark($("ftp"), null, "x"); ok = false; } else mark($("ftp"), null, "");
  if (!ok) { say("Nie zapisano: popraw zaznaczone pola.", false); return; }
  const list = getLib();
  list.unshift({ name, ftp: ftp(), intervals: intervals.map((i) => ({ ...i })), created: new Date().toISOString() });
  if (!setLib(list)) { say("Nie można zapisać w pamięci przeglądarki.", false); return; }
  say(`Zapisano trening „${name}”.`, true);
  intervals = []; $("name").value = ""; $("err-int").textContent = ""; render(); renderLib();
});

render(); renderLib();
