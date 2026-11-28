/* روزشمار شمسی — صفحه‌ی امروز (شیشه‌ای، به‌جای ویجت در آیفون) */
"use strict";

const DEFAULT_ORDER = ["hero", "dates", "calendar", "events", "buttons"];
const T = { today: J.todayJdn(), sel: 0, vy: 0, vm: 0, order: [], cards: {} };
T.sel = T.today; [T.vy, T.vm] = d2j(T.today);

// ---------- ظاهر: شفافیت، رنگ شیشه، پس‌زمینه ----------
function applyLook() {
  const c = applyThemeVars(), body = document.body;
  const tr = store.get("tAlpha", 60), tone = store.get("tTone", "dark");
  body.classList.toggle("light", tone === "light");
  body.style.setProperty("--g-a", (0.85 - tr / 100 * 0.8).toFixed(3));
  body.style.setProperty("--g-blur", Math.round(24 - tr * 0.12) + "px");
  body.style.setProperty("--g-title", tone === "light" ? (c.dark ? blend(c.accent, "#000000", .35) : c.accent) : blend(c.accent, "#FFFFFF", .55));
  let wall = null; try { wall = localStorage.getItem("rs-wall"); } catch (e) {}
  const w = $("#wall"), a = c.accent;
  if (wall) { w.style.background = `center/cover no-repeat url("${wall}")`; }
  else if (tone === "light") {
    w.style.background = `radial-gradient(60% 45% at 12% 8%, ${blend(a, "#FFFFFF", .25)} 0, transparent 70%), radial-gradient(55% 40% at 92% 30%, ${blend(a, "#FF80AB", .55)} 0, transparent 70%),
      radial-gradient(70% 45% at 30% 75%, ${blend(a, "#80DEEA", .5)} 0, transparent 70%), radial-gradient(50% 35% at 90% 95%, ${blend(a, "#FFD180", .5)} 0, transparent 70%), #EEF2F8`;
  } else {
    w.style.background = `radial-gradient(60% 45% at 12% 8%, ${a} 0, transparent 70%), radial-gradient(55% 40% at 92% 30%, ${blend(a, "#E040FB", .55)} 0, transparent 70%),
      radial-gradient(70% 45% at 30% 75%, ${blend(a, "#00BFA5", .5)} 0, transparent 70%), radial-gradient(50% 35% at 90% 95%, ${blend(a, "#FF6E40", .45)} 0, transparent 70%), #0B1220`;
  }
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = tone === "light" ? "#EEF2F8" : "#0B1220";
}

// ---------- ساخت بخش‌ها ----------
function card(k, cls) { const c = h("section", { class: "gc " + cls, "data-k": k }); T.cards[k] = c; return c; }
function buildSections() {
  const box = $("#sections");
  card("hero", "hero"); card("dates", "dates"); card("calendar", "calc"); card("events", "events"); card("buttons", "btns");
  let order = store.get("tOrder", DEFAULT_ORDER);
  order = order.filter(k => DEFAULT_ORDER.includes(k)); DEFAULT_ORDER.forEach(k => { if (!order.includes(k)) order.push(k); });
  T.order = order;
  box.innerHTML = ""; order.forEach(k => box.append(T.cards[k]));

  const b = T.cards.buttons;
  b.append(h("a", { href: "index.html" }, "باز کردن روزشمار"), h("button", { onclick: share }, "اشتراک‌گذاری"));
  const cal = T.cards.calendar;
  cal.append(h("div", { class: "ch" },
    h("button", { "aria-label": "ماه قبل", onclick: () => shiftMonth(-1) }, "›"),
    h("button", { class: "mt", id: "mt", onclick: goToday }),
    h("button", { "aria-label": "ماه بعد", onclick: () => shiftMonth(1) }, "‹")));
  const wk = h("div", { class: "wk" }); HEADS.forEach((x, i) => wk.append(h("div", { class: i === 6 ? "f" : "" }, x, h("small", {}, HEADS_EN[i])))); cal.append(wk);
  const gr = h("div", { class: "gr", id: "grid" });
  for (let i = 0; i < 42; i++) gr.append(h("button", { class: "c", "data-i": i, onclick: () => pickCell(i) }, h("span"), h("i")));
  cal.append(gr);
  swipe(cal, dir => shiftMonth(dir));
}

