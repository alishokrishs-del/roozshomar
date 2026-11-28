/* روزشمار شمسی — صفحه‌ی اصلی (محاسبه‌گر) */
"use strict";

const MAX_DAYS = 365000;
const S = {
  unit: store.get("unit", UNIT_DAY), working: store.get("working", false), thursday: store.get("thursday", false),
  today: J.todayJdn(), cur: null, n: 0, rel: "", seq: 0, histTimer: 0,
  inc: store.get("inc", false),   // خود روز شروع هم روز اول شمارش باشد
  base: 0,   // روز شروع شمارش: ۰ یعنی «امروز»؛ وگرنه شماره‌ی روز (JDN) انتخاب‌شده از تقویم
};
const baseJdn = () => S.base || S.today;
const el = id => document.getElementById(id);

function maxForUnit() {
  if (S.unit === UNIT_WEEK) return Math.floor(MAX_DAYS / 7);
  if (S.unit === UNIT_MONTH) return 12000;
  if (S.working) return MAX_WORKING_DAYS;
  return MAX_DAYS;
}
function readN() {
  const t = en(el("days").value.trim()).replace(/[−–]/g, "-");
  if (!t || t === "-" || t === "+") return { empty: true };
  if (!/^[-+]?\d+$/.test(t)) return { bad: true };
  const n = parseInt(t, 10);
  return Math.abs(n) > maxForUnit() ? { bad: true } : { n };
}

// ---------- محاسبه و نمایش ----------
function update() {
  const seq = ++S.seq;
  clearTimeout(S.histTimer);
  S.cur = null;
  ["wd", "rel", "greg", "hijri", "copied"].forEach(i => el(i).textContent = "");
  el("wd").classList.remove("red");
  el("events").hidden = true;
  setPeek(null);
  el("result").classList.remove("err");
  const v = readN();
  if (v.empty) { el("result").textContent = ""; refreshActions(); return; }
  if (v.bad) { el("result").textContent = "عدد خارج از محدوده است"; el("result").classList.add("err"); refreshActions(); return; }
  const n = v.n, working = S.working && S.unit === UNIT_DAY;
  const r = computeFromBase(n, working);
  if (r.missing) {
    // تعطیلات سال‌های لازم هنوز خوانده نشده: بخوان و دوباره حساب کن
    const y0 = d2j(baseJdn())[0], y1 = d2j(r.jdn)[0] + (n > 0 ? 1 : 0), ys = [];
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1) && ys.length < 30; y++) if (!Events.peek(y)) ys.push(y);
    if (ys.length && !update.tried[ys.join()]) {
      update.tried[ys.join()] = 1;
      Promise.allSettled(ys.map(y => Events.load(y))).then(() => { if (seq === S.seq) update(); });
    }
  }
  const j = d2j(r.jdn), col = J.weekColumn(r.jdn);
  S.cur = r.jdn; S.n = n;
  el("result").textContent = fmtJ(j);
  el("wd").textContent = "روز هفته : " + WD[col];
  el("wd").classList.toggle("red", col === 6);
  S.rel = relativeLine(n, r, working);
  el("rel").textContent = S.rel;
  el("greg").replaceChildren("میلادی : ", h("span", { class: "en", dir: "ltr" }, gregText(r.jdn)));
  el("hijri").textContent = "قمری : " + hijriText(r.jdn);
  el("copied").textContent = "برای کپی، روی تاریخ بزنید";
  refreshActions();
  showEvents(seq, j);
  S.histTimer = setTimeout(addHistory, 900);
}
update.tried = {};

