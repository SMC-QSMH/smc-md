/* SMC MD — app.js (รุ่น 2569-10-16.1)
 * รุ่น 16.1: เมนูจัดกลุ่มพับได้ + ย่อแถบข้าง (จำค่าไว้) · ไม่เด้งออกเมื่อแก้ผู้ใช้/เปลี่ยนรหัส (เก็บโทเคนใหม่)
 *           · ป๊อปอัปแจ้งรายการเรียกคืน · การ์ดพับได้ · บทบาทเจ้าหน้าที่แพทย์แผนไทย
 * แกนหน้าเว็บ: เรียกหลังบ้าน (พร้อมแคชในเครื่อง) · ป๊อปอัป/แผงข้าง/ข้อความเด้งที่วาดเอง
 * · ล็อกอิน · เมนู · เส้นทางหน้า · ตัวช่วยแสดงผล
 *
 * ⚠ กับดักที่เคยทำให้ระบบพัง
 *   1. fetch ต้องส่ง Content-Type: text/plain เท่านั้น (application/json → CORS error ทั้งระบบ)
 *   2. ห้ามใช้ new Date('2026-10-14') แปลงวันที่ (เพี้ยน 1 วันในบางเบราว์เซอร์) ให้ตัดสตริง/Date.UTC
 *   3. ตัวเลขเงินฟอร์แมตตอนแสดงผลเท่านั้น
 *   4. ห้ามใช้ alert / confirm / prompt ของเบราว์เซอร์ (ผู้ใช้ขอ 15 ต.ค. 69 — หน้าตาไม่เหมือนกันแต่ละเครื่อง)
 *      ใช้ UI.confirm / UI.dialog / toast แทน
 */

/* ═══════════════ สถานะ ═══════════════ */
var S = { token: '', me: null, page: '', arg: '', busy: 0, cache: {}, mem: {}, dataVer: '', seq: 0 };

function I(name, cls) { return '<svg class="i' + (cls ? ' ' + cls : '') + '"><use href="#i-' + name + '"/></svg>'; }

/* ═══════════════ เรียกหลังบ้าน ═══════════════ */
function busy(on) {
  S.busy += on ? 1 : -1;
  if (S.busy < 0) S.busy = 0;
  document.getElementById('loadbar').classList.toggle('on', S.busy > 0);
}
function rid_() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

/**
 * api — เรียกคำสั่งหลังบ้าน · คืน data เมื่อสำเร็จ · throw Error ข้อความไทยเมื่อไม่สำเร็จ
 * opt.write = คำสั่งที่บันทึกข้อมูล (ส่ง _rid กันบันทึกซ้ำ และล้างแคชในเครื่องเมื่อสำเร็จ)
 */
function api(action, payload, opt) {
  opt = opt || {};
  if (window.DEMO_API) return window.DEMO_API(action, payload || {}, opt).then(function (d) { if (opt.write) clearCache(); return d; });
  if (!CFG.API_URL || CFG.API_URL.indexOf('PASTE_') === 0) {
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js'));
  }
  busy(true);
  var body = { action: action, payload: payload || {}, token: S.token };
  if (opt.write) body._rid = rid_();
  return fetch(CFG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },   /* ห้ามเปลี่ยน */
    body: JSON.stringify(body), redirect: 'follow'
  }).then(function (r) {
    if (!r.ok) throw new Error('เชื่อมต่อหลังบ้านไม่ได้ (รหัส ' + r.status + ')');
    return r.text();
  }).then(function (txt) {
    var o;
    try { o = JSON.parse(txt); }
    catch (e) { throw new Error('หลังบ้านตอบกลับมาไม่ถูกรูปแบบ — มักเกิดจากยัง Deploy เวอร์ชันใหม่ไม่สำเร็จ'); }
    busy(false);
    if (o.mustChange) { showChangePass(true); throw new Error('กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน'); }
    if (!o.ok) {
      /* รุ่น 16.1 — ออกจากระบบเฉพาะเมื่อหลังบ้านบอกว่าโทเคนใช้ไม่ได้จริง (ขึ้นต้น AUTH:) เท่านั้น
         เดิมจับคำว่า "เข้าสู่ระบบใหม่" ในข้อความใดก็ได้ → ข้อความผิดพลาดอื่นทำให้เด้งออก */
      if (/^AUTH:/.test(o.error || '') && action !== 'login' && action !== 'changePass') logout(true);
      throw new Error(String(o.error || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ').replace(/^(AUTH|FORBIDDEN):\s*/, ''));
    }
    if (o.build && CFG.BUILD && o.build !== CFG.BUILD) warnBuild(o.build);
    if (o.dataVer && S.dataVer && o.dataVer !== S.dataVer) clearCache();
    if (o.dataVer) S.dataVer = o.dataVer;
    if (opt.write) clearCache();
    return o.data;
  }).catch(function (e) {
    busy(false);
    if (e && e.name === 'TypeError') throw new Error('เชื่อมต่อเครือข่ายไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่');
    throw e;
  });
}

/* ───────── แคชในเครื่อง: เปิดหน้าเดิมเห็นข้อมูลทันที แล้วอัปเดตเบื้องหลัง ───────── */
function ckey(action, payload) { return action + '|' + JSON.stringify(payload || {}); }
function cacheGet(k) {
  if (S.mem[k]) return S.mem[k];
  try { var t = sessionStorage.getItem('smcmd_c:' + k); if (t) return (S.mem[k] = JSON.parse(t)); } catch (e) { }
  return null;
}
function cachePut(k, data) {
  var o = { at: Date.now(), data: data };
  S.mem[k] = o;
  try { var s = JSON.stringify(o); if (s.length < 1500000) sessionStorage.setItem('smcmd_c:' + k, s); } catch (e) { }
}
function clearCache() {
  S.mem = {};
  try {
    for (var i = sessionStorage.length - 1; i >= 0; i--) {
      var k = sessionStorage.key(i);
      if (k && k.indexOf('smcmd_c:') === 0) sessionStorage.removeItem(k);
    }
  } catch (e) { }
}

/**
 * load — ใช้ในทุกหน้ารายงาน
 *  มีข้อมูลเดิมในเครื่อง → วาดทันที (ไม่ต้องรอ) แล้วดึงของใหม่มาแทนถ้าเปลี่ยน
 *  ไม่มี → แสดงโครงร่างระหว่างรอ
 *  render(data, meta) · meta.cached = ข้อมูลจากเครื่อง
 */
function load(action, payload, render, opt) {
  opt = opt || {};
  var my = ++S.seq, k = ckey(action, payload), hit = opt.fresh ? null : cacheGet(k);
  if (hit) { try { render(hit.data, { cached: true, at: hit.at }); } catch (e) { showErr(e); } }
  else if (!opt.quiet) skeleton(opt.msg);
  var p = Object.assign({}, payload || {});
  if (opt.fresh) p.fresh = true;
  return api(action, p).then(function (d) {
    if (my !== S.seq && !opt.keep) return;
    var same = hit && JSON.stringify(hit.data) === JSON.stringify(d);
    cachePut(k, d);
    if (!same) render(d, { cached: false, at: Date.now() });
    markFresh();
  }).catch(function (e) {
    if (my !== S.seq) return;
    if (hit) toast('อัปเดตข้อมูลล่าสุดไม่สำเร็จ — กำลังแสดงข้อมูลที่เปิดไว้ก่อนหน้า · ' + e.message, 'warn', 8000);
    else if (opt.errTo && document.getElementById(opt.errTo)) document.getElementById(opt.errTo).innerHTML = note('bad', esc(e.message || e));
    else showErr(e);
  });
}
function markFresh() {
  var f = document.getElementById('freshDot');
  if (f) { f.classList.remove('old'); f.innerHTML = '<i></i>ข้อมูลล่าสุด ' + hhmm(new Date()); }
}
function hhmm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' น.'; }

