/* روزشمار شمسی — هسته‌ی مشترک (تقویم شمسی، قمری رسمی، محاسبات، مناسبت‌ها، تم)
 * طراحی و توسعه : علی شکری — © ۱۴۰۵ کلیه‌ی حقوق محفوظ است */
"use strict";

const APP_VERSION = "2.9";

// ---------- تقویم شمسی (همان الگوریتم نسخه‌ی اندروید) ----------
const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;
function jalCal(jy) {
  let gy = jy + 621, leapJ = -14, jp = BREAKS[0], jm, jump = 0, leap, leapG, march, n, i;
  for (i = 1; i < BREAKS.length; i++) {
    jm = BREAKS[i]; jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gm = mod(div(i, 153), 12) + 1;
  return [div(j, 1461) - 100100 + div(8 - gm, 6), gm, div(mod(i, 153), 5) + 1];
}
function d2j(jdn) {
  let gy = d2g(jdn)[0], jy = gy - 621, r = jalCal(jy), k = jdn - g2d(gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return [jy, 1 + div(k, 31), mod(k, 31) + 1];
    k -= 186;
  } else {
    jy -= 1; k += 179;
    if (r.leap === 1) k += 1;
  }
  return [jy, 7 + div(k, 30), mod(k, 30) + 1];
}
const J = {
  toJdn(jy, jm, jd) { const r = jalCal(jy); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; },
  fromJdn: d2j,
  gregorianFromJdn: d2g,
  gregorianJdn: g2d,
  monthLength(jy, jm) { if (jm <= 6) return 31; if (jm <= 11) return 30; return jalCal(jy).leap === 0 ? 30 : 29; },
  weekColumn(jdn) { return mod(mod(jdn, 7) + 2, 7); },          // شنبه = ۰ ... جمعه = ۶
  todayJdn() { const d = new Date(); return g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()); },
};

// ---------- قمری رسمی ایران (۱۴۰۰ تا ۱۴۱۱)؛ بیرون از آن محاسباتی ----------
const H_STARTS = [2459289, 2459319, 2459348, 2459378, 2459408, 2459437, 2459466, 2459496, 2459526, 2459555, 2459584, 2459614, 2459643, 2459673, 2459703, 2459732, 2459762, 2459791, 2459821, 2459851, 2459880, 2459910, 2459939, 2459968, 2459998, 2460028, 2460057, 2460086, 2460116, 2460146, 2460175, 2460205, 2460235, 2460265, 2460294, 2460324, 2460353, 2460382, 2460412, 2460441, 2460470, 2460500, 2460529, 2460559, 2460589, 2460619, 2460648, 2460678, 2460707, 2460737, 2460766, 2460796, 2460825, 2460854, 2460884, 2460913, 2460943, 2460973, 2461003, 2461032, 2461062, 2461091, 2461121, 2461150, 2461179, 2461208, 2461238, 2461267, 2461296, 2461326, 2461356, 2461386, 2461416, 2461445, 2461475, 2461504, 2461534, 2461563, 2461593, 2461622, 2461651, 2461681, 2461710, 2461740, 2461770, 2461799, 2461829, 2461859, 2461889, 2461918, 2461948, 2461977, 2462007, 2462036, 2462065, 2462095, 2462124, 2462154, 2462183, 2462213, 2462243, 2462272, 2462302, 2462332, 2462361, 2462391, 2462420, 2462449, 2462479, 2462508, 2462538, 2462567, 2462597, 2462626, 2462656, 2462686, 2462716, 2462745, 2462775, 2462804, 2462833, 2462863, 2462892, 2462922, 2462951, 2462981, 2463010, 2463040, 2463070, 2463100, 2463129, 2463158, 2463188, 2463217, 2463247, 2463276, 2463306, 2463335, 2463364, 2463394, 2463424, 2463454, 2463483, 2463513, 2463542, 2463572, 2463601, 2463631, 2463660];
const H_YM = [144208, 144209, 144210, 144211, 144212, 144301, 144302, 144303, 144304, 144305, 144306, 144307, 144308, 144309, 144310, 144311, 144312, 144401, 144402, 144403, 144404, 144405, 144406, 144407, 144408, 144409, 144410, 144411, 144412, 144501, 144502, 144503, 144504, 144505, 144506, 144507, 144508, 144509, 144510, 144511, 144512, 144601, 144602, 144603, 144604, 144605, 144606, 144607, 144608, 144609, 144610, 144611, 144612, 144701, 144702, 144703, 144704, 144705, 144706, 144707, 144708, 144709, 144710, 144711, 144712, 144801, 144802, 144803, 144804, 144805, 144806, 144807, 144808, 144809, 144810, 144811, 144812, 144901, 144902, 144903, 144904, 144905, 144906, 144907, 144908, 144909, 144910, 144911, 144912, 145001, 145002, 145003, 145004, 145005, 145006, 145007, 145008, 145009, 145010, 145011, 145012, 145101, 145102, 145103, 145104, 145105, 145106, 145107, 145108, 145109, 145110, 145111, 145112, 145201, 145202, 145203, 145204, 145205, 145206, 145207, 145208, 145209, 145210, 145211, 145212, 145301, 145302, 145303, 145304, 145305, 145306, 145307, 145308, 145309, 145310, 145311, 145312, 145401, 145402, 145403, 145404, 145405, 145406, 145407, 145408, 145409, 145410, 145411, 145412];