function yearData(y) {
  const d = Events.peek(y);
  if (!d) Events.load(y).then(() => renderAll()).catch(() => { T.offline = T.offline || {}; if (!T.offline[y]) { T.offline[y] = 1; renderAll(); } });
  return d;
}

function renderAll() { renderDay(); renderMonth(); }

function renderDay() {
  const j = d2j(T.sel), col = J.weekColumn(T.sel), data = yearData(j[0]);
  const res = data ? Events.day(data, j[1], j[2]) : null, hol = col === 6 || (res && res.holiday);
  const hero = T.cards.hero, diff = T.sel - T.today;
  hero.innerHTML = "";
  const chip = h("span", { class: "chip2", onclick: goToday }, diff === 0 ? "امروز" : fa(Math.abs(diff)) + (diff > 0 ? " روز بعد" : " روز قبل") + "  •  برگشت به امروز");
  hero.append(h("div", { class: "big" }, fa(j[2])), h("div", { class: "sep" }),
    h("div", { class: "info" }, h("div", { class: "wdn" + (hol ? " red" : "") }, WD[col] + (hol && col !== 6 ? " (تعطیل)" : "")),
      h("div", { class: "mon" }, MONTHS[j[1] - 1] + " " + fa(j[0])), chip));

  const g = d2g(T.sel), hj = hijriFromJdn(T.sel);
  const y1 = J.toJdn(j[0], 1, 1), y2 = J.toJdn(j[0] + 1, 1, 1);
  const dates = T.cards.dates; dates.innerHTML = "";
  dates.append(h("h4", {}, "تاریخ‌ها"),
    h("div", { class: "ln" }, h("b", {}, "شمسی : "), fa(j[2]) + " " + MONTHS[j[1] - 1] + " " + fa(j[0]) + "  —  " + fmtJ(j)),
    h("div", { class: "ln" }, h("b", {}, "میلادی : "), fa(g[2]) + " " + G_MONTHS[g[1] - 1] + " " + fa(g[0]) + "  —  " + gregNum(T.sel)),
    h("div", { class: "ln" }, h("b", {}, "قمری : "), fa(hj[2]) + " " + H_MONTHS[hj[1] - 1] + " " + fa(hj[0]) + (hj[3] ? "" : " (محاسباتی)")),
    h("div", { class: "yr" }, "فصل " + SEASONS[Math.floor((j[1] - 1) / 3)] + "  •  روز " + fa(T.sel - y1 + 1) + " از " + fa(y2 - y1) + "  •  " + fa(y2 - T.sel) + " روز تا نوروز"));

  const ev = T.cards.events; ev.innerHTML = "";
  ev.append(h("h4", {}, "مناسبت‌ها" + (diff ? " — " + fa(j[2]) + " " + MONTHS[j[1] - 1] : "")));
  if (!data) ev.append(h("div", { class: "m" }, T.offline && T.offline[j[0]] ? "برای مشاهده‌ی رویدادهای سال " + fa(j[0]) + " یک بار به اینترنت وصل شوید ." : "در حال دریافت مناسبت‌های سال " + fa(j[0]) + " …"));
  else if (!res.events.length) ev.append(h("div", { class: "m" }, "مناسبتی برای این روز ثبت نشده است ."));
  else [true, false].forEach(pass => res.events.filter(e => e.holiday === pass).forEach(e => ev.append(h("div", { class: "e" + (e.holiday ? " h" : "") }, "• " + fa(e.text.trim()) + (e.holiday ? " (تعطیل)" : "")))));
}

function renderMonth() {
  $("#mt").textContent = MONTHS[T.vm - 1] + " " + fa(T.vy);
  const start = J.weekColumn(J.toJdn(T.vy, T.vm, 1)), len = J.monthLength(T.vy, T.vm), data = yearData(T.vy);
  const s = d2j(T.sel), t = d2j(T.today);
  $$("#grid .c").forEach((c, i) => {
    const d = i - start + 1, ok = d >= 1 && d <= len;
    c.querySelector("span").textContent = ok ? fa(d) : "";
    c.disabled = !ok;
    const r = ok && data ? Events.day(data, T.vm, d) : null;
    c.className = "c" + (ok && (i % 7 === 6 || (r && r.holiday)) ? " red" : "") + (r && r.events.length ? " ev" : "")
      + (ok && T.vy === t[0] && T.vm === t[1] && d === t[2] ? " now" : "") + (ok && T.vy === s[0] && T.vm === s[1] && d === s[2] ? " sel" : "");
    c.style.visibility = ok || i < 35 ? "" : "hidden";
  });
}

