/* روزشمار شمسی — اجزای مشترک صفحه: پنجره‌ها، تقویم، تم، راهنما */
"use strict";

// ---------- پنجره‌های پایین‌صفحه (با پشته، برای باز شدن تقویم روی پنجره‌ی دیگر) ----------
const Sheet = {
  stack: [],
  push(render) { this.stack.push(render); this.show(); },
  replace(render) { this.stack[this.stack.length - 1] = render; this.show(); },
  pop() { this.stack.pop(); if (this.stack.length) this.show(); else $("#ov").classList.remove("open"); },
  closeAll() { this.stack = []; $("#ov").classList.remove("open"); },
  show() {
    const s = $("#sheet");
    s.innerHTML = "";
    this.stack[this.stack.length - 1](s);
    $("#ov").classList.add("open");
    s.scrollTop = 0;
  },
};
document.addEventListener("DOMContentLoaded", () => {
  const ov = $("#ov");
  if (ov) ov.addEventListener("click", e => { if (e.target === ov) Sheet.pop(); });
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && Sheet.stack.length) Sheet.pop(); });
function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v; else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  }
  for (const k of kids) if (k != null) e.append(k);
  return e;
}
function btnRow(...btns) { return h("div", { class: "row2" }, ...btns); }
function pillBtn(text, on, solid) { return h("button", { class: "pill" + (solid ? " solid" : ""), onclick: on }, text); }

const CAL_SVG = (c = "currentColor") => `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="${c}" stroke-width="2"/><rect x="3" y="5" width="18" height="5" fill="${c}"/><rect x="7" y="2" width="2" height="5" fill="${c}"/><rect x="15" y="2" width="2" height="5" fill="${c}"/><g fill="${c}"><rect x="6" y="12.5" width="3" height="3"/><rect x="10.5" y="12.5" width="3" height="3"/><rect x="15" y="12.5" width="3" height="3"/><rect x="6" y="16.5" width="3" height="3"/><rect x="10.5" y="16.5" width="3" height="3"/></g></svg>`;

// ---------- تقویم با انتخاب سریع سال و ماه ----------
function pickDate(selJdn, onPick, title) {
  const today = J.todayJdn(), tj = d2j(today), sj = d2j(selJdn != null ? selJdn : today);
  let vy = sj[0], vm = sj[1], mode = "days", page = Math.floor((vy - 1) / 20) * 20 + 1;
  Sheet.push(function render(s) {
    s.innerHTML = "";
    if (title) s.append(h("div", { class: "caltitle" }, title));
    const head = h("div", { class: "calhead" });
    const prev = h("button", { class: "arr", "aria-label": "قبلی", onclick: () => shift(-1) }, "›");
    const next = h("button", { class: "arr", "aria-label": "بعدی", onclick: () => shift(1) }, "‹");
    const mB = h("button", { class: mode === "months" ? "act" : "", onclick: () => { mode = mode === "months" ? "days" : "months"; render(s); } }, MONTHS[vm - 1] + " ▾");
    const yB = h("button", { class: mode === "years" ? "act" : "", onclick: () => { page = Math.floor((vy - 1) / 20) * 20 + 1; mode = mode === "years" ? "days" : "years"; render(s); } }, fa(vy) + " ▾");
    head.append(prev, h("div", { class: "tt" }, mB, yB), next);
    s.append(head);
    if (mode === "days") {
      const g = h("div", { class: "g7" });
      HEADS.forEach((x, i) => g.append(h("div", { class: "hd" + (i === 6 ? " f" : "") }, x, h("small", {}, HEADS_EN[i]))));
      const start = J.weekColumn(J.toJdn(vy, vm, 1)), len = J.monthLength(vy, vm), data = Events.peek(vy);
      for (let i = 0; i < 42; i++) {
        const d = i - start + 1;
        if (d < 1 || d > len) { if (i < 35 || start + len > 35) g.append(h("div", { class: "d" })); continue; }
        const red = i % 7 === 6 || (data && Events.day(data, vm, d).holiday);
        const cls = ["d", red ? "red" : "", (vy === tj[0] && vm === tj[1] && d === tj[2]) ? "now" : "", (vy === sj[0] && vm === sj[1] && d === sj[2] && selJdn != null) ? "sel" : ""].join(" ");
        g.append(h("button", { class: cls, onclick: () => { onPick(J.toJdn(vy, vm, d)); Sheet.pop(); } }, h("span", {}, fa(d))));
      }
      s.append(g);
      if (!data) Events.load(vy).then(() => { if (mode === "days") render(s); }).catch(() => {});
    } else if (mode === "months") {
      const g = h("div", { class: "gN", style: "grid-template-columns:repeat(3,1fr)" });
      MONTHS.forEach((x, i) => g.append(h("button", { class: (i + 1 === vm ? "sel " : "") + (vy === tj[0] && i + 1 === tj[1] ? "now" : ""), onclick: () => { vm = i + 1; mode = "days"; render(s); } }, x)));
      s.append(g);
    } else {
      const g = h("div", { class: "gN", style: "grid-template-columns:repeat(4,1fr)" });
      for (let i = 0; i < 20; i++) { const y = page + i; g.append(h("button", { class: (y === vy ? "sel " : "") + (y === tj[0] ? "now" : ""), onclick: () => { vy = y; mode = "months"; render(s); } }, fa(y))); }
      s.append(g);
    }
    s.append(h("button", { class: "calfoot", onclick: () => { vy = tj[0]; vm = tj[1]; mode = "days"; render(s); } }, "برو به ماه جاری"));
    function shift(dl) {
      if (mode === "years") { page = Math.max(1, page + dl * 20); }
      else if (mode === "months") { vy = Math.max(1, vy + dl); }
      else { vm += dl; if (vm < 1) { vm = 12; vy--; } if (vm > 12) { vm = 1; vy++; } }
      render(s);
    }
  });
}