function relativeLine(n, r, working) {
  const fromToday = !S.base, from = fromToday ? "امروز" : fmtJ(d2j(S.base));
  let tail = "";
  if (!fromToday) {
    const dt = r.jdn - S.today;
    tail = "\n" + (dt === 0 ? "یعنی امروز" : "یعنی " + fa(Math.abs(dt)) + " روز " + (dt > 0 ? "بعد" : "قبل") + " از امروز");
  }
  if (n === 0) return fromToday ? "امروز" : "همان روز شروع شمارش (" + from + ")" + tail;
  const inc = S.inc, incNote = fromToday ? "با احتساب خود امروز" : "با احتساب خود روز شروع", extra = inc ? "، " + incNote : "";
  const dir = (inc ? (n > 0 ? " از " : " تا ") : (n > 0 ? " بعد از " : " قبل از ")) + from, num = fa(Math.abs(n)), days = fa(Math.abs(r.calendarDays) + (inc ? 1 : 0));
  if (S.unit === UNIT_WEEK) return num + " هفته" + dir + " (" + days + " روز" + extra + ")" + tail;
  if (S.unit === UNIT_MONTH) return num + " ماه" + dir + " (" + days + " روز" + extra + ")" + tail;
  if (working) {
    let t = num + " روز کاری" + dir + " (" + days + " روز تقویمی" + (S.thursday ? "، بدون پنج‌شنبه‌ها" : "") + extra + ")" + tail;
    if (r.missing) t += "\nتعطیلات رسمی این سال در دسترس نیست؛ فقط جمعه‌ها حساب شد";
    return t;
  }
  return num + " روز" + dir + (inc ? " (" + incNote + ")" : "") + tail;
}

// محاسبه از روز شروع؛ با تیک «خود روز شروع هم شمرده شود»، خود آن روز روز اول شمارش است
function computeFromBase(n, working) {
  const base = baseJdn();
  if (!S.inc || n === 0) return Engine.compute(base, n, S.unit, working, S.thursday, Events.holidayOf);
  const dir = n > 0 ? 1 : -1;
  let r;
  if (working) r = Engine.compute(base - dir, n, S.unit, true, S.thursday, Events.holidayOf);   // اگر خود روز شروع کاری باشد، روز اول است
  else { r = Engine.compute(base, n, S.unit, false, S.thursday, Events.holidayOf); r.jdn -= dir; }
  r.calendarDays = r.jdn - base;
  return r;
}

// ---------- روز شروع شمارش ----------
function paintBase() {
  const custom = !!S.base, b = custom ? d2j(S.base) : null;
  el("baseBtn").textContent = "شروع از : " + (custom ? fa(b[2]) + " " + MONTHS[b[1] - 1] + (b[0] === d2j(S.today)[0] ? "" : " " + fa(b[0])) : "امروز");
  el("baseBtn").classList.toggle("on", custom);
  el("baseClear").hidden = !custom;
  el("incTxt").textContent = custom ? "خود روز شروع (" + fa(b[2]) + " " + MONTHS[b[1] - 1] + ") هم جزو شمارش باشد" : "خود امروز هم جزو شمارش باشد";
}
function setBase(jdn) {
  S.base = (!jdn || jdn === S.today) ? 0 : jdn;
  paintBase(); update();
}
function openBase() {
  el("days").blur();
  pickDate(S.base || null, j => setBase(j), "شمارش از چه روزی شروع شود؟");
}

// ---------- زبانه‌ها ----------
function selectTab(t) {
  S.tab = t;
  for (let i = 0; i < 4; i++) el("tab" + i).hidden = i !== t;
  $$("#tabbar button").forEach(b => b.classList.toggle("on", +b.dataset.t === t));
  if (t !== 0) el("days").blur();
  window.scrollTo(0, 0);
}
/** خلاصه‌ی مناسبت روز حاصل روی صفحه‌ی محاسبه و عدد کنار زبانه */
function setPeek(evs, msg) {
  const p = el("evPeek");
  if (msg) p.textContent = msg;
  else if (!evs) p.textContent = "";
  else if (!evs.length) p.textContent = "مناسبتی برای این روز ثبت نشده";
  else p.textContent = (evs.length > 1 ? "📅 " + fa(evs.length) + " مناسبت :  " : "• ") + fa(evs[0].text) + (evs[0].holiday ? " (تعطیل)" : "");
  el("tabEvName").textContent = "مناسبت‌ها" + (evs && evs.length ? " " + fa(evs.length) : "");
  el("evNone").hidden = S.cur !== null;
  if (S.cur !== null) { const j = d2j(S.cur); el("evTitle").textContent = "مناسبت‌های " + fa(j[2]) + " " + MONTHS[j[1] - 1] + " " + fa(j[0]); }
}

