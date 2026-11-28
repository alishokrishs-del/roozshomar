/**
 * روزشمار شمسی — سرور آمار نصب‌ها روی Cloudflare Workers (فقط برای علی شکری)
 *
 * همان کار فایل PHP را می‌کند، بدون هاست:
 *  - هر نصب برنامه یک پیام کوچک می‌فرستد: شناسه‌ی ناشناس، سکو، نسخه، سیستم‌عامل، مدل دستگاه.
 *    هیچ نام، شماره، ایمیل، آیمی یا موقعیتی گرفته نمی‌شود.
 *  - آمار فقط به پنل مدیریت داده می‌شود، با سه قفل:
 *      ۱) رمز مدیریت: به‌صورت Secret با نام ADMIN_PASSWORD در تنظیمات همین Worker (نه داخل کد، نه داخل برنامه)
 *      ۲) فقط گوشی مدیر (شناسه‌ی پایین)
 *      ۳) اثر انگشت روی خود گوشی
 *  - بعد از ۵ رمز اشتباه، ورود ۱۵ دقیقه بسته می‌شود.
 * پایگاه داده: Cloudflare D1 با نام اتصال (binding) «DB». جدول‌ها در اولین درخواست خودکار ساخته می‌شوند.
 *
 * به‌روزرسانی برنامه از همین دامنه: هر درخواست GET دیگر (android-latest.json، RoozShomar.apk و نسخه‌ی وب آیفون)
 * از GitHub Pages گرفته و از همین دامنه داده می‌شود؛ انتشار نسخه‌ها مثل قبل روی گیت‌هاب می‌ماند.
 *   آمار:            POST https://<دامنه>/api
 *   وضعیت سرور:      GET  https://<دامنه>/status
 *   به‌روزرسانی:     GET  https://<دامنه>/android-latest.json  و  /RoozShomar.apk
 */

const APP_KEY = "rsh-7d41c9e2";               // کلید مشترک برنامه (تغییرش ندهید)
const ADMIN_DEVICE = "9029e1a1f2dfa658";      // شناسه‌ی گوشی علی شکری (زبانه‌ی «بیشتر» در برنامه)
const MAX_INSTALLS = 200000;
const ORIGIN = "https://alishokrishs-del.github.io/roozshomar";   // فایل‌های به‌روزرسانی و نسخه‌ی وب

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    const url = new URL(req.url);
    if (url.pathname === "/status") {
      const st = { ok: true, server: "roozshomar-cloudflare", password_set: passwordOk(env), database: !!env.DB };
      const wantsHtml = (req.headers.get("Accept") || "").includes("text/html") && url.searchParams.get("format") !== "json";
      return wantsHtml ? statusPage(st) : json(st);
    }
    // به‌روزرسانی و نسخه‌ی وب: هر GET بدون کلید برنامه ← از GitHub Pages
    if (req.method === "GET" && url.pathname !== "/api" && !url.searchParams.has("k")) return proxy(url);
    let p = {};
    try { p = await params(req); } catch (e) { p = {}; }
    if (p.k !== APP_KEY) {
      // باز کردن آدرس در مرورگر: فقط وضعیت سرور (برای اطمینان از درست راه افتادن)
      return json({ ok: false, error: "key", server: "roozshomar-cloudflare",
        password_set: passwordOk(env), database: !!env.DB });
    }
    if (!env.DB) return json({ ok: false, error: "storage" });
    await ensureTables(env.DB);
    const a = String(p.a || "");
    if (a === "check") return adminCheck(env, p, false);
    if (a === "stats") return adminCheck(env, p, true);
    if (!p.id) return json({ ok: false, error: "id" });
    return ping(env.DB, p);
  },
};

// ---------------------------------------------------------------------------

async function proxy(url) {
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const isApk = path.endsWith(".apk"), isMeta = path.endsWith(".json");
  const r = await fetch(ORIGIN + path + url.search, {
    cf: { cacheEverything: true, cacheTtl: isMeta ? 60 : isApk ? 3600 : 600 },
  });
  const h = new Headers(r.headers);
  h.set("Access-Control-Allow-Origin", "*");
  if (isMeta) h.set("Cache-Control", "no-store");
  if (isApk) { h.set("Content-Type", "application/vnd.android.package-archive"); h.set("Content-Disposition", 'attachment; filename="RoozShomar.apk"'); }
  return new Response(r.body, { status: r.status, headers: h });
}