// ---------- تم ----------
function openTheme(onChange) {
  const orig = store.get("theme", { accent: "#1565C0", bg: "#F4F6FA" });
  let cur = Object.assign({}, orig);
  const preview = () => { store.set("theme", cur); applyThemeVars(); if (onChange) onChange(); };
  Sheet.push(function render(s) {
    s.append(h("h2", {}, "تم و رنگ‌ها"));
    const g = h("div", { class: "presets" });
    PRESETS.forEach(([name, a, b]) => {
      const sel = cur.accent.toUpperCase() === a && cur.bg.toUpperCase() === b;
      g.append(h("button", { class: "preset" + (sel ? " sel" : ""), style: `background:${b};color:${isDark(b) ? "#ECEFF1" : "#37474F"}`,
        onclick: () => { cur = { accent: a, bg: b }; preview(); s.innerHTML = ""; render(s); } }, h("span", { class: "dot", style: `background:${a}` }), name));
    });
    s.append(g);
    const ca = h("input", { type: "color", value: cur.accent, style: "width:56px;height:40px;border:0;background:none" });
    const cb = h("input", { type: "color", value: cur.bg, style: "width:56px;height:40px;border:0;background:none" });
    ca.addEventListener("input", () => { cur = { accent: ca.value, bg: cur.bg }; preview(); });
    cb.addEventListener("input", () => { cur = { accent: cur.accent, bg: cb.value }; preview(); });
    s.append(h("div", { style: "display:flex;align-items:center;gap:10px;margin-top:14px;font-size:15px" }, "رنگ دلخواه :", ca, h("span", { class: "muted" }, "رنگ اصلی"), cb, h("span", { class: "muted" }, "پس‌زمینه")));
    s.append(btnRow(pillBtn("ذخیره", () => Sheet.pop(), true), pillBtn("انصراف", () => { cur = orig; preview(); Sheet.pop(); }),
      pillBtn("پیش‌فرض", () => { cur = { accent: "#1565C0", bg: "#F4F6FA" }; preview(); s.innerHTML = ""; render(s); })));
  });
}