var _buildWarned = false;
function warnBuild(serverBuild) {
  if (_buildWarned) return;
  _buildWarned = true;
  toast('รุ่นของหน้าเว็บ (' + CFG.BUILD + ') ไม่ตรงกับหลังบ้าน (' + serverBuild + ') · กดรีเฟรชหน้าแบบล้างแคช (Ctrl+Shift+R)', 'warn', 12000);
}

/* ═══════════════ ตัวช่วยแสดงผล ═══════════════ */
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function B(n) { var v = Number(n || 0); return v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function N(n) { return Number(n || 0).toLocaleString('th-TH'); }
function K(n) {
  var v = Number(n || 0), a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toLocaleString('th-TH', { maximumFractionDigits: 2 }) + ' ล.';
  if (a >= 1e4) return (v / 1e3).toLocaleString('th-TH', { maximumFractionDigits: 1 }) + ' พัน';
  return N(Math.round(v));
}
var TH_MON = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
var TH_MON_FULL = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
var TH_WD = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
function dTh(s) {
  var p = String(s || '').slice(0, 10).split('-');
  if (p.length < 3) return esc(s || '');
  return Number(p[2]) + ' ' + TH_MON[Number(p[1])] + ' ' + String(Number(p[0]) + 543).slice(2);
}
function dThLong(s) {
  var p = String(s || '').slice(0, 10).split('-');
  if (p.length < 3) return esc(s || '');
  return 'วัน' + ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][wday(s)] + 'ที่ ' +
         Number(p[2]) + ' ' + TH_MON_FULL[Number(p[1])] + ' ' + (Number(p[0]) + 543);
}
function wday(s) { var p = String(s).split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
function ymTh(s) { var p = String(s || '').split('-'); return p.length < 2 ? esc(s || '') : TH_MON_FULL[Number(p[1])] + ' ' + (Number(p[0]) + 543); }
function ymShort(s) { var p = String(s || '').split('-'); return p.length < 2 ? esc(s || '') : TH_MON[Number(p[1])] + ' ' + String(Number(p[0]) + 543).slice(2); }
function today() {
  if (window.DEMO_TODAY) return window.DEMO_TODAY;
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function thisYm() { return today().slice(0, 7); }
function ymAdd(ym, n) {
  var p = String(ym).split('-'), m = Number(p[1]) - 1 + Number(n), y = Number(p[0]) + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return y + '-' + ('0' + (m + 1)).slice(-2);
}
function shiftDay(d, n) {
  var p = String(d).split('-'), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  var pa = String(a).split('-'), pb = String(b).split('-');
  return Math.round((Date.UTC(+pb[0], +pb[1] - 1, +pb[2]) - Date.UTC(+pa[0], +pa[1] - 1, +pa[2])) / 864e5);
}
function ymOptions(sel, n) {
  n = n || 18;
  var cur = thisYm(), out = '';
  for (var i = 0; i < n; i++) {
    var ym = ymAdd(cur, -i);
    out += '<option value="' + ym + '"' + (ym === sel ? ' selected' : '') + '>' + ymTh(ym) + '</option>';
  }
  return out;
}
/** ปีงบประมาณ (ต.ค.–ก.ย.) ของเดือนนี้ เป็น พ.ศ. */
function fiscalOf(ym) { var p = String(ym).split('-'); return Number(p[0]) + 543 + (Number(p[1]) >= 10 ? 1 : 0); }

var STATUS_CLASS = {
  'จ่ายแล้ว': 'ok', 'จ่ายบางส่วน': 'warn', 'ค้างจ่าย': 'warn', 'ระงับโดยผู้จัดการ': 'bad',
  'ไม่เบิก': '', 'หนี้เสีย': 'bad', 'หนี้ศูนย์': '', 'รอจัดกลุ่ม': 'bad',
  'ระงับ · เข้ารายได้คลินิก': 'brand', 'ไม่พบเวร': 'bad'
};
var ST_CLINIC = 'ระงับ · เข้ารายได้คลินิก', ST_NOSHIFT = 'ไม่พบเวร';   /* ต้องตรงกับ PAY_STATUS.CLINIC / NOSHIFT ใน Config.gs */
/* ต้องตรงกับ PAY_STATUS ใน Config.gs ทุกตัวอักษร */
var PAY_STATUS_LIST = ['จ่ายแล้ว', 'จ่ายบางส่วน', 'ค้างจ่าย', 'ระงับโดยผู้จัดการ', 'ไม่เบิก'];
var CASE_RESET = 'คืนตามที่ระบบคำนวณ';

function tag(s, cls) {
  if (s === '' || s === null || s === undefined) return '';
  var c = cls === undefined ? (STATUS_CLASS[s] || '') : cls;
  return '<span class="tag ' + c + '">' + esc(s) + '</span>';
}
function note(kind, html, icon) {
  var ic = icon || (kind === 'bad' || kind === 'warn' ? 'alert' : kind === 'ok' ? 'check' : 'info');
  return '<div class="note ' + kind + '">' + I(ic) + '<div>' + html + '</div></div>';
}
function kpi(lbl, val, sub, cls, icon, onclick) {
  return '<div class="kpi ' + (cls || '') + (onclick ? ' click' : '') + '"' + (onclick ? ' onclick="' + onclick + '"' : '') + '>' +
    '<div class="l">' + (icon ? I(icon, 'sm') : '') + esc(lbl) + '</div>' +
    '<div class="v">' + val + '</div>' + (sub ? '<div class="d">' + sub + '</div>' : '') + '</div>';
}
/* การ์ดพับได้ (รุ่น 16.1 ข้อ 7) — opt.fold = รหัสการ์ด · จำว่าพับ/กางไว้ในเครื่องนี้ */
function foldOpen(id, dflt) {
  try { var v = localStorage.getItem('smcmd_fold_' + id); if (v === '0') return false; if (v === '1') return true; } catch (e) { }
  return dflt !== false;
}
function foldSave(el) {
  try { localStorage.setItem('smcmd_fold_' + el.getAttribute('data-fold'), el.open ? '1' : '0'); } catch (e) { }
  if (el.open && window.CH && CH.redrawAll) setTimeout(function () { CH.redrawAll(); }, 30);
}
function card(title, body, opt) {
  opt = opt || {};
  if (opt.fold && title) {
    var op = foldOpen(opt.fold, opt.open);
    return '<details class="card fold' + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.id ? ' id="' + opt.id + '"' : '') + ' data-fold="' + esc(opt.fold) + '"' +
      (op ? ' open' : '') + ' ontoggle="foldSave(this)"><summary class="card-h" onclick="if(event.target.closest(\'button,select,input\'))event.preventDefault()"><div class="t">' + (opt.icon ? I(opt.icon) : '') + '<div><h3>' + title + '</h3>' +
      (opt.sub ? '<div class="s">' + opt.sub + '</div>' : '') + '</div></div>' + (opt.acts || '') + '<span class="fold-ar">' + I('right', 'sm') + '</span></summary>' +
      (opt.raw ? body : '<div class="card-b' + (opt.flush ? ' flush' : '') + '">' + body + '</div>') + '</details>';
  }
  return '<section class="card' + (opt.cls ? ' ' + opt.cls : '') + '"' + (opt.id ? ' id="' + opt.id + '"' : '') + '>' +
    (title ? '<div class="card-h"><div class="t">' + (opt.icon ? I(opt.icon) : '') + '<div><h3>' + title + '</h3>' +
      (opt.sub ? '<div class="s">' + opt.sub + '</div>' : '') + '</div></div>' + (opt.acts || '') + '</div>' : '') +
    (opt.raw ? body : '<div class="card-b' + (opt.flush ? ' flush' : '') + '">' + body + '</div>') + '</section>';
}
function emptyBox(msg, icon) { return '<div class="empty">' + I(icon || 'inbox') + esc(msg || 'ไม่มีข้อมูล') + '</div>'; }
function hnCell(hn) {
  if (!hn) return '<span class="muted">—</span>';
  return '<span class="hn">' + esc(hn) + '</span> <button class="copy" title="คัดลอก HN" onclick="event.stopPropagation();copyText(\'' +
         esc(hn) + '\')">' + I('copy', 'sm') + '</button>';
}
function copyText(t) {
  var done = function () { toast('คัดลอก ' + t + ' แล้ว', 'ok', 2000); };
  try {
    if (navigator.clipboard) return navigator.clipboard.writeText(t).then(done, function () { fallbackCopy(t); done(); });
  } catch (e) { }
  fallbackCopy(t); done();
}
function fallbackCopy(t) {
  var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
  try { document.execCommand('copy'); } catch (e) { } a.remove();
}

/* ───────── โครงหน้า ───────── */
function V(html) {
  var v = document.getElementById('view');
  v.innerHTML = html;
  v.classList.remove('page-in'); void v.offsetWidth; v.classList.add('page-in');
}
function header(title, sub, acts) {
  document.getElementById('pgTitle').textContent = title || '';
  document.getElementById('pgSub').innerHTML = sub || '';
  document.getElementById('pgActs').innerHTML = acts || '';
  document.title = (title ? title + ' · ' : '') + 'SMC MD';
}
function skeleton(msg) {
  V('<div class="sk-msg"><span class="spin"></span>' + esc(msg || 'กำลังโหลดข้อมูล') + '</div>' +
    '<div class="sk-kpis"><div class="sk"></div><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>' +
    '<div class="sk sk-card"></div><div class="sk sk-card" style="height:180px"></div>');
}
function loading(msg) { skeleton(msg); }
function showErr(e) {
  V(card('', note('bad', esc(e && e.message ? e.message : e)) +
    '<div class="btn-row"><button class="btn pri" onclick="go(S.page,S.arg)">' + I('refresh', 'sm') + 'ลองอีกครั้ง</button>' +
    '<button class="btn" onclick="go(firstPage())">กลับหน้าแรก</button></div>'));
}
function freshBadge(meta) {
  return '<span class="fresh-dot' + (meta && meta.cached ? ' old' : '') + '" id="freshDot"><i></i>' +
    (meta && meta.cached ? 'กำลังอัปเดต…' : 'ข้อมูลล่าสุด ' + hhmm(new Date())) + '</span>';
}

/* ═══════════════ ป๊อปอัป · แผงข้าง · ข้อความเด้ง (วาดเองทั้งหมด) ═══════════════ */
var UI = (function () {
  var stack = [];

  function layer() { return document.getElementById('layer'); }

  /** dialog — ป๊อปอัปกลางจอ (มือถือเป็นแผ่นเลื่อนจากด้านล่าง)
   *  o: { title, sub, icon, tone, body, ok, okCls, cancel, wide, onOk(el) → false|Promise, onOpen(el), noClose } */
  function dialog(o) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'ov';
      ov.innerHTML = '<div class="dlg' + (o.wide ? ' wide' : '') + '" role="dialog" aria-modal="true">' +
        '<div class="dlg-h">' + (o.icon ? '<div class="ic ' + (o.tone || '') + '">' + I(o.icon) + '</div>' : '') +
        '<div style="min-width:0"><h3>' + esc(o.title || '') + '</h3>' + (o.sub ? '<div class="s">' + o.sub + '</div>' : '') + '</div>' +
        '<button class="btn icon ghost x" data-x aria-label="ปิด">' + I('x') + '</button></div>' +
        '<div class="dlg-b">' + (o.body || '') + '<div class="dlg-err"></div></div>' +
        (o.ok !== false ? '<div class="dlg-f">' + (o.cancel === false ? '' : '<button class="btn" data-x>' + esc(o.cancel || 'ยกเลิก') + '</button>') +
          '<button class="btn ' + (o.okCls || 'pri') + '" data-ok>' + esc(o.ok || 'ตกลง') + '</button></div>' : '') +
        '</div>';
      layer().appendChild(ov);
      stack.push(ov);
      var done = false;
      function close(val) {
        if (done) return; done = true;
        ov.classList.add('out');
        setTimeout(function () { ov.remove(); }, 170);
        stack.splice(stack.indexOf(ov), 1);
        resolve(val);
      }
      ov._close = close;
      ov.addEventListener('click', function (e) {
        if (e.target === ov && !o.noClose) close(false);
        if (e.target.closest('[data-x]')) close(false);
      });
      var okb = ov.querySelector('[data-ok]');
      if (okb) okb.addEventListener('click', function () {
        var errBox = ov.querySelector('.dlg-err');
        errBox.innerHTML = '';
        var r = o.onOk ? o.onOk(ov) : true;
        if (r === false) return;
        if (r && typeof r.then === 'function') {
          var old = okb.innerHTML;
          okb.disabled = true; okb.innerHTML = '<span class="spin"></span> กำลังบันทึก';
          r.then(function (v) { close(v === undefined ? true : v); })
           .catch(function (e) { okb.disabled = false; okb.innerHTML = old; errBox.innerHTML = note('bad', esc(e.message || e)); });
          return;
        }
        close(r === undefined ? true : r);
      });
      ov.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !o.noClose) close(false);
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && okb) okb.click();
      });
      if (o.onOpen) o.onOpen(ov);
      setTimeout(function () {
        var f = ov.querySelector('input:not([type=hidden]):not([readonly]),select,textarea') || okb;
        if (f) try { f.focus(); } catch (e) { }
      }, 60);
    });
  }

  /** confirm — ยืนยันการกระทำ คืน Promise<boolean> */
  function confirm(o) {
    if (typeof o === 'string') o = { title: o };
    return dialog({ title: o.title, sub: o.sub, icon: o.icon || (o.danger ? 'alert' : 'info'), tone: o.danger ? 'bad' : (o.tone || 'warn'),
                    body: o.body || '', ok: o.ok || 'ยืนยัน', okCls: o.danger ? 'danger' : 'pri', cancel: o.cancel });
  }

  /** alert — แจ้งข้อความ ปุ่มเดียว */
  function alert(o) {
    if (typeof o === 'string') o = { title: o };
    return dialog({ title: o.title, sub: o.sub, icon: o.icon || 'info', tone: o.tone || '', body: o.body || '', ok: o.ok || 'รับทราบ', cancel: false });
  }

  function closeTop() { var t = stack[stack.length - 1]; if (t && t._close) t._close(false); }
  function closeAll() { while (stack.length) stack[stack.length - 1]._close(false); closeDrawer(); }

  /* ───────── แผงข้าง: รายละเอียดรายการ ───────── */
  var drw = null;
  function drawer(o) {
    closeDrawer(true);
    var d = document.createElement('div');
    d.innerHTML = '<div class="scrim" style="z-index:185"></div><aside class="drw" role="dialog" aria-modal="true">' +
      '<div class="drw-h"><div style="min-width:0;flex:1"><h3>' + esc(o.title || '') + '</h3>' +
      (o.sub ? '<div class="s">' + o.sub + '</div>' : '') + '</div>' +
      '<button class="btn icon ghost" data-x aria-label="ปิด">' + I('x') + '</button></div>' +
      '<div class="drw-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="drw-f">' + o.foot + '</div>' : '') + '</aside>';
    layer().appendChild(d);
    drw = d;
    d.addEventListener('click', function (e) {
      if (e.target.classList.contains('scrim') || e.target.closest('[data-x]')) closeDrawer();
    });
    return d;
  }
  function closeDrawer(instant) {
    if (!drw) return;
    var d = drw; drw = null;
    if (instant) return d.remove();
    var a = d.querySelector('.drw'); if (a) a.classList.add('out');
    setTimeout(function () { d.remove(); }, 190);
  }

  /* ───────── เมนูเล็กใต้ปุ่ม ───────── */
  function menuAt(btn, items) {
    var old = document.querySelector('.menu'); if (old) old.remove();
    var m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = items.map(function (it, i) { return '<button data-i="' + i + '">' + (it.icon ? I(it.icon, 'sm') : '') + esc(it.label) + '</button>'; }).join('');
    document.body.appendChild(m);
    var r = btn.getBoundingClientRect();
    var left = Math.min(r.left, window.innerWidth - m.offsetWidth - 10);
    m.style.left = Math.max(10, left) + 'px';
    m.style.top = (r.bottom + 6 + m.offsetHeight > window.innerHeight ? r.top - m.offsetHeight - 6 : r.bottom + 6) + 'px';
    setTimeout(function () {
      document.addEventListener('click', function h(e) {
        var b = e.target.closest('.menu button');
        if (b) items[Number(b.getAttribute('data-i'))].fn();
        m.remove(); document.removeEventListener('click', h);
      });
    }, 0);
  }

  return { dialog: dialog, confirm: confirm, alert: alert, closeTop: closeTop, closeAll: closeAll,
           drawer: drawer, closeDrawer: closeDrawer, menuAt: menuAt };
})();