// صفحه‌ی خوانای وضعیت سرور برای مرورگر (آمار نصب‌ها اینجا نیست؛ فقط در پنل مدیریت)
function statusPage(st) {
  const row = (ok, yes, no) =>
    `<li class="${ok ? "ok" : "bad"}"><span class="i">${ok ? "✓" : "✗"}</span>${ok ? yes : no}</li>`;
  let when = "";
  try {
    const parts = {};
    for (const x of new Intl.DateTimeFormat("fa-IR-u-ca-persian", { weekday: "long", day: "numeric", month: "long",
      year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Tehran" }).formatToParts(new Date()))
      parts[x.type] = x.value;
    when = `${parts.weekday} ${parts.day} ${parts.month} ${parts.year} — ساعت ${parts.hour}:${parts.minute}`;
  } catch (e) { when = ""; }
  const all = st.ok && st.password_set && st.database;
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>وضعیت سرور روزشمار</title><style>
@font-face{font-family:V;src:url(/Vazirmatn-FD-Regular.ttf)}@font-face{font-family:V;font-weight:700;src:url(/Vazirmatn-FD-Bold.ttf)}
body{margin:0;background:#f4f6fa;color:#263238;font:16px/1.9 V,system-ui,sans-serif;display:flex;justify-content:center}
main{width:min(460px,100% - 32px);margin:40px 0}h1{font-size:22px;color:#1565c0;margin:0 0 4px}
.sub{color:#78909c;font-size:14px;margin:0 0 18px}.card{background:#fff;border:1px solid #dde3ea;border-radius:18px;padding:8px 18px}
ul{list-style:none;margin:0;padding:0}li{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #eef1f5}
li:last-child{border-bottom:0}.i{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:700;color:#fff;flex:none}
.ok .i{background:#2e7d32}.bad .i{background:#c62828}.sum{margin:16px 0 0;font-weight:700;color:${all ? "#2e7d32" : "#c62828"}}
.foot{color:#90a4ae;font-size:13px;margin-top:18px}</style></head><body><main>
<h1>وضعیت سرور روزشمار شمسی</h1><p class="sub">${when}</p>
<div class="card"><ul>
${row(st.ok, "سرور روشن است و جواب می‌دهد", "سرور جواب نمی‌دهد")}
${row(st.password_set, "رمز مدیریت تنظیم شده است", "رمز مدیریت تنظیم نشده (Secret با نام ADMIN_PASSWORD)")}
${row(st.database, "پایگاه داده‌ی آمار وصل است", "پایگاه داده‌ی آمار وصل نیست")}
</ul></div>
<p class="sum">${all ? "همه‌چیز درست کار می‌کند." : "یک مورد نیاز به بررسی دارد."}</p>
<p class="foot">آمار نصب‌ها فقط در پنل مدیریت برنامه نشان داده می‌شود.</p>
</main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" } });
}

function cors() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
           "Access-Control-Allow-Headers": "Content-Type" };
}

function json(o) {
  return new Response(JSON.stringify(o), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
               "X-Content-Type-Options": "nosniff", ...cors() },
  });
}

async function params(req) {
  const url = new URL(req.url);
  const p = Object.fromEntries(url.searchParams);
  if (req.method === "POST") {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("application/json")) Object.assign(p, await req.json());
    else if (ct.includes("form")) { const f = await req.formData(); for (const [k, v] of f) p[k] = String(v); }
    else { const t = await req.text(); for (const [k, v] of new URLSearchParams(t)) p[k] = v; }
  }
  return p;
}

function clip(v, n) {
  return String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, n);
}

function passwordOk(env) {
  const pw = env.ADMIN_PASSWORD || "";
  return pw.length >= 8 && pw !== "CHANGE-ME";
}

let tablesReady = false;
async function ensureTables(db) {
  if (tablesReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS installs (id TEXT PRIMARY KEY, first INTEGER, last INTEGER, days INTEGER, pl TEXT, v TEXT, os TEXT, dev TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS events (t INTEGER, id TEXT, ev TEXT, pl TEXT, v TEXT, os TEXT, dev TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS admin (k TEXT PRIMARY KEY, v TEXT)"),
  ]);
  tablesReady = true;
}

// ---- ثبت نصب / استفاده / به‌روزرسانی ----
async function ping(db, p) {
  const now = Math.floor(Date.now() / 1000);
  const id = clip(p.id, 40);
  const pl = ["android", "windows", "ios", "web"].includes(p.pl) ? p.pl : "other";
  const v = clip(p.v, 16), os = clip(p.os, 40), dev = clip(p.dev, 60), ev = clip(p.ev, 12);
  const old = await db.prepare("SELECT days FROM installs WHERE id = ?").bind(id).first();
  if (old) {
    await db.prepare("UPDATE installs SET last = ?, days = days + 1, pl = ?, v = ?, os = ?, dev = ? WHERE id = ?")
      .bind(now, pl, v, os, dev, id).run();
  } else {
    const c = await db.prepare("SELECT COUNT(*) AS n FROM installs").first();
    if (c && c.n >= MAX_INSTALLS) return json({ ok: false, error: "full" });
    await db.prepare("INSERT INTO installs (id, first, last, days, pl, v, os, dev) VALUES (?, ?, ?, 1, ?, ?, ?, ?)")
      .bind(id, now, now, pl, v, os, dev).run();
  }
  await db.prepare("INSERT INTO events (t, id, ev, pl, v, os, dev) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(now, id, ev, pl, v, os, dev).run();
  // گزارش رویدادها خیلی بزرگ نشود (۲۰۰ هزار رویداد آخر)
  if (Math.random() < 0.01) await db.prepare("DELETE FROM events WHERE rowid IN (SELECT rowid FROM events ORDER BY t DESC LIMIT -1 OFFSET 200000)").run();
  return json({ ok: true });
}

// ---- ورود مدیر و آمار ----
async function getA(db, k) { const r = await db.prepare("SELECT v FROM admin WHERE k = ?").bind(k).first(); return r ? r.v : null; }
async function setA(db, k, v) { await db.prepare("INSERT INTO admin (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(k, String(v)).run(); }

function sameText(a, b) {          // مقایسه با زمان ثابت
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

async function adminCheck(env, p, wantStats) {
  const db = env.DB;
  if (!passwordOk(env)) return json({ ok: false, error: "setup" });
  const id = clip(p.id, 40), pw = String(p.pw || ""), now = Math.floor(Date.now() / 1000);
  const lock = parseInt(await getA(db, "lock_until") || "0", 10);
  if (lock > now) return json({ ok: false, error: "locked" });
  if (!sameText(env.ADMIN_PASSWORD, pw)) {
    let fails = parseInt(await getA(db, "fails") || "0", 10) + 1;
    if (fails >= 5) { fails = 0; await setA(db, "lock_until", now + 15 * 60); }
    await setA(db, "fails", fails);
    return json({ ok: false, error: "password" });
  }
  await setA(db, "fails", 0);
  if (!id) return json({ ok: false, error: "old-app" });
  if (id !== ADMIN_DEVICE) return json({ ok: false, error: "device" });
  if (!wantStats) return json({ ok: true });
  return json(await stats(db));
}

function verCmp(a, b) {
  const x = String(a).split(/[^0-9]+/).filter(Boolean).map(Number), y = String(b).split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
}

async function stats(db) {
  const rows = (await db.prepare("SELECT id, first, last, days, pl, v, os, dev FROM installs").all()).results || [];
  const now = Math.floor(Date.now() / 1000), day = 86400;
  // «امروز» به وقت تهران (UTC+3:30)
  const tz = 3.5 * 3600, today = Math.floor((now + tz) / day) * day - tz;
  const o = { ok: true, total: rows.length, active7: 0, active30: 0, newToday: 0, new7: 0,
              platforms: {}, versions: {}, latest: {}, latestCount: 0, newest: [], recent: [] };
  for (const r of rows) {
    if (now - r.last <= 7 * day) o.active7++;
    if (now - r.last <= 30 * day) o.active30++;
    if (r.first >= today) o.newToday++;
    if (now - r.first <= 7 * day) o.new7++;
    o.platforms[r.pl] = (o.platforms[r.pl] || 0) + 1;
    const vk = r.pl + " " + r.v;
    o.versions[vk] = (o.versions[vk] || 0) + 1;
    if (!(r.pl in o.latest) || verCmp(r.v, o.latest[r.pl]) > 0) o.latest[r.pl] = r.v;
  }
  for (const r of rows) if (r.v === o.latest[r.pl]) o.latestCount++;
  const list = rows.map(r => ({ id: String(r.id).slice(0, 8), first: r.first * 1000, last: r.last * 1000,
                               pl: r.pl, v: r.v, os: r.os, dev: r.dev, days: r.days | 0 }));
  o.newest = [...list].sort((a, b) => b.first - a.first).slice(0, 20);
  o.recent = [...list].sort((a, b) => b.last - a.last).slice(0, 50);
  return o;
}