// ---------- راهنما و درباره ----------
const HELP = [
  ["محاسبه‌ی تاریخ", "عدد را در «تعداد روز» بنویسید؛ عدد منفی یعنی روزهای گذشته. دکمه‌های + و − یک روز جلو و عقب می‌روند و با نگه داشتن، پشت سر هم. با زدن روی تاریخ، کپی می‌شود."],
  ["شمارش از یک روز دیگر", "کنار «تعداد روز» دکمه‌ی «شروع از : امروز» و یک تقویم هست. با زدن روی آن، روزی را که شمارش باید از آن شروع شود از تقویم انتخاب کنید؛ مثلاً ۱۰ روز بعد. از آن به بعد عدد کادر از همان روز شمرده می‌شود: ۵ یعنی ۵ روز بعد از آن روز و ۵- یعنی ۵ روز قبل از آن. زیر نتیجه هم نوشته می‌شود که تاریخ حاصل چند روز با امروز فاصله دارد. با دکمه‌ی ✕ شروع شمارش دوباره «امروز» می‌شود."],
  ["شمردن خود روز شروع", "با تیک «خود امروز (یا روز شروع) هم جزو شمارش باشد»، خود آن روز روز اول شمارش است؛ مثلاً ۵ روز از امروز یعنی امروز و ۴ روز بعدش، و تاریخ حاصل روز پنجم است. با روزهای کاری هم، اگر خود روز شروع کاری باشد، روز اول حساب می‌شود. نام انگلیسی روزهای هفته هم زیر حروف فارسی بالای تقویم‌ها نوشته شده است."],
  ["معادل انگلیسی", "زیر تاریخ امروز، در نتیجه‌ی محاسبه، صفحه‌ی امروز و فاصله‌ی دو تاریخ، معادل میلادی با روز هفته و ماه انگلیسی نوشته می‌شود؛ مثل Sunday, 13 December 2026."],
  ["واحد و روزهای کاری", "واحد را روی روز، هفته یا ماه بگذارید. «فقط روزهای کاری» جمعه‌ها و تعطیلات رسمی را نمی‌شمارد و «پنج‌شنبه هم تعطیل» پنج‌شنبه‌ها را هم کنار می‌گذارد."],
  ["زبانه‌ها", "همه‌چیز بدون پیمایش در چهار زبانه‌ی پایین صفحه است: «محاسبه» (تعداد روز، روز شروع و نتیجه)، «مناسبت‌ها» (مناسبت‌های روز حاصل؛ عدد کنارش تعداد مناسبت‌هاست)، «ابزارها» (فاصله‌ی دو تاریخ، محاسبه‌ی سن، سابقه و صفحه‌ی امروز) و «بیشتر» (تم و راهنما)."],
  ["تقویم", "با دکمه‌ی تقویم، روز دلخواه را انتخاب کنید. روی نام ماه یا سال بزنید تا فهرست ماه‌ها یا سال‌ها برای انتخاب سریع باز شود."],
  ["ابزارها", "اشتراک‌گذاری، یادآور (افزودن به تقویم آیفون)، سابقه‌ی ۳۰ محاسبه‌ی آخر، فاصله‌ی دو تاریخ و محاسبه‌ی سن."],
  ["نصب روی آیفون", "در Safari روی دکمه‌ی ••• کنار آدرس بزنید، بعد Share و «Add to Home Screen» را انتخاب کنید (در iOS قدیمی‌تر دکمه‌ی اشتراک‌گذاری مستقیم پایین صفحه است). برنامه بدون اینترنت هم کار می‌کند."],
  ["صفحه‌ی امروز (به‌جای ویجت)", "آیفون به برنامه‌های وب اجازه‌ی ساختن ویجت نمی‌دهد. به‌جایش «صفحه‌ی امروز» را باز کنید و آن را هم جداگانه به صفحه‌ی اصلی اضافه کنید تا با یک لمس، تاریخ امروز، تقویم و مناسبت‌ها را ببینید."],
  ["تم و مناسبت‌ها", "«تغییر تم و رنگ‌ها» ۱۶ تم آماده و رنگ دلخواه دارد. مناسبت‌های ۱۴۰۰ تا ۱۴۱۱ داخل برنامه است و سال‌های دیگر با اینترنت دریافت می‌شود."],
];
function openHelp() {
  Sheet.push(s => {
    s.append(h("h2", {}, "راهنمای روزشمار شمسی"));
    HELP.forEach(([t, b]) => { s.append(h("div", { style: "font-weight:700;margin-top:14px;font-size:16px" }, t)); s.append(h("div", { class: "muted", style: "font-size:14px;line-height:1.8;margin-top:2px" }, b)); });
    s.append(h("div", { class: "credit", style: "margin-top:18px" }, Credit.line()));
    s.append(btnRow(pillBtn("بستن", () => Sheet.pop())));
  });
}
function openAbout() {
  Sheet.push(s => {
    s.append(h("div", { style: "text-align:center" },
      h("div", { style: "font-size:22px;font-weight:700;color:var(--accent-text)" }, "روزشمار شمسی"),
      h("div", { class: "muted" }, "نسخه‌ی وب " + fa(APP_VERSION)),
      h("div", { style: "font-size:17px;font-weight:700;margin-top:14px" }, Credit.line()),
      h("div", { class: "muted", style: "margin-top:6px" }, Credit.copyright()),
      h("div", { class: "muted", style: "margin-top:6px" }, "هرگونه کپی، تغییر یا انتشار این برنامه به نام دیگران، بدون اجازه‌ی توسعه‌دهنده مجاز نیست .")));
    s.append(btnRow(pillBtn("بستن", () => Sheet.pop())));
  });
}

// ---------- راهنمای نصب در Safari (فقط وقتی هنوز نصب نشده) ----------
function installHint() {
  const standalone = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (standalone || !ios || window.top !== window.self || store.get("hintSeen", false)) return;
  store.set("hintSeen", true);
  setTimeout(() => toast("برای نصب: در Safari ••• ← Share ← Add to Home Screen"), 1200);
}