function pickCell(i) {
  const d = i - J.weekColumn(J.toJdn(T.vy, T.vm, 1)) + 1;
  if (d < 1 || d > J.monthLength(T.vy, T.vm)) return;
  T.sel = J.toJdn(T.vy, T.vm, d); renderAll();
}
function shiftMonth(dl) { T.vm += dl; if (T.vm < 1) { T.vm = 12; T.vy--; } if (T.vm > 12) { T.vm = 1; T.vy++; } renderMonth(); }
function goToday() { T.today = J.todayJdn(); T.sel = T.today; [T.vy, T.vm] = d2j(T.today); renderAll(); }

async function share() {
  const j = d2j(T.sel), col = J.weekColumn(T.sel), lines = [WD[col] + " " + fa(j[2]) + " " + MONTHS[j[1] - 1] + " " + fa(j[0]),
    "شمسی : " + fmtJ(j), "میلادی : " + gregText(T.sel) + "  —  " + gregNum(T.sel), "قمری : " + hijriText(T.sel)];
  const data = Events.peek(j[0]);
  if (data) { const r = Events.day(data, j[1], j[2]); if (r.events.length) { lines.push("مناسبت‌ها :"); r.events.forEach(e => lines.push("• " + fa(e.text.trim()) + (e.holiday ? " (تعطیل)" : ""))); } }
  const text = lines.join("\n");
  if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  toast(await copyText(text) ? "متن کپی شد" : "کپی انجام نشد");
}

// ---------- کشیدن افقی روی تقویم = ماه بعد/قبل ----------
function swipe(elm, on) {
  let sx = 0, sy = 0, ok = false;
  elm.addEventListener("touchstart", e => { if (e.touches.length !== 1) return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; ok = true; }, { passive: true });
  elm.addEventListener("touchend", e => {
    if (!ok || Drag.active || Drag.just) return; ok = false;
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 45) on(dx > 0 ? 1 : -1);          // راست‌به‌چپ: کشیدن به راست = ماه بعد
  }, { passive: true });
}