function hijriTabular(jdn) {
  let l = jdn - 1948440 + 10632;
  const n = div(l - 1, 10631);
  l = l - 10631 * n + 354;
  const j = div(10985 - l, 5316) * div(50 * l, 17719) + div(l, 5670) * div(43 * l, 15238);
  l = l - div(30 - j, 15) * div(17719 * j, 50) - div(j, 16) * div(15238 * j, 43) + 29;
  const m = div(24 * l, 709), d = l - div(709 * m, 24), y = 30 * n + j - 30;
  return [y, m, d];
}
function hijriFromJdn(jdn) {
  if (jdn >= H_STARTS[0] && jdn < H_STARTS[H_STARTS.length - 1] + 30) {
    let lo = 0, hi = H_STARTS.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (H_STARTS[mid] <= jdn) lo = mid; else hi = mid - 1; }
    const day = jdn - H_STARTS[lo] + 1;
    if (day >= 1 && day <= 30) return [div(H_YM[lo], 100), H_YM[lo] % 100, day, 1];
  }
  const t = hijriTabular(jdn);
  return [t[0], t[1], t[2], 0];
}

// ---------- نام‌ها و قالب‌بندی ----------
const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const WD = ["شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"];
const HEADS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
const HEADS_EN = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
const G_MONTHS = ["ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن", "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر"];
const H_MONTHS = ["محرم", "صفر", "ربیع‌الاول", "ربیع‌الثانی", "جمادی‌الاول", "جمادی‌الثانی", "رجب", "شعبان", "رمضان", "شوال", "ذی‌القعده", "ذی‌الحجه"];
const SEASONS = ["بهار", "تابستان", "پاییز", "زمستان"];
const FA = "۰۱۲۳۴۵۶۷۸۹", AR = "٠١٢٣٤٥٦٧٨٩";
const fa = s => String(s).replace(/[0-9]/g, d => FA[+d]);
const en = s => String(s).replace(/[۰-۹]/g, d => FA.indexOf(d)).replace(/[٠-٩]/g, d => AR.indexOf(d));
const pad2 = n => (n < 10 ? "0" : "") + n;
const fmtJ = j => fa(j[0] + "/" + pad2(j[1]) + "/" + pad2(j[2]));
const gregText = jdn => { const g = d2g(jdn); return fa(g[2]) + " " + G_MONTHS[g[1] - 1] + " " + fa(g[0]); };
const gregNum = jdn => { const g = d2g(jdn); return fa(g[0] + "/" + pad2(g[1]) + "/" + pad2(g[2])); };
const hijriText = jdn => { const h = hijriFromJdn(jdn); return fa(h[2]) + " " + H_MONTHS[h[1] - 1] + " " + fa(h[0]) + (h[3] ? "" : " (محاسباتی)"); };