/* เข้ากันได้กับโค้ดเดิม */
function modal(title, body, foot, wide) { return UI.dialog({ title: title, body: body + (foot ? '<div class="dlg-f" style="margin:14px -20px -16px">' + foot + '</div>' : ''), ok: false, wide: wide }); }
function closeModal() { UI.closeTop(); }
function mv(id) { var e = document.getElementById(id); return e ? String(e.value).trim() : ''; }
function dlgErr(el, msg) { var b = el.querySelector('.dlg-err'); if (b) b.innerHTML = note('bad', esc(msg)); return false; }

function toast(msg, kind, ms) {
  kind = kind || 'info';
  var el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = I(kind === 'bad' ? 'alert' : kind === 'ok' ? 'check' : kind === 'warn' ? 'alert' : 'info') +
    '<div style="flex:1">' + esc(msg) + '</div><button class="x" aria-label="ปิด">' + I('x', 'sm') + '</button>';
  var host = document.getElementById('toasts');
  host.appendChild(el);
  while (host.children.length > 4) host.firstChild.remove();
  var gone = function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 200); };
  el.querySelector('.x').onclick = gone;
  setTimeout(gone, ms || 4500);
}

/* ═══════════════ สั่งพิมพ์เอกสารเฉพาะส่วน (รุ่น 16.1) ═══════════════
 * ใช้กับรายงานที่ต้องตรวจสอบ / รายงานแพทย์แผนไทย — พิมพ์ได้ทุกอุปกรณ์ (มือถือ = บันทึกเป็น PDF) */