// ---------- جابه‌جایی بخش‌ها با نگه داشتن و کشیدن ----------
const Drag = {
  active: null, pend: null, just: false, raf: 0, lastY: 0,
  init() {
    const box = $("#sections");
    box.addEventListener("touchstart", e => { if (e.touches.length === 1) this.press(e.target, e.touches[0]); }, { passive: true });
    document.addEventListener("touchmove", e => {
      const t = e.touches[0];
      if (this.active) { e.preventDefault(); this.move(t.clientY); }
      else if (this.pend && Math.hypot(t.clientX - this.pend.sx, t.clientY - this.pend.sy) > 10) this.cancel();
    }, { passive: false });
    document.addEventListener("touchend", () => this.release());
    document.addEventListener("touchcancel", () => this.release());
    box.addEventListener("mousedown", e => { if (e.button === 0) this.press(e.target, e); });
    document.addEventListener("mousemove", e => {
      if (this.active) { e.preventDefault(); this.move(e.clientY); }
      else if (this.pend && Math.hypot(e.clientX - this.pend.sx, e.clientY - this.pend.sy) > 6) this.cancel();
    });
    document.addEventListener("mouseup", () => this.release());
    box.addEventListener("click", e => { if (this.just) { e.preventDefault(); e.stopPropagation(); } }, true);
    box.addEventListener("contextmenu", e => { if (this.pend || this.active) e.preventDefault(); });
  },
  press(target, p) {
    const c = target.closest(".gc"); if (!c || this.active) return;
    this.cancel();
    this.pend = { c, sx: p.clientX, sy: p.clientY, timer: setTimeout(() => this.start(c, p.clientY), 430), t2: setTimeout(() => c.classList.add("press"), 160) };
  },
  cancel() { if (!this.pend) return; clearTimeout(this.pend.timer); clearTimeout(this.pend.t2); this.pend.c.classList.remove("press"); this.pend = null; },
  start(c, y) {
    this.cancel();
    const r = c.getBoundingClientRect(), ph = h("div", { class: "ph" });
    ph.style.height = r.height + "px";
    c.parentNode.insertBefore(ph, c);
    Object.assign(c.style, { position: "fixed", top: r.top + "px", left: r.left + "px", width: r.width + "px", margin: "0" });
    c.classList.add("lift", "moving");
    this.active = { c, ph, off: y - r.top, h: r.height };
    this.lastY = y;
    if (navigator.vibrate) navigator.vibrate(12);
    const loop = () => {                                              // اسکرول خودکار نزدیک لبه‌ها
      if (!this.active) return;
      const y = this.lastY, H = innerHeight, edge = 80;
      const v = y < edge ? -Math.ceil((edge - y) / 6) : y > H - edge ? Math.ceil((y - H + edge) / 6) : 0;
      if (v) { scrollBy(0, v); this.place(); }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  },
  move(y) { this.lastY = y; const a = this.active; a.c.style.top = (y - a.off) + "px"; this.place(); },
  place() {
    const a = this.active, box = $("#sections"), mid = this.lastY - a.off + a.h / 2;
    const sibs = Array.from(box.children).filter(x => x !== a.c && x !== a.ph);
    let before = null;
    for (const s of sibs) { const r = s.getBoundingClientRect(); if (mid < r.top + r.height / 2) { before = s; break; } }
    if ((before ? before.previousElementSibling : box.lastElementChild) === a.ph || (before && before.previousElementSibling === a.c && a.c.previousElementSibling === a.ph)) return;
    const first = new Map(sibs.map(s => [s, s.getBoundingClientRect().top]));
    box.insertBefore(a.ph, before);
    sibs.forEach(s => {                                               // حرکت نرم بقیه‌ی بخش‌ها
      const dy = first.get(s) - s.getBoundingClientRect().top; if (!dy) return;
      s.style.transition = "none"; s.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => { s.style.transition = "transform .2s"; s.style.transform = ""; });
    });
  },
  release() {
    this.cancel();
    const a = this.active; if (!a) return;
    this.active = null; cancelAnimationFrame(this.raf);
    const r = a.ph.getBoundingClientRect();
    a.c.classList.remove("moving");
    a.c.style.transition = "top .18s, transform .18s, box-shadow .18s"; a.c.style.top = r.top + "px";
    const done = () => {
      a.ph.replaceWith(a.c);
      a.c.removeAttribute("style"); a.c.classList.remove("lift");
      T.order = Array.from($("#sections").children).map(x => x.dataset.k).filter(Boolean);
      store.set("tOrder", T.order);
    };
    setTimeout(done, 190);
    this.just = true; setTimeout(() => { this.just = false; }, 400);
  },
};