// ---------- محاسبات (همان DateEngine اندروید) ----------
const UNIT_DAY = 0, UNIT_WEEK = 1, UNIT_MONTH = 2, MAX_WORKING_DAYS = 36500;
const Engine = {
  isOff(jdn, holidayOf, missing, thursdayOff) {
    const col = J.weekColumn(jdn);
    if (col === 6 || (thursdayOff && col === 5)) return true;
    const j = d2j(jdn), h = holidayOf(j[0], j[1], j[2]);
    if (h === null) { missing.v = true; return false; }
    return h;
  },
  addMonths(jdn, n) {
    const j = d2j(jdn), m0 = j[1] - 1 + n, y = j[0] + Math.floor(m0 / 12), m = m0 - Math.floor(m0 / 12) * 12 + 1;
    return J.toJdn(y, m, Math.min(j[2], J.monthLength(y, m)));
  },
  compute(today, n, unit, working, thursdayOff, holidayOf) {
    const r = { jdn: today, calendarDays: 0, missing: false };
    if (unit === UNIT_WEEK) r.jdn = today + 7 * n;
    else if (unit === UNIT_MONTH) r.jdn = Engine.addMonths(today, n);
    else if (working && n !== 0) {
      const miss = { v: false }; let left = Math.min(Math.abs(n), MAX_WORKING_DAYS), dir = n > 0 ? 1 : -1, d = today;
      while (left > 0) { d += dir; if (!Engine.isOff(d, holidayOf, miss, thursdayOff)) left--; }
      r.jdn = d; r.missing = miss.v;
    } else r.jdn = today + n;
    r.calendarDays = r.jdn - today;
    return r;
  },
  workingDaysBetween(a, b, holidayOf, missing, thursdayOff) {
    const lo = Math.min(a, b), hi = Math.max(a, b); let c = 0;
    for (let d = lo + 1; d <= hi; d++) if (!Engine.isOff(d, holidayOf, missing, thursdayOff)) c++;
    return c;
  },
  monthsAndDays(a, b) {
    const lo = Math.min(a, b), hi = Math.max(a, b); let m = 0;
    while (Engine.addMonths(lo, m + 1) <= hi) m++;
    return [m, hi - Engine.addMonths(lo, m)];
  },
  age(birth, today) { const md = Engine.monthsAndDays(birth, today); return [div(md[0], 12), md[0] % 12, md[1]]; },
  nextBirthday(bm, bd, today) {
    const ty = d2j(today)[0];
    for (let y = ty; y <= ty + 1; y++) { const j = J.toJdn(y, bm, Math.min(bd, J.monthLength(y, bm))); if (j >= today) return j; }
    return J.toJdn(ty + 1, bm, Math.min(bd, J.monthLength(ty + 1, bm)));
  },
  parseDate(raw) {
    const p = en(String(raw || "")).replace(/[^0-9]+/g, " ").trim().split(" ").filter(Boolean);
    let y, m, d;
    if (p.length === 1 && p[0].length === 8) { y = +p[0].slice(0, 4); m = +p[0].slice(4, 6); d = +p[0].slice(6, 8); }
    else if (p.length === 3) {
      if (p[0].length >= 3) { y = +p[0]; m = +p[1]; d = +p[2]; }
      else if (p[2].length >= 3) { y = +p[2]; m = +p[1]; d = +p[0]; }
      else return null;
    } else return null;
    if (!(y >= 1 && y <= 3000 && m >= 1 && m <= 12 && d >= 1 && d <= J.monthLength(y, m))) return null;
    return [y, m, d];
  },
};

// ---------- مناسبت‌ها: داخل برنامه (۱۴۰۰ تا ۱۴۱۱) + دریافت سال‌های دیگر ----------
const Events = {
  mem: {}, pending: {},
  SOURCES: ["https://cdn.jsdelivr.net/gh/alirezadesh/jalali_calendar@main/{Y}_data.json",
            "https://raw.githubusercontent.com/alirezadesh/jalali_calendar/main/{Y}_data.json"],
  /** داده‌ی سال اگر همین حالا در دسترس باشد (بدون انتظار)؛ وگرنه null */
  peek(y) {
    if (this.mem[y]) return this.mem[y];
    if (y >= 1400 && y <= 1411) return null;   // سال‌های داخل برنامه همیشه از فایل اصلاح‌شده‌ی خود برنامه
    try { const s = localStorage.getItem("ev-" + y); if (s) { this.mem[y] = JSON.parse(s); return this.mem[y]; } } catch (e) {}
    return null;
  },
  /** دریافت سال: اول فایل داخل برنامه، بعد منبع اینترنتی */
  load(y) {
    if (this.peek(y)) return Promise.resolve(this.mem[y]);
    if (this.pending[y]) return this.pending[y];
    const p = fetch("events-" + y + ".json").then(r => { if (!r.ok) throw 0; return r.json(); })
      .catch(() => this.download(y))
      .then(d => { this.mem[y] = d; return d; })
      .finally(() => { delete this.pending[y]; });
    this.pending[y] = p;
    return p;
  },
  async download(y) {
    for (const src of this.SOURCES) {
      try {
        const r = await fetch(src.replace("{Y}", y));
        if (!r.ok) continue;
        const d = this.convert(await r.json(), y);
        try { localStorage.setItem("ev-" + y, JSON.stringify(d)); } catch (e) {}
        return d;
      } catch (e) { /* منبع بعدی */ }
    }
    throw new Error("offline");
  },
  convert(days, y) {
    if (!Array.isArray(days) || days.length < 365) throw new Error("incomplete");
    const out = {}, prefix = String(y).padStart(4, "0") + "-";
    for (const d of days) {
      const date = String(d.date || "");
      if (!date.startsWith(prefix) || date.length !== 10) throw new Error("wrong date");
      const key = date.slice(5, 7) + date.slice(8, 10), uniq = new Map();
      for (const e of d.events || []) {
        const desc = String(e.description || "").replace(/\s+/g, " ").trim();
        if (!desc || desc === "جمعه") continue;
        uniq.set(desc, !!(uniq.get(desc)) || !!e.is_holiday);
      }
      const evs = [...uniq].map(([t, h]) => [t, h ? 1 : 0]);
      if (evs.length || d.is_holiday) out[key] = [d.is_holiday ? 1 : 0, evs];
    }
    return out;
  },
  day(data, m, d) {
    const v = data && data[pad2(m) + pad2(d)];
    if (!v) return { holiday: false, events: [] };
    return { holiday: v[0] === 1, events: (v[1] || []).map(e => ({ text: e[0], holiday: e[1] === 1 })) };
  },
  /** برای شمارش روزهای کاری: true/false یا null اگر داده‌ی سال نباشد */
  holidayOf(y, m, d) { const data = Events.peek(y); return data ? Events.day(data, m, d).holiday : null; },
};