function printSheet(html, landscape) {
  var a = document.getElementById('printArea');
  if (!a) { a = document.createElement('div'); a.id = 'printArea'; document.body.appendChild(a); }
  a.innerHTML = '<style>@page{size:A4 ' + (landscape ? 'landscape' : 'portrait') + ';margin:10mm}</style><div class="pr">' + html + '</div>';
  document.body.classList.add('print-mode');
  var done = function () { document.body.classList.remove('print-mode'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(function () { window.print(); setTimeout(function () { if (!window.matchMedia || !window.matchMedia('print').matches) done(); }, 1500); }, 80);
}

/* ═══════════════ โหมดสี ═══════════════ */
function isDark() {
  var t = document.documentElement.getAttribute('data-theme');
  if (t) return t === 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function toggleTheme() {
  var next = isDark() ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('smcmd_theme', next); } catch (e) { }
  themeIcon();
  if (S.page && ROUTES[S.page] && window.CH && CH.redrawAll) CH.redrawAll();
}
function themeIcon() {
  var u = isDark() ? 'sun' : 'moon';
  ['btnTheme'].forEach(function (id) { var b = document.getElementById(id); if (b) b.innerHTML = I(u); });
}

/* ═══════════════ ล็อกอิน ═══════════════ */
var loginMode = 'doctor';
function initLogin() {
  document.getElementById('loginBuild').textContent = 'รุ่น ' + CFG.BUILD;
  var tabs = document.getElementById('loginTabs');
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    loginMode = b.getAttribute('data-mode');
    [].forEach.call(tabs.children, function (x) { x.classList.toggle('on', x === b); });
    var isDoc = loginMode === 'doctor';
    document.getElementById('userLabel').textContent = isDoc ? 'รหัสผู้ใช้ HIS' : 'รหัสพนักงาน';
    document.getElementById('loginHint').textContent = isDoc
      ? 'แพทย์ใช้รหัสผู้ใช้เดียวกับระบบ HIS ของโรงพยาบาล'
      : 'เจ้าหน้าที่ใช้รหัสพนักงานและรหัสผ่านที่ผู้ดูแลระบบกำหนด';
    document.getElementById('empCode').focus();
  });
  document.getElementById('eyeBtn').onclick = function () {
    var p = document.getElementById('pass'); var show = p.type === 'password';
    p.type = show ? 'text' : 'password'; this.textContent = show ? 'ซ่อน' : 'แสดง';
  };
  document.getElementById('themeLogin').onclick = toggleTheme;
  document.getElementById('loginForm').addEventListener('submit', function (e) { e.preventDefault(); doLogin(); });
}
function loginError(msg) {
  var box = document.getElementById('loginErr');
  box.classList.toggle('hidden', !msg);
  if (msg) box.querySelector('span').textContent = msg;
}
function setToken(t) {
  if (!t) return;
  S.token = t;
  try { localStorage.setItem('smcmd_tk', t); localStorage.setItem('smcmd_at', String(Date.now())); } catch (e) { }
}
function doLogin() {
  var code = mv('empCode'), pass = document.getElementById('pass').value;
  if (!code || !pass) return loginError('กรุณากรอกรหัสผู้ใช้และรหัสผ่าน');
  loginError('');
  var btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังตรวจสอบ';
  api('login', { empCode: code, pass: pass, agent: loginMode, his: loginMode === 'doctor' })
    .then(function (d) {
      setToken(d.token);
      S.recallShown = false;
      return start();
    })
    .catch(function (e) {
      btn.disabled = false; btn.textContent = 'เข้าใช้งาน';
      loginError(e.message || 'เข้าใช้งานไม่สำเร็จ');
      document.getElementById('pass').value = '';
    });
}
function showLogin() {
  document.getElementById('app').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  bootDone();
  setTimeout(function () { var e = document.getElementById('empCode'); if (e) e.focus(); }, 50);
}
function logout(silent) {
  S.token = ''; S.me = null; S.cache = {}; clearCache();
  try { localStorage.removeItem('smcmd_tk'); localStorage.removeItem('smcmd_at'); } catch (e) { }
  UI.closeAll();
  showLogin();
  var btn = document.getElementById('loginBtn');
  btn.disabled = false; btn.textContent = 'เข้าใช้งาน';
  document.getElementById('pass').value = '';
  loginError(silent ? 'เซสชันหมดอายุ กรุณาเข้าใช้งานอีกครั้ง' : '');
}
function askLogout() {
  UI.confirm({ title: 'ออกจากระบบ?', sub: 'ข้อมูลที่จำไว้ในเครื่องนี้จะถูกล้าง', icon: 'logout', ok: 'ออกจากระบบ' })
    .then(function (y) { if (y) { logout(); toast('ออกจากระบบแล้ว', 'ok'); } });
}
function showChangePass(forced) {
  UI.dialog({
    title: forced ? 'ตั้งรหัสผ่านใหม่ก่อนใช้งาน' : 'เปลี่ยนรหัสผ่าน', icon: 'key', noClose: !!forced, cancel: forced ? false : 'ยกเลิก',
    sub: forced ? 'ระบบกำหนดให้ตั้งรหัสผ่านของตนเองก่อนเริ่มใช้งานครั้งแรก' : '',
    body: '<label class="fld"><span>รหัสผ่านเดิม</span><input id="cpOld" type="password" autocomplete="current-password"></label>' +
      '<label class="fld"><span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span><input id="cpNew" type="password" autocomplete="new-password"></label>' +
      '<label class="fld"><span>ยืนยันรหัสผ่านใหม่</span><input id="cpNew2" type="password" autocomplete="new-password"></label>',
    ok: 'บันทึกรหัสผ่านใหม่',
    onOk: function (el) {
      var o = mv('cpOld'), n = mv('cpNew'), n2 = mv('cpNew2');
      if (n.length < 8) return dlgErr(el, 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร');
      if (n !== n2) return dlgErr(el, 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      if (n === o) return dlgErr(el, 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม');
      /* รุ่น 16.1 — หลังบ้านคืนโทเคนใหม่ (โทเคนเดิมใช้ไม่ได้แล้ว) ต้องเก็บไว้ ไม่งั้นคำสั่งถัดไปเด้งออก */
      return api('changePass', { oldPass: o, newPass: n }, { write: true }).then(function (r) {
        if (r && r.token) setToken(r.token);
        toast('เปลี่ยนรหัสผ่านเรียบร้อย', 'ok');
        setTimeout(function () { start().catch(bootFail); }, 50);
      });
    }
  });
}

/* ═══════════════ เมนูตามบทบาท ═══════════════ */
function has(role) { return S.me && S.me.user.roles.indexOf(role) >= 0; }
function isAdmin() { return has('admin'); }
function isHr()    { return has('hr') || has('admin'); }
function isAcct()  { return has('account') || has('admin'); }
function isStaff() { return isHr() || isAcct() || has('head'); }
/** เจ้าหน้าที่ทำเบิกแพทย์แผนไทย (รุ่น 16.1) — เห็นเฉพาะหมวดแพทย์แผนไทย ไม่เห็น DF แพทย์ทั่วไป/สูติ */
function ttmOn()   { return !(S.me && S.me.ttmInMd === false); }   /* 20 ต.ค. 69 — แผนไทยแยกไป SMC TTM */
function isTtm()   { return ttmOn() && has('ttm'); }
function canTtm()  { return ttmOn() && (isTtm() || isHr()); }

/* รุ่น 16.1 ข้อ 3 — จัดเมนูเป็นหมวด พับ/กางได้ (จำไว้ในเครื่อง) */
function menu() {
  var n = S.me.notice || {};
  var m = [];
  if (has('doctor')) {
    m.push({ g: 'ของฉัน', id: 'me' });
    m.push({ p: 'my', ic: 'baht', t: 'ยอดค่าตอบแทนของฉัน' });
    m.push({ p: 'myPending', ic: 'clock', t: 'ยอดค้างจ่ายของฉัน' });
    m.push({ p: 'myProfile', ic: 'user', t: 'ประวัติและสัญญาของฉัน' });
  }
  if (isStaff()) {
    m.push({ g: 'ภาพรวม', id: 'ov' });
    m.push({ p: 'dash', ic: 'dash', t: 'แดชบอร์ด' });
    m.push({ p: 'month', ic: 'month', t: 'สรุปรายเดือน' });
    m.push({ p: 'range', ic: 'calendar', t: 'รายงานตามช่วงวันที่' });
    m.push({ g: 'ตรวจสอบประจำวัน', id: 'chk' });
    m.push({ p: 'day', ic: 'calendar', t: 'ตรวจรายวัน', badge: n.waitGroup || 0, bad: true });
    m.push({ p: 'audit', ic: 'alert', t: 'รายงานที่ต้องตรวจสอบ' });
    m.push({ p: 'hn', ic: 'search', t: 'ค้นหาจาก HN' });
    m.push({ p: 'reassign', ic: 'swap', t: 'DF ลงชื่อผิดคน' });
    m.push({ g: 'การเงินติดตาม', id: 'fin' });
    m.push({ p: 'pending', ic: 'clock', t: 'ติดตามยอดค้างจ่าย' });
    m.push({ p: 'writeoff', ic: 'slash', t: 'หนี้เสีย / หนี้ศูนย์' });
    m.push({ p: 'backpay', ic: 'refresh', t: 'ตกเบิก / เรียกคืน', badge: n.backpayOpen || 0 });
  } else if (isTtm()) {
    m.push({ g: 'ตรวจสอบ', id: 'chk' });
    m.push({ p: 'audit', ic: 'alert', t: 'รายงานที่ต้องตรวจสอบ' });
    m.push({ p: 'hn', ic: 'search', t: 'ค้นหาจาก HN' });
    m.push({ p: 'backpay', ic: 'refresh', t: 'ตกเบิก / เรียกคืน', badge: n.backpayOpen || 0 });
  }
  if (isHr()) {
    m.push({ g: 'รอบเบิกและเอกสาร', id: 'close' });
    m.push({ p: 'close', ic: 'check', t: 'ตัดรอบและออกเอกสาร' });
    m.push({ p: 'import', ic: 'file', t: 'นำเข้าผลเบิกจาก Excel' });
    m.push({ p: 'docs', ic: 'printer', t: 'ใบแจ้งยอดรายคน' });
  }
  if (ttmOn() && (canTtm() || (isAcct() && !has('head')))) {
    m.push({ g: 'แพทย์แผนไทย', id: 'ttm' });
    m.push({ p: 'ttm', ic: 'leaf', t: 'รายงานแพทย์แผนไทย' });
    m.push({ p: 'ttmItems', ic: 'list', t: 'รายการ DF และรอบเวร' });
    m.push({ p: 'ttmShifts', ic: 'clock', t: 'ตารางเวรแพทย์แผนไทย' });
    if (isHr()) m.push({ p: 'ttmSettings', ic: 'settings', t: 'ตั้งค่าแพทย์แผนไทย' });
  }
  if (isHr()) {
    m.push({ g: 'ทะเบียน', id: 'reg' });
    m.push({ p: 'contracts', ic: 'file', t: 'ทะเบียนสัญญา 40(6)', badge: n.contractFlags || 0 });
  }
  if (isAdmin()) {
    m.push({ g: 'ตั้งค่าและผู้ใช้', id: 'sys' });
    m.push({ p: 'rights', ic: 'scale', t: 'สิทธิการรักษา' });
    m.push({ p: 'dfcodes', ic: 'hash', t: 'รหัสค่าธรรมเนียม' });
    m.push({ p: 'groups', ic: 'shuffle', t: 'กฎจัดกลุ่มการเบิก' });
    m.push({ p: 'settings', ic: 'settings', t: 'ตั้งค่าระบบ' });
    m.push({ p: 'users', ic: 'users', t: 'ผู้ใช้งาน' });
    m.push({ p: 'logs', ic: 'list', t: 'ประวัติการใช้งาน' });
  }
  return m;
}
function firstPage() {
  var m = menu();
  if (isTtm() && !isStaff()) return 'ttm';
  for (var i = 0; i < m.length; i++) if (m[i].p) return m[i].p;
  return 'my';
}
function navState() { try { return JSON.parse(localStorage.getItem('smcmd_nav') || '{}') || {}; } catch (e) { return {}; } }
function navToggle(id) {
  var st = navState(); st[id] = !st[id];
  try { localStorage.setItem('smcmd_nav', JSON.stringify(st)); } catch (e) { }
  drawNav();
}
function drawNav() {
  var html = '', m = menu(), st = navState(), cur = null, groups = [];
  for (var i = 0; i < m.length; i++) {
    if (m[i].g) { cur = { g: m[i], items: [] }; groups.push(cur); }
    else if (cur) cur.items.push(m[i]); else { cur = { g: null, items: [m[i]] }; groups.push(cur); }
  }
  groups.forEach(function (G) {
    var hasOn = G.items.some(function (x) { return x.p === S.page; });
    var shut = G.g && st[G.g.id] && !hasOn;            /* หมวดของหน้าที่เปิดอยู่กางเสมอ */
    var badge = G.items.reduce(function (a, x) { return a + (x.badge || 0); }, 0);
    if (G.g) html += '<button type="button" class="grp' + (shut ? ' shut' : '') + '" onclick="navToggle(\'' + G.g.id + '\')" aria-expanded="' + (!shut) + '">' +
      '<span>' + esc(G.g.g) + '</span>' + (shut && badge ? '<span class="pill">' + N(badge) + '</span>' : '') + I('right', 'sm') + '</button>';
    html += '<div class="grp-b' + (shut ? ' shut' : '') + '">';
    G.items.forEach(function (x) {
      html += '<a href="#' + x.p + '" data-p="' + x.p + '" title="' + esc(x.t) + '" class="' + (x.p === S.page ? 'on' : '') + '">' + I(x.ic) +
        '<span>' + esc(x.t) + '</span>' + (x.badge ? '<span class="pill' + (x.bad ? ' bad' : '') + '">' + N(x.badge) + '</span>' : '') + '</a>';
    });
    html += '</div>';
  });
  document.getElementById('nav').innerHTML = html;
}
/** ย่อ/ขยายแถบเมนูด้านซ้าย (จอคอม) — ให้พื้นที่ตารางกว้างขึ้นบนจอ 1440 */
function toggleMini() {
  var on = !document.getElementById('app').classList.contains('mini');
  document.getElementById('app').classList.toggle('mini', on);
  try { localStorage.setItem('smcmd_mini', on ? '1' : '0'); } catch (e) { }
  if (window.CH && CH.redrawAll) setTimeout(function () { CH.redrawAll(); }, 260);
}
function openSide(on) {
  var s = document.getElementById('side');
  s.classList.toggle('open', on);
  var sc = document.getElementById('sideScrim');
  if (on && !sc) {
    sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'sideScrim';
    sc.onclick = function () { openSide(false); };
    document.body.appendChild(sc);
  } else if (!on && sc) sc.remove();
}

/* ═══════════════ เส้นทางหน้า ═══════════════ */
var ROUTES = {};
function go(page, arg) {
  if (!S.me) return;
  var allowed = menu().filter(function (x) { return x.p; }).map(function (x) { return x.p; });
  if (allowed.indexOf(page) < 0) page = firstPage();
  S.page = page; S.arg = arg || '';
  var h = '#' + page + (arg ? ':' + arg : '');
  if (location.hash !== h) history.replaceState(null, '', h);
  drawNav();
  openSide(false);
  UI.closeDrawer(true);
  window.scrollTo(0, 0);
  if (window.CH) CH.destroyAll();
  var fn = ROUTES[page];
  if (!fn) return V(card('', note('warn', 'ยังไม่มีหน้านี้')));
  try { fn(arg); } catch (e) { showErr(e); }
}
function refreshPage() {
  clearCache();
  go(S.page, S.arg);
}

function bootDone() { var b = document.getElementById('boot'); if (b && !b.classList.contains('out')) { b.classList.add('out'); setTimeout(function () { b.remove(); }, 320); } }

function start() {
  return api('me').then(function (d) {
    S.me = d;
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    bootDone();
    var u = d.user, nm = (u.title ? u.title + ' ' : '') + (u.name || u.empCode);
    document.getElementById('meBox').innerHTML = '<div class="av">' + esc(String(u.name || u.empCode).replace(/^(นพ\.|พญ\.|นาย|นาง|นางสาว|ทพ\.|ทพญ\.|พท\.ป\.)\s*/, '').charAt(0)) + '</div>' +
      '<div class="who"><b>' + esc(nm) + '</b><small>' + esc(u.roleTh.join(' · ')) + '</small></div>';
    document.getElementById('verBox').textContent = 'รุ่น ' + CFG.BUILD;
    themeIcon();
    if (u.mustChange) { showChangePass(true); return; }
    var h = location.hash.slice(1).split(':');
    go(h[0] || firstPage(), h.slice(1).join(':'));
    recallPopup();
  });
}

/** รุ่น 16.1 ข้อ 6.2 — มีรายการเรียกคืน (ยอดลดหลังปิดรอบ) ที่ยังไม่ตัดสิน → แจ้งฝ่ายบัญชีและ HR ทันทีที่เข้าระบบ (ครั้งเดียวต่อการเข้าใช้) */
function recallPopup() {
  var rc = (S.me.notice && S.me.notice.recall) || [];
  if (!rc.length || S.recallShown || !(isHr() || isAcct() || isTtm())) return;
  try { if (sessionStorage.getItem('smcmd_recall') === String(rc.length)) return; sessionStorage.setItem('smcmd_recall', String(rc.length)); } catch (e) { }
  S.recallShown = true;
  var sum = rc.reduce(function (a, r) { return a + Number(r.diff || 0); }, 0);
  UI.dialog({ title: 'มีรายการเรียกคืน ' + N(rc.length) + ' รายการ', icon: 'alert', tone: 'bad', wide: true,
    sub: 'ยอดในระบบโรงพยาบาลลดลงหลังปิดรอบ · รวม ' + B(sum) + ' บาท (ยอดรับรอง)',
    body: note('warn', 'ฝ่ายบัญชีตรวจสาเหตุ (ยกเลิกใบเสร็จ/คืนเงินผู้ป่วย/แก้สิทธิ) · HR ตัดสินว่าจะ <b>หักคืนในรอบจ่ายถัดไป</b> หรือ <b>ไม่เรียกคืน</b> พร้อมเหตุผล ที่หน้า ตกเบิก / เรียกคืน') +
      '<div class="tw"><table class="t compact"><thead><tr><th>รอบที่ปิด</th><th>แพทย์</th><th>วันที่</th><th>HN</th><th class="n">ส่วนต่าง</th></tr></thead><tbody>' +
      rc.slice(0, 12).map(function (r) {
        return '<tr><td>' + esc(r.ymClosedTh) + '</td><td>' + esc(r.dctName || r.dct) + '</td><td>' + (r.date ? dTh(r.date) : '—') + '</td><td class="mono">' + esc(r.hn || '—') +
          '</td><td class="n badc">' + B(r.diff) + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (rc.length > 12 ? '<div class="small muted" style="margin-top:6px">และอีก ' + N(rc.length - 12) + ' รายการ</div>' : ''),
    ok: 'ไปหน้าตกเบิก / เรียกคืน', cancel: 'ไว้ทีหลัง',
    onOk: function () { setTimeout(function () { S.bpChip = 'down'; go('backpay'); }, 50); } });
}

/** เปิดระบบไม่สำเร็จ — โทเคนใช้ไม่ได้ → หน้าเข้าสู่ระบบ · เครือข่าย/หลังบ้านขัดข้อง → แจ้งให้ลองใหม่ (ไม่ล้างการเข้าระบบ) */
function bootFail(e) {
  if (!S.token) return;           /* api() ออกจากระบบให้แล้วกรณีโทเคนใช้ไม่ได้ */
  showLogin();
  loginError('เปิดระบบไม่สำเร็จ: ' + ((e && e.message) || e) + ' — กดรีเฟรชหน้า หรือเข้าสู่ระบบอีกครั้ง');
}

function boot() {
  initLogin();
  themeIcon();
  try { if (localStorage.getItem('smcmd_mini') === '1') document.getElementById('app').classList.add('mini'); } catch (e) { }
  document.getElementById('btnOut').onclick = askLogout;
  document.getElementById('btnPass').onclick = function () { showChangePass(false); };
  document.getElementById('btnTheme').onclick = toggleTheme;
  var mb = document.getElementById('btnMini'); if (mb) mb.onclick = toggleMini;
  document.getElementById('burger').onclick = function () { openSide(!document.getElementById('side').classList.contains('open')); };
  document.getElementById('nav').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-p]');
    if (a) { e.preventDefault(); go(a.getAttribute('data-p')); }
  });
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1).split(':');
    var arg = h.slice(1).join(':');
    if (h[0] && (h[0] !== S.page || arg !== S.arg)) go(h[0], arg);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { UI.closeDrawer(); openSide(false); }
  });

  var tk = '', at = 0;
  try { tk = localStorage.getItem('smcmd_tk') || ''; at = Number(localStorage.getItem('smcmd_at') || 0); } catch (e) { }
  var maxAge = (CFG.TOKEN_HOURS || 8) * 3600 * 1000;
  if (tk && at && (Date.now() - at) < maxAge) {
    S.token = tk;
    start().catch(bootFail);
  } else showLogin();
}