// ---------- تنظیمات ----------
function openSettings() {
  Sheet.push(function render(s) {
    s.innerHTML = "";
    s.append(h("h2", {}, "تنظیمات صفحه‌ی امروز"));
    const tr = store.get("tAlpha", 60), val = h("span", { class: "muted" }, " " + fa(tr) + "٪");
    const rng = h("input", { type: "range", min: "0", max: "100", step: "5", class: "rng" }); rng.value = tr;
    rng.addEventListener("input", () => { store.set("tAlpha", +rng.value); val.textContent = " " + fa(rng.value) + "٪"; applyLook(); });
    s.append(h("div", { class: "slab" }, "شفافیت شیشه :", val), rng,
      h("div", { class: "muted", style: "display:flex;justify-content:space-between" }, h("span", {}, "مات"), h("span", {}, "کاملاً شفاف")));

    const tone = store.get("tTone", "dark");
    const segBtn = (txt, on, sel) => h("button", { class: sel ? "sel" : "", onclick: on }, txt);
    s.append(h("div", { class: "slab" }, "رنگ شیشه :"), h("div", { class: "seg" },
      segBtn("تیره (متن سفید)", () => { store.set("tTone", "dark"); applyLook(); render(s); }, tone === "dark"),
      segBtn("روشن (متن تیره)", () => { store.set("tTone", "light"); applyLook(); render(s); }, tone === "light")));

    let hasWall = false; try { hasWall = !!localStorage.getItem("rs-wall"); } catch (e) {}
    const file = h("input", { type: "file", accept: "image/*", style: "display:none" });
    file.addEventListener("change", () => { if (file.files[0]) setWallpaper(file.files[0], () => render(s)); });
    s.append(h("div", { class: "slab" }, "پس‌زمینه :"), file, h("div", { class: "seg" },
      segBtn("رنگ‌های تم", () => { try { localStorage.removeItem("rs-wall"); } catch (e) {} applyLook(); render(s); }, !hasWall),
      segBtn(hasWall ? "تصویر دلخواه ✓" : "انتخاب تصویر…", () => file.click(), hasWall)),
      h("div", { class: "muted", style: "margin-top:4px" }, "مثلاً همان تصویر پس‌زمینه‌ی گوشی را انتخاب کنید تا صفحه مثل ویجت روی آن دیده شود ."));

    s.append(h("div", { class: "slab" }, "ترتیب بخش‌ها :"),
      h("div", { class: "muted" }, "انگشت را روی هر بخش نگه دارید و آن را بالا یا پایین بکشید ."),
      btnRow(pillBtn("بازگرداندن ترتیب پیش‌فرض", () => { store.set("tOrder", DEFAULT_ORDER); DEFAULT_ORDER.forEach(k => $("#sections").append(T.cards[k])); T.order = DEFAULT_ORDER.slice(); toast("ترتیب پیش‌فرض برگشت"); })));

    s.append(h("div", { class: "slab" }, "به‌جای ویجت :"),
      h("div", { class: "box", style: "margin-top:6px;font-size:14px" },
        "آیفون به برنامه‌های وب اجازه‌ی ساختن ویجت نمی‌دهد. این صفحه را جداگانه نصب کنید تا با یک لمس باز شود :\n" +
        "۱. همین صفحه را در Safari باز کنید .\n۲. روی ••• کنار آدرس و بعد Share بزنید (در iOS قدیمی‌تر: دکمه‌ی اشتراک‌گذاری پایین صفحه) .\n۳. «Add to Home Screen» را انتخاب کنید ؛ آیکون «امروز» کنار آیکون روزشمار قرار می‌گیرد ."));
    s.append(btnRow(pillBtn("رنگ و تم برنامه", () => openTheme(() => applyLook())), pillBtn("بستن", () => Sheet.pop(), true)));
  });
}
function setWallpaper(f, then) {
  const img = new Image(), url = URL.createObjectURL(f);
  img.onload = () => {
    const k = Math.min(1, 1400 / Math.max(img.width, img.height)), cv = document.createElement("canvas");
    cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
    cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    let q = .82, data = cv.toDataURL("image/jpeg", q);
    while (data.length > 1500000 && q > .4) { q -= .12; data = cv.toDataURL("image/jpeg", q); }
    try { localStorage.setItem("rs-wall", data); toast("تصویر پس‌زمینه تنظیم شد"); } catch (e) { toast("تصویر خیلی بزرگ است؛ تصویر دیگری انتخاب کنید"); }
    applyLook(); then();
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast("این تصویر خوانده نشد"); };
  img.src = url;
}

// ---------- شروع ----------
function scheduleMidnight() {
  const n = new Date(), next = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1, 0, 0, 5);
  setTimeout(() => { const wasToday = T.sel === T.today; T.today = J.todayJdn(); if (wasToday) goToday(); else renderAll(); scheduleMidnight(); }, next - n);
}
document.addEventListener("DOMContentLoaded", () => {
  applyLook();
  buildSections();
  renderAll();
  Drag.init();
  $("#setBtn").addEventListener("click", openSettings);
  $("#tcredit").textContent = Credit.line();
  $("#tcredit").addEventListener("click", openAbout);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && J.todayJdn() !== T.today) goToday(); });
  scheduleMidnight();
  if (!store.get("tHint", false)) { store.set("tHint", true); setTimeout(() => toast("برای جابه‌جایی بخش‌ها، انگشت را روی آن نگه دارید و بکشید"), 900); }
  registerSW();
});