// ---------- تم ----------
const PRESETS = [
  ["آبی", "#1565C0", "#F4F6FA"], ["سبز", "#2E7D32", "#F1F8E9"], ["فیروزه‌ای", "#00838F", "#E0F7FA"], ["بنفش", "#6A1B9A", "#F3E5F5"],
  ["نارنجی", "#EF6C00", "#FFF8E1"], ["صورتی", "#AD1457", "#FCE4EC"], ["قرمز", "#C62828", "#FFEBEE"], ["قهوه‌ای", "#5D4037", "#EFEBE9"],
  ["نیلی", "#283593", "#E8EAF6"], ["زیتونی", "#558B2F", "#F9FBE7"], ["خاکستری", "#455A64", "#ECEFF1"], ["تیره", "#42A5F5", "#263238"],
  ["مشکی", "#FFB300", "#000000"], ["شب بنفش", "#CE93D8", "#1E1528"], ["شب جنگل", "#81C784", "#142218"], ["شب اقیانوس", "#4DD0E1", "#0D1F2A"]];
const rgb = h => { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
const hex = c => "#" + c.map(x => ("0" + Math.round(x).toString(16)).slice(-2)).join("");
const blend = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex([0, 1, 2].map(i => x[i] + (y[i] - x[i]) * t)); };
const isDark = h => { const c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255 < 0.5; };
const store = {
  get(k, def) { try { const v = localStorage.getItem("rs-" + k); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem("rs-" + k, JSON.stringify(v)); } catch (e) {} },
};
function themeColors() {
  const t = store.get("theme", { accent: "#1565C0", bg: "#F4F6FA" });
  const dark = isDark(t.bg), text = dark ? "#ECEFF1" : "#37474F";
  return { accent: t.accent, bg: t.bg, dark, text, muted: blend(text, t.bg, .45), accentText: dark ? blend(t.accent, "#FFFFFF", .35) : t.accent,
    input: dark ? blend(t.bg, "#FFFFFF", .08) : "#FFFFFF", inputStroke: blend(text, t.bg, .65), fill: blend(t.bg, t.accent, dark ? .25 : .12),
    fillStroke: blend(t.bg, t.accent, .45), holiday: dark ? "#EF9A9A" : "#D32F2F", onAccent: isDark(t.accent) ? "#FFFFFF" : "#212121" };
}
function applyThemeVars(root = document.documentElement) {
  const c = themeColors();
  const set = (k, v) => root.style.setProperty(k, v);
  set("--accent", c.accent); set("--bg", c.bg); set("--text", c.text); set("--muted", c.muted); set("--accent-text", c.accentText);
  set("--input", c.input); set("--input-stroke", c.inputStroke); set("--fill", c.fill); set("--fill-stroke", c.fillStroke);
  set("--holiday", c.holiday); set("--on-accent", c.onAccent);
  root.style.colorScheme = c.dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = c.bg;
  return c;
}

// ---------- نام توسعه‌دهنده (رمزشده) ----------
const Credit = (() => {
  const K = 0x5B, DEV = [1634, 1567, 1687, 123, 1647, 1778, 1642, 1687];
  const dev = () => DEV.map(v => String.fromCharCode(v ^ K)).join("");
  return { dev, line: () => "طراحی و توسعه : " + dev(), copyright: () => "© ۱۴۰۵ " + dev() + " — کلیه‌ی حقوق محفوظ است" };
})();

// ---------- کمکی‌های صفحه ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove("show"), 2200);
}
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; } catch (e) {}
  try { const ta = document.createElement("textarea"); ta.value = s; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch (e) { return false; }
}
function registerSW() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost") && window.top === window.self) navigator.serviceWorker.register("sw.js").catch(() => {});
}