function showEvents(seq, j) {
  const box = el("events"), list = el("evList");
  const paint = data => {
    if (seq !== S.seq) return;
    const r = Events.day(data, j[1], j[2]);
    if (r.holiday) el("wd").classList.add("red");
    list.innerHTML = "";
    setPeek(r.events);
    if (!r.events.length) { box.hidden = false; list.append(h("div", { class: "msg" }, "مناسبتی برای این روز ثبت نشده .")); return; }
    r.events.forEach(e => list.append(h("div", { class: "ev" + (e.holiday ? " h" : "") }, "• " + fa(e.text) + (e.holiday ? " (تعطیل)" : ""))));
    box.hidden = false;
  };
  const data = Events.peek(j[0]);
  if (data) return paint(data);
  list.innerHTML = ""; list.append(h("div", { class: "msg" }, "در حال دریافت مناسبت‌های سال…")); box.hidden = false; setPeek(null, "در حال دریافت مناسبت‌ها…");
  Events.load(j[0]).then(paint).catch(() => {
    if (seq !== S.seq) return;
    list.innerHTML = ""; list.append(h("div", { class: "msg" }, "مناسبت‌های این سال در دسترس نیست؛ برای دریافت یک بار به اینترنت وصل شوید ."));
    setPeek(null, "مناسبت‌ها در دسترس نیست (بدون اینترنت)");
  });
}

function refreshActions() { el("shareBtn").disabled = el("remBtn").disabled = S.cur === null; }

function fullText() {
  const j = d2j(S.cur), lines = ["روزشمار شمسی", S.rel, "تاریخ : " + fmtJ(j) + " — " + WD[J.weekColumn(S.cur)], "میلادی : " + gregText(S.cur), "قمری : " + hijriText(S.cur)];
  const data = Events.peek(j[0]);
  if (data) { const r = Events.day(data, j[1], j[2]); if (r.events.length) { lines.push("مناسبت‌ها :"); r.events.forEach(e => lines.push("• " + fa(e.text) + (e.holiday ? " (تعطیل)" : ""))); } }
  return lines.join("\n");
}

// ---------- گزینه‌ها ----------
function paintOptions() {
  $$(".chip").forEach(c => c.classList.toggle("sel", +c.dataset.u === S.unit));
  const wEff = S.unit === UNIT_DAY, tEff = wEff && S.working;
  el("chkWork").classList.toggle("on", S.working); el("chkWork").classList.toggle("dim", !wEff);
  el("chkThu").classList.toggle("on", S.thursday); el("chkThu").classList.toggle("dim", !tEff);
  el("chkInc").classList.toggle("on", S.inc);
  el("chkInc").querySelector(".bx").textContent = S.inc ? "✓" : "";
  el("chkInc").setAttribute("aria-checked", S.inc);
  el("chkWork").querySelector(".bx").textContent = S.working ? "✓" : "";
  el("chkThu").querySelector(".bx").textContent = S.thursday ? "✓" : "";
  el("chkWork").setAttribute("aria-checked", S.working); el("chkThu").setAttribute("aria-checked", S.thursday);
}
function setInc(v) { S.inc = v; store.set("inc", v); paintOptions(); update(); }
function setUnit(u) { S.unit = u; store.set("unit", u); paintOptions(); update(); }
function setWorking(v) {
  S.working = v; store.set("working", v);
  if (v && S.unit !== UNIT_DAY) { S.unit = UNIT_DAY; store.set("unit", UNIT_DAY); }
  paintOptions(); update();
}
function setThursday(v) {
  S.thursday = v; store.set("thursday", v);
  if (v && !S.working) { S.working = true; store.set("working", true); if (S.unit !== UNIT_DAY) { S.unit = UNIT_DAY; store.set("unit", UNIT_DAY); } }
  paintOptions(); update();
}
function stepDays(dir) {
  const v = readN(), cur = v.n || 0, lim = maxForUnit();
  el("days").value = String(Math.max(-lim, Math.min(lim, cur + dir)));
  update();
}
function holdRepeat(btn, dir) {
  let t1 = 0, t2 = 0;
  const stop = () => { clearTimeout(t1); clearInterval(t2); };
  btn.addEventListener("pointerdown", e => {
    e.preventDefault(); stepDays(dir); stop();
    t1 = setTimeout(() => { t2 = setInterval(() => stepDays(dir), 70); }, 420);
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener("contextmenu", e => e.preventDefault());
}

// ---------- سابقه ----------
function queryText(o) {
  if (o.n === 0) return "امروز";
  const name = o.u === UNIT_WEEK ? " هفته" : o.u === UNIT_MONTH ? " ماه" : (o.w ? " روز کاری" : " روز");
  return fa(Math.abs(o.n)) + name + (o.n > 0 ? " بعد" : " قبل") + (o.w && o.th ? " (بدون پنج‌شنبه)" : "");
}
function addHistory() {
  if (S.cur === null) return;
  const w = S.working && S.unit === UNIT_DAY;
  const e = { n: S.n, u: S.unit, w, th: w && S.thursday, r: fmtJ(d2j(S.cur)) + " — " + WD[J.weekColumn(S.cur)], t: fmtJ(d2j(S.today)), b: S.base, inc: S.inc && S.n !== 0 };
  const out = [e];
  for (const o of store.get("history", [])) {
    if (out.length >= 30) break;
    if (o.n === e.n && o.u === e.u && o.w === e.w && o.th === e.th && (o.b || 0) === e.b && !!o.inc === e.inc) continue;
    out.push(o);
  }
  store.set("history", out);
}
function openHistory() {
  Sheet.push(function render(s) {
    s.append(h("h2", {}, "سابقه‌ی محاسبه‌ها"));
    const list = store.get("history", []);
    if (!list.length) s.append(h("div", { class: "muted", style: "font-size:15px;margin-top:8px" }, "هنوز محاسبه‌ای ثبت نشده است ."));
    list.forEach(o => s.append(h("div", { class: "hist", onclick: () => { Sheet.pop(); restore(o); } },
      h("b", {}, queryText(o) + (o.b ? " از " + fmtJ(d2j(o.b)) : "") + (o.inc ? " (با احتساب روز شروع)" : "")), h("div", {}, o.r + "   (محاسبه در " + o.t + ")"))));
    s.append(btnRow(pillBtn("پاک کردن سابقه", () => { store.set("history", []); Sheet.pop(); toast("سابقه پاک شد"); }), pillBtn("بستن", () => Sheet.pop())));
  });
}
function restore(o) {
  S.unit = Math.max(0, Math.min(2, o.u | 0));
  S.working = !!o.w && S.unit === UNIT_DAY;
  if (S.working) S.thursday = !!o.th;
  store.set("unit", S.unit); store.set("working", S.working); store.set("thursday", S.thursday);
  S.base = (o.b && o.b !== S.today) ? o.b : 0;
  if (o.n !== 0) { S.inc = !!o.inc; store.set("inc", S.inc); }
  paintBase();
  el("days").value = String(o.n);
  paintOptions(); update();
}

// ---------- اشتراک‌گذاری و یادآور ----------
async function share() {
  if (S.cur === null) return;
  const text = fullText();
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  toast(await copyText(text) ? "متن کامل کپی شد" : "کپی انجام نشد");
}
function reminder() {
  if (S.cur === null) return;
  const g = d2g(S.cur), d = g[0] + pad2(g[1]) + pad2(g[2]), j = d2j(S.cur);
  const esc = s => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, m => "\\" + m);
  const now = new Date(), stamp = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RoozShomar//FA", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    "UID:rs-" + d + "-" + now.getTime() + "@roozshomar", "DTSTAMP:" + stamp, "DTSTART:" + d + "T090000", "DTEND:" + d + "T100000",
    "SUMMARY:" + esc("یادآوری روزشمار — " + fmtJ(j) + " (" + WD[J.weekColumn(S.cur)] + ")"), "DESCRIPTION:" + esc(fullText()),
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", "DESCRIPTION:" + esc("روزشمار شمسی"), "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" }), url = URL.createObjectURL(blob);
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) location.href = url;     // آیفون: پنجره‌ی «افزودن به تقویم» باز می‌شود
  else { const a = h("a", { href: url, download: "roozshomar-" + d + ".ics" }); document.body.append(a); a.click(); a.remove(); }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ---------- فاصله‌ی دو تاریخ ----------
function dateText(jdn) { return fmtJ(d2j(jdn)) + "  —  " + WD[J.weekColumn(jdn)]; }
function loadYears(a, b) {
  const y0 = d2j(Math.min(a, b))[0], y1 = d2j(Math.max(a, b))[0], ys = [];
  for (let y = y0; y <= y1 && ys.length < 30; y++) if (!Events.peek(y)) ys.push(y);
  return ys.length ? Promise.allSettled(ys.map(y => Events.load(y))) : null;
}
function openDiff() {
  let from = store.get("diffFrom", S.today), to = store.get("diffTo", S.cur != null ? S.cur : S.today), th = store.get("diffTh", false), txt = "";
  Sheet.push(function render(s) {
    s.append(h("h2", {}, "فاصله‌ی دو تاریخ"));
    s.append(h("div", { class: "muted" }, "از تاریخ :"));
    s.append(h("button", { class: "datebtn", onclick: () => pickDate(from, j => { from = j; store.set("diffFrom", j); }) }, dateText(from), h("small", { class: "en" }, gregShort(from))));
    s.append(h("div", { class: "muted", style: "margin-top:10px" }, "تا تاریخ :"));
    s.append(h("button", { class: "datebtn", onclick: () => pickDate(to, j => { to = j; store.set("diffTo", j); }) }, dateText(to), h("small", { class: "en" }, gregShort(to))));
    const chk = h("div", { class: "check" + (th ? " on" : ""), style: "margin-top:12px", onclick: () => { th = !th; store.set("diffTh", th); Sheet.replace(render); } },
      h("span", { class: "bx" }, th ? "✓" : ""), h("span", {}, "پنج‌شنبه هم تعطیل حساب شود (برای روزهای کاری)"));
    s.append(chk);
    const box = h("div", { class: "box" });
    s.append(box);
    const paint = () => {
      const diff = to - from, abs = Math.abs(diff), out = [];
      if (diff === 0) out.push("هر دو تاریخ یک روز هستند .");
      else {
        out.push("فاصله : " + fa(abs) + " روز");
        if (diff < 0) out.push("(تاریخ دوم قبل از تاریخ اول است)");
        const w = Math.floor(abs / 7), d = abs % 7;
        if (w > 0) out.push("به هفته : " + fa(w) + " هفته" + (d > 0 ? " و " + fa(d) + " روز" : ""));
        const md = Engine.monthsAndDays(from, to);
        if (md[0] > 0) {
          const y = Math.floor(md[0] / 12), m = md[0] % 12, parts = [];
          if (y > 0) parts.push(fa(y) + " سال"); if (m > 0) parts.push(fa(m) + " ماه");
          out.push("به ماه : " + parts.join(" و ") + (md[1] > 0 ? " و " + fa(md[1]) + " روز" : ""));
        }
        if (abs <= MAX_WORKING_DAYS) {
          const miss = { v: false }, wd = Engine.workingDaysBetween(from, to, Events.holidayOf, miss, th);
          out.push("روزهای کاری : " + fa(wd) + " روز" + (th ? " (بدون پنج‌شنبه‌ها)" : ""));
          out.push("روزهای تعطیل : " + fa(abs - wd) + " روز");
          if (miss.v) out.push("(تعطیلات رسمی بعضی سال‌ها در دسترس نبود؛ فقط جمعه‌ها حساب شد)");
        }
        out.push("", "روز شروع حساب نمی‌شود و روز پایان حساب می‌شود .");
      }
      box.textContent = out.join("\n");
      txt = "از " + dateText(from) + " (" + gregShort(from) + ")\nتا " + dateText(to) + " (" + gregShort(to) + ")\n" + out.join("\n");
    };
    paint();
    const p = loadYears(from, to); if (p) p.then(() => { if (box.isConnected) paint(); });
    s.append(btnRow(pillBtn("کپی نتیجه", async () => toast(await copyText(txt) ? "نتیجه کپی شد" : "کپی انجام نشد"), true), pillBtn("بستن", () => Sheet.pop())));
  });
}

// ---------- محاسبه‌ی سن ----------
function openAge() {
  let txt = "";
  Sheet.push(function render(s) {
    s.append(h("h2", {}, "محاسبه‌ی سن"));
    s.append(h("div", { class: "muted" }, "تاریخ تولد (شمسی) :"));
    const inp = h("input", { class: "field", inputmode: "numeric", placeholder: "۱۳۷۰/۰۵/۱۲", autocomplete: "off" });
    inp.value = store.get("birth", "");
    const cal = h("button", { class: "calbtn", style: "height:54px;width:60px", "aria-label": "انتخاب از تقویم", html: CAL_SVG() });
    s.append(h("div", { style: "display:flex;gap:8px;margin-top:6px" }, inp, cal));
    s.append(h("div", { class: "muted", style: "margin-top:4px" }, "سال/ماه/روز ؛ یا از تقویم انتخاب کنید (روی سال و ماه بزنید تا فهرستشان باز شود)"));
    const box = h("div", { class: "box" });
    s.append(box);
    const paint = () => {
      const raw = inp.value.trim(); txt = ""; box.style.color = "";
      if (!raw) { box.textContent = "تاریخ تولد را وارد کنید ."; box.style.color = "var(--muted)"; return; }
      const b = Engine.parseDate(raw);
      if (!b) { box.textContent = "تاریخ کامل و درست نیست (مثلاً ۱۳۷۰/۰۵/۱۲) ."; box.style.color = "var(--muted)"; return; }
      const bj = J.toJdn(b[0], b[1], b[2]), t = S.today;
      if (bj > t) { box.textContent = "تاریخ تولد نمی‌تواند بعد از امروز باشد ."; box.style.color = "var(--holiday)"; return; }
      store.set("birth", raw);
      const a = Engine.age(bj, t), total = t - bj, out = [];
      out.push("سن : " + fa(a[0]) + " سال" + (a[1] > 0 ? " و " + fa(a[1]) + " ماه" : "") + (a[2] > 0 ? " و " + fa(a[2]) + " روز" : ""));
      out.push("مجموع : " + fa(total) + " روز (" + fa(Math.floor(total / 7)) + " هفته)");
      out.push("روز تولد : " + WD[J.weekColumn(bj)] + " " + fmtJ(b));
      out.push("میلادی : " + gregText(bj));
      out.push("قمری : " + hijriText(bj));
      const nb = Engine.nextBirthday(b[1], b[2], t), left = nb - t;
      if (left === 0) out.push("🎉 امروز تولد است ؛ تولدت مبارک !");
      else { out.push("تولد بعدی : " + fa(left) + " روز دیگر — " + fmtJ(d2j(nb)) + " (" + WD[J.weekColumn(nb)] + ")"); out.push("سن در تولد بعدی : " + fa(a[0] + 1) + " سال"); }
      // سطر میلادی با فونت سیستم (فونت برنامه رقم لاتین را فارسی نشان می‌دهد)
      const eng = gregText(bj);
      box.replaceChildren(...out.flatMap((ln, i) => {
        const k = ln.indexOf(eng), parts = k < 0 ? [ln] : [ln.slice(0, k), h("span", { class: "en", dir: "ltr" }, eng), ln.slice(k + eng.length)];
        return i ? ["\n", ...parts] : parts;
      }));
      txt = "تاریخ تولد : " + fmtJ(b) + "\n" + out.join("\n");
    };
    inp.addEventListener("input", paint);
    cal.addEventListener("click", () => {
      const b = Engine.parseDate(inp.value);
      pickDate(b ? J.toJdn(b[0], b[1], b[2]) : J.toJdn(d2j(S.today)[0] - 25, 1, 1), j => { inp.value = fmtJ(d2j(j)); store.set("birth", inp.value); });
    });
    paint();
    s.append(btnRow(pillBtn("کپی نتیجه", async () => { if (txt) toast(await copyText(txt) ? "نتیجه کپی شد" : "کپی انجام نشد"); }, true), pillBtn("بستن", () => Sheet.pop())));
  });
}

// ---------- شروع ----------
function paintToday() {
  S.today = J.todayJdn();
  el("today").textContent = "امروز : " + WD[J.weekColumn(S.today)] + " " + fmtJ(d2j(S.today));
  el("todayEn").textContent = gregText(S.today);
}
document.addEventListener("DOMContentLoaded", () => {
  const c = applyThemeVars();
  el("calBtn").innerHTML = CAL_SVG();
  el("baseCal").innerHTML = CAL_SVG();
  paintToday();
  paintBase();
  el("baseBtn").addEventListener("click", openBase);
  el("baseCal").addEventListener("click", openBase);
  el("baseClear").addEventListener("click", () => setBase(0));
  el("ver").textContent = "نسخه‌ی وب " + fa(APP_VERSION) + " — مخصوص آیفون و همه‌ی مرورگرها";
  el("credit").textContent = Credit.line();
  el("credit").addEventListener("click", openAbout);

  el("days").addEventListener("input", update);
  el("days").addEventListener("keydown", e => { if (e.key === "Enter") el("days").blur(); });
  holdRepeat(el("plus"), 1); holdRepeat(el("minus"), -1);
  $$(".chip").forEach(c => c.addEventListener("click", () => setUnit(+c.dataset.u)));
  el("chkInc").addEventListener("click", () => setInc(!S.inc));
  el("chkWork").addEventListener("click", () => setWorking(!S.working));
  el("chkThu").addEventListener("click", () => setThursday(!S.thursday));
  ["chkInc", "chkWork", "chkThu"].forEach(i => { el(i).setAttribute("role", "checkbox"); el(i).tabIndex = 0; });

  el("result").addEventListener("click", async () => {
    if (S.cur === null) return;
    const ok = await copyText(fmtJ(d2j(S.cur)));
    el("copied").textContent = ok ? "تاریخ «" + fmtJ(d2j(S.cur)) + "» کپی شد ✓" : "کپی انجام نشد";
  });
  el("calBtn").addEventListener("click", () => {
    el("days").blur();
    pickDate(S.cur, j => {
      // انتخاب از تقویم = فاصله به روز تقویمی
      S.unit = UNIT_DAY; S.working = false; store.set("unit", UNIT_DAY); store.set("working", false);
      let d = j - baseJdn();                      // فاصله از روز شروع شمارش
      if (S.inc && d !== 0) d += d > 0 ? 1 : -1;  // خود روز شروع هم شمرده می‌شود
      el("days").value = String(d);
      paintOptions(); update();
    });
  });
  el("shareBtn").addEventListener("click", share);
  el("remBtn").addEventListener("click", reminder);
  el("histBtn").addEventListener("click", openHistory);
  el("histTile").addEventListener("click", openHistory);
  el("evPeek").addEventListener("click", () => selectTab(1));
  $$("#tabbar button").forEach(b => b.addEventListener("click", () => selectTab(+b.dataset.t)));
  selectTab(0);
  el("diffBtn").addEventListener("click", openDiff);
  el("ageBtn").addEventListener("click", openAge);
  el("themeBtn").addEventListener("click", () => openTheme(() => { el("calBtn").innerHTML = CAL_SVG(); el("baseCal").innerHTML = CAL_SVG(); }));
  el("helpBtn").addEventListener("click", openHelp);

  paintOptions();
  update();
  Events.load(d2j(S.today)[0]).catch(() => {});
  document.addEventListener("visibilitychange", () => { if (!document.hidden && J.todayJdn() !== S.today) { paintToday(); if (S.base === S.today) S.base = 0; paintBase(); update(); } });
  registerSW();
  installHint();
});
