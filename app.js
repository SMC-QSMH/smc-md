/* SMC MD — app.js
 * แกนหน้าเว็บ: เรียกหลังบ้าน · ล็อกอิน · เมนู · เส้นทางหน้า · ตัวช่วยแสดงผล
 *
 * ⚠ กับดักที่เคยทำให้ระบบพัง (บทเรียนจากระบบ SMC DF ทันตกรรม)
 *   1. fetch ต้องส่ง Content-Type: text/plain เท่านั้น
 *      ถ้าใส่ application/json เบราว์เซอร์จะส่ง preflight (OPTIONS) ซึ่ง Apps Script
 *      ตอบไม่ได้ → ขึ้น CORS error ทั้งระบบ
 *   2. ห้ามใช้ new Date('2569-10-14') แปลงวันที่ เพราะบางเบราว์เซอร์ตีความเป็น UTC
 *      แล้วเพี้ยนไป 1 วัน · ให้ตัดสตริงหรือใช้ Date.UTC เสมอ
 *   3. ตัวเลขเงินให้ฟอร์แมตตอนแสดงผลเท่านั้น ห้ามเก็บเป็นสตริงแล้วคำนวณต่อ
 */

/* ═══════════════ สถานะ ═══════════════ */
var S = {
  token: '', me: null, page: '', busy: 0,
  cache: {}, timer: null
};

/* ═══════════════ เรียกหลังบ้าน ═══════════════ */
function bar(on) {
  var b = document.getElementById('bar');
  S.busy += on ? 1 : -1;
  if (S.busy < 0) S.busy = 0;
  b.style.width = S.busy ? '70%' : '0';
  if (!S.busy) setTimeout(function () { if (!S.busy) b.style.width = '0'; }, 220);
}

function rid_() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * api — เรียกคำสั่งหลังบ้าน
 *  คืน data เมื่อสำเร็จ · throw Error พร้อมข้อความไทยเมื่อไม่สำเร็จ
 */
function api(action, payload, opt) {
  opt = opt || {};
  if (!CFG.API_URL || CFG.API_URL.indexOf('PASTE_') === 0) {
    return Promise.reject(new Error('ยังไม่ได้ตั้งค่า API_URL ในไฟล์ config.js'));
  }
  bar(true);
  var body = { action: action, payload: payload || {}, token: S.token };
  if (opt.write) body._rid = rid_();

  return fetch(CFG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },   /* ห้ามเปลี่ยน — ดูหมายเหตุด้านบน */
    body: JSON.stringify(body),
    redirect: 'follow'
  }).then(function (r) {
    if (!r.ok) throw new Error('เชื่อมต่อหลังบ้านไม่ได้ (รหัส ' + r.status + ')');
    return r.text();
  }).then(function (txt) {
    var o;
    try { o = JSON.parse(txt); }
    catch (e) {
      throw new Error('หลังบ้านตอบกลับมาไม่ถูกรูปแบบ — มักเกิดจากยัง Deploy เวอร์ชันใหม่ไม่สำเร็จ');
    }
    bar(false);
    if (o.mustChange) { showChangePass(true); throw new Error('กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน'); }
    if (!o.ok) {
      if (/โทเคน|หมดอายุ|ล็อกอิน/.test(o.error || '')) { logout(true); }
      throw new Error(o.error || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }
    if (o.build && CFG.BUILD && o.build !== CFG.BUILD) {
      warnBuild(o.build);
    }
    return o.data;
  }).catch(function (e) {
    bar(false);
    throw e;
  });
}

var _buildWarned = false;
function warnBuild(serverBuild) {
  if (_buildWarned) return;
  _buildWarned = true;
  toast('รุ่นของหน้าเว็บ (' + CFG.BUILD + ') ไม่ตรงกับหลังบ้าน (' + serverBuild + ') · ' +
        'กดรีเฟรชหน้าแบบล้างแคช (Ctrl+Shift+R) เพื่อให้ได้เวอร์ชันล่าสุด', 'warn', 12000);
}

/* ═══════════════ ตัวช่วยแสดงผล ═══════════════ */
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function B(n) {   /* เงิน 2 ตำแหน่ง */
  var v = Number(n || 0);
  return v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function N(n) {   /* จำนวนนับ */
  return Number(n || 0).toLocaleString('th-TH');
}
function K(n) {   /* ย่อหลักพัน/ล้าน สำหรับการ์ดสรุป */
  var v = Number(n || 0);
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(2) + ' ล้าน';
  if (Math.abs(v) >= 1e4) return Math.round(v / 1e3).toLocaleString('th-TH') + 'K';
  return B(v);
}
var TH_MON = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
              'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
var TH_MON_FULL = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                   'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
function dTh(s) {          /* 2026-10-14 → 14 ต.ค. 69 */
  var p = String(s || '').slice(0, 10).split('-');
  if (p.length < 3) return esc(s || '');
  return Number(p[2]) + ' ' + TH_MON[Number(p[1])] + ' ' + String(Number(p[0]) + 543).slice(2);
}
function ymTh(s) {         /* 2026-10 → ตุลาคม 2569 */
  var p = String(s || '').split('-');
  if (p.length < 2) return esc(s || '');
  return TH_MON_FULL[Number(p[1])] + ' ' + (Number(p[0]) + 543);
}
function ymShort(s) {
  var p = String(s || '').split('-');
  if (p.length < 2) return esc(s || '');
  return TH_MON[Number(p[1])] + String(Number(p[0]) + 543).slice(2);
}
function today() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function thisYm() { return today().slice(0, 7); }
function ymAdd(ym, n) {
  var p = String(ym).split('-');
  var m = Number(p[1]) - 1 + Number(n);
  var y = Number(p[0]) + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  return y + '-' + ('0' + (m + 1)).slice(-2);
}
/** ตัวเลือกเดือน ย้อนหลัง n เดือนจากเดือนนี้ */
function ymOptions(sel, n) {
  n = n || 18;
  var cur = thisYm(), out = '';
  for (var i = 0; i < n; i++) {
    var ym = ymAdd(cur, -i);
    out += '<option value="' + ym + '"' + (ym === sel ? ' selected' : '') + '>' + ymTh(ym) + '</option>';
  }
  return out;
}

/** ป้ายสถานะการจ่าย */
var STATUS_CLASS = {
  'จ่ายแล้ว': 'ok', 'จ่ายบางส่วน': 'warn', 'ค้างจ่าย': 'warn',
  'ระงับโดยผู้จัดการ': 'bad', 'ไม่เบิก': 'plain', 'หนี้เสีย': 'bad',
  'หนี้ศูนย์': 'plain', 'รอจัดกลุ่ม': 'info'
};
/* ชื่อสถานะต้องตรงกับ PAY_STATUS ใน Config.gs ทุกตัวอักษร
   เพราะหลังบ้านตรวจค่าที่ส่งมาด้วย PAY_STATUS_VALID_() */
var PAY_STATUS_LIST = ['จ่ายแล้ว', 'จ่ายบางส่วน', 'ค้างจ่าย',
                       'ระงับโดยผู้จัดการ', 'ไม่เบิก'];
function tag(s, cls) {
  if (!s) return '';
  return '<span class="tag ' + (cls || STATUS_CLASS[s] || 'plain') + '">' + esc(s) + '</span>';
}

function toast(msg, kind, ms) {
  var el = document.createElement('div');
  el.className = 'note ' + (kind || 'info');
  el.style.cssText = 'position:fixed;z-index:400;right:16px;bottom:16px;max-width:400px;' +
                     'box-shadow:0 8px 24px rgba(16,24,40,.18);margin:0';
  el.innerHTML = '<span class="ic">' + (kind === 'bad' ? '✕' : kind === 'ok' ? '✓' : 'ℹ') +
                 '</span><span>' + esc(msg) + '</span>';
  document.body.appendChild(el);
  setTimeout(function () { el.remove(); }, ms || 5000);
}

function note(kind, html, icon) {
  return '<div class="note ' + kind + '"><span class="ic">' +
         (icon || (kind === 'bad' ? '⚠' : kind === 'warn' ? '⚠' : kind === 'ok' ? '✓' : 'ℹ')) +
         '</span><span>' + html + '</span></div>';
}

function kpi(lbl, val, sub, cls, valCls) {
  return '<div class="kpi ' + (cls || '') + '">' +
         '<div class="lbl">' + esc(lbl) + '</div>' +
         '<div class="val ' + (valCls || '') + '">' + val + '</div>' +
         (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>';
}

function V(html) { document.getElementById('view').innerHTML = html; }
function loading(what) {
  V('<div class="loading"><span class="spin"></span>' + esc(what || 'กำลังโหลดข้อมูล') + '</div>');
}
function showErr(e) {
  V('<div class="card">' + note('bad', esc(e && e.message ? e.message : e)) +
    '<div class="btn-row"><button onclick="go(S.page)">ลองอีกครั้ง</button>' +
    '<button onclick="go(firstPage())">กลับหน้าแรก</button></div></div>');
}

/* ═══════════════ โมดัล ═══════════════ */
function modal(title, bodyHtml, footHtml, wide) {
  var host = document.getElementById('modalHost');
  host.innerHTML =
    '<div class="modal-bg" onclick="if(event.target===this)closeModal()">' +
    '<div class="modal' + (wide ? ' wide' : '') + '">' +
    '<div class="mh"><h3>' + esc(title) + '</h3>' +
    '<button class="btn-sm" onclick="closeModal()">ปิด</button></div>' +
    '<div class="mb">' + bodyHtml + '</div>' +
    (footHtml ? '<div class="mf">' + footHtml + '</div>' : '') +
    '</div></div>';
}
function closeModal() { document.getElementById('modalHost').innerHTML = ''; }
function mv(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }

/* ═══════════════ ล็อกอิน ═══════════════ */
var loginMode = 'doctor';

function initLogin() {
  document.getElementById('loginBuild').textContent = 'รุ่น ' + CFG.BUILD;
  var tabs = document.getElementById('loginTabs');
  tabs.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    loginMode = b.getAttribute('data-mode');
    [].forEach.call(tabs.children, function (x) { x.classList.toggle('on', x === b); });
    var isDoc = loginMode === 'doctor';
    document.getElementById('userLabel').textContent = isDoc ? 'รหัสผู้ใช้ HIS' : 'รหัสพนักงาน';
    document.getElementById('loginHint').innerHTML =
      '<span class="ic">ℹ</span><span>' + (isDoc
        ? 'แพทย์เข้าใช้งานด้วยรหัสผู้ใช้เดียวกับระบบ HIS ของโรงพยาบาล เพื่อดูยอดค่าตอบแทน ยอดค้างจ่าย และสัญญาของตนเอง'
        : 'สำหรับเจ้าหน้าที่ฝ่ายบริหารงานบุคคล ฝ่ายบัญชี และผู้ดูแลระบบ ใช้รหัสพนักงานและรหัสผ่านที่ผู้ดูแลระบบกำหนด')
      + '</span>';
    document.getElementById('empCode').focus();
  });

  document.getElementById('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    doLogin();
  });
  document.getElementById('empCode').focus();
}

function loginError(msg) {
  var box = document.getElementById('loginErr');
  box.classList.toggle('hide', !msg);
  if (msg) box.querySelector('span:last-child').textContent = msg;
}

function doLogin() {
  var code = mv('empCode'), pass = mv('pass');
  if (!code || !pass) return loginError('กรุณากรอกรหัสผู้ใช้และรหัสผ่าน');
  loginError('');
  var btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...';

  api('login', { empCode: code, pass: pass, agent: loginMode, his: loginMode === 'doctor' })
    .then(function (d) {
      S.token = d.token;
      try {
        localStorage.setItem('smcmd_tk', d.token);
        localStorage.setItem('smcmd_at', String(Date.now()));
      } catch (e) { /* โหมดส่วนตัวเก็บไม่ได้ ไม่เป็นไร */ }
      return start();
    })
    .catch(function (e) {
      btn.disabled = false; btn.textContent = 'เข้าใช้งาน';
      loginError(e.message || 'เข้าใช้งานไม่สำเร็จ');
      document.getElementById('pass').value = '';
    });
}

function logout(silent) {
  S.token = ''; S.me = null; S.cache = {};
  try { localStorage.removeItem('smcmd_tk'); localStorage.removeItem('smcmd_at'); } catch (e) { }
  if (S.timer) { clearInterval(S.timer); S.timer = null; }
  document.getElementById('app').classList.add('hide');
  document.getElementById('loginScreen').classList.remove('hide');
  var btn = document.getElementById('loginBtn');
  btn.disabled = false; btn.textContent = 'เข้าใช้งาน';
  document.getElementById('pass').value = '';
  loginError(silent ? 'เซสชันหมดอายุ กรุณาเข้าใช้งานอีกครั้ง' : '');
}

function showChangePass(forced) {
  modal(forced ? 'ต้องตั้งรหัสผ่านใหม่ก่อนใช้งาน' : 'เปลี่ยนรหัสผ่าน',
    (forced ? note('warn', 'ระบบกำหนดให้ตั้งรหัสผ่านของตนเองก่อนเริ่มใช้งานครั้งแรก') : '') +
    '<label class="f"><span>รหัสผ่านเดิม</span><input id="cpOld" type="password" autocomplete="current-password"></label>' +
    '<label class="f"><span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span><input id="cpNew" type="password" autocomplete="new-password"></label>' +
    '<label class="f"><span>ยืนยันรหัสผ่านใหม่</span><input id="cpNew2" type="password" autocomplete="new-password"></label>' +
    '<div id="cpErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="saveChangePass()">บันทึกรหัสผ่านใหม่</button>');
}
function saveChangePass() {
  var o = mv('cpOld'), n = mv('cpNew'), n2 = mv('cpNew2');
  var err = document.getElementById('cpErr');
  if (n.length < 8) { err.innerHTML = note('bad', 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร'); return; }
  if (n !== n2)     { err.innerHTML = note('bad', 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน'); return; }
  if (n === o)      { err.innerHTML = note('bad', 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม'); return; }
  api('changePass', { oldPass: o, newPass: n }, { write: true })
    .then(function () {
      closeModal();
      toast('เปลี่ยนรหัสผ่านเรียบร้อย', 'ok');
      return start();
    })
    .catch(function (e) { err.innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════ เมนูตามบทบาท ═══════════════ */
function has(role) { return S.me && S.me.user.roles.indexOf(role) >= 0; }
function isAdmin() { return has('admin'); }
function isHr()    { return has('hr') || has('admin'); }
function isAcct()  { return has('account') || has('admin'); }
function isStaff() { return isHr() || isAcct() || has('head'); }

function menu() {
  var n = S.me.notice || {};
  var m = [];
  if (has('doctor')) {
    m.push({ g: 'ของฉัน' });
    m.push({ p: 'my',        ic: '฿', t: 'ยอดค่าตอบแทนของฉัน' });
    m.push({ p: 'myPending', ic: '⏳', t: 'ยอดค้างจ่ายของฉัน' });
    m.push({ p: 'myProfile', ic: '👤', t: 'ประวัติและสัญญาของฉัน' });
  }
  if (isStaff()) {
    m.push({ g: 'ภาพรวม' });
    m.push({ p: 'dash',  ic: '◫', t: 'แดชบอร์ด' });
    m.push({ p: 'month', ic: '▦', t: 'สรุปรายเดือน' });
    m.push({ p: 'day',   ic: '▤', t: 'ตรวจรายการรายวัน',
             badge: n.waitGroup || 0 });
    m.push({ g: 'การเงิน' });
    m.push({ p: 'pending',  ic: '⏳', t: 'ติดตามยอดค้างจ่าย' });
    m.push({ p: 'writeoff', ic: '⊘', t: 'หนี้เสีย / หนี้ศูนย์' });
    m.push({ p: 'backpay',  ic: '↻', t: 'ตกเบิก / เรียกคืน' });
  }
  if (isHr()) {
    m.push({ g: 'เอกสารและรอบเบิก' });
    m.push({ p: 'close',  ic: '✓', t: 'ตัดรอบและออกเอกสาร' });
    m.push({ p: 'docs',   ic: '🖨', t: 'ใบแจ้งยอดรายคน' });
    m.push({ g: 'ทะเบียน' });
    m.push({ p: 'contracts', ic: '📄', t: 'ทะเบียนสัญญา 40(6)',
             badge: n.contractFlags || 0 });
  }
  if (isAdmin()) {
    m.push({ p: 'rights',   ic: '⚖', t: 'สิทธิการรักษา' });
    m.push({ p: 'dfcodes',  ic: '#',  t: 'รหัสค่าธรรมเนียม' });
    m.push({ p: 'groups',   ic: '⇄', t: 'กฎจัดกลุ่มการเบิก' });
    m.push({ g: 'ระบบ' });
    m.push({ p: 'settings', ic: '⚙', t: 'ตั้งค่าระบบ' });
    m.push({ p: 'users',    ic: '👥', t: 'ผู้ใช้งาน' });
    m.push({ p: 'logs',     ic: '≡', t: 'ประวัติการใช้งาน' });
  }
  return m;
}

function firstPage() {
  var m = menu();
  for (var i = 0; i < m.length; i++) if (m[i].p) return m[i].p;
  return 'my';
}

function drawNav() {
  var html = '', m = menu();
  for (var i = 0; i < m.length; i++) {
    var x = m[i];
    if (x.g) { html += '<div class="grp">' + esc(x.g) + '</div>'; continue; }
    html += '<a href="#' + x.p + '" data-p="' + x.p + '" class="' + (x.p === S.page ? 'on' : '') + '">' +
            '<span class="ic">' + x.ic + '</span><span>' + esc(x.t) + '</span>' +
            (x.badge ? '<span class="pill">' + N(x.badge) + '</span>' : '') + '</a>';
  }
  document.getElementById('nav').innerHTML = html;
}

/* ═══════════════ เส้นทางหน้า ═══════════════ */
var ROUTES = {};   /* pages.js และ pages-admin.js ลงทะเบียนไว้ที่นี่ */

function go(page, arg) {
  if (!S.me) return;
  var allowed = menu().filter(function (x) { return x.p; }).map(function (x) { return x.p; });
  if (allowed.indexOf(page) < 0) page = firstPage();
  S.page = page;
  if (location.hash.slice(1).split(':')[0] !== page) {
    history.replaceState(null, '', '#' + page + (arg ? ':' + arg : ''));
  }
  drawNav();
  document.getElementById('nav').classList.remove('open');
  window.scrollTo(0, 0);
  var fn = ROUTES[page];
  if (!fn) return V('<div class="card">' + note('warn', 'ยังไม่มีหน้านี้') + '</div>');
  try { fn(arg); } catch (e) { showErr(e); }
}

function start() {
  return api('me').then(function (d) {
    S.me = d;
    document.getElementById('loginScreen').classList.add('hide');
    document.getElementById('app').classList.remove('hide');
    var u = d.user;
    document.getElementById('who').innerHTML =
      '<b>' + esc((u.title ? u.title + ' ' : '') + (u.name || u.empCode)) + '</b>' +
      esc(u.roleTh.join(' · '));
    if (u.mustChange) { showChangePass(true); return; }
    var h = location.hash.slice(1).split(':');
    go(h[0] || firstPage(), h[1]);
  });
}

function boot() {
  initLogin();
  document.getElementById('btnOut').onclick = function () {
    if (confirm('ออกจากระบบ?')) logout();
  };
  document.getElementById('btnPass').onclick = function () { showChangePass(false); };
  document.getElementById('burger').onclick = function () {
    document.getElementById('nav').classList.toggle('open');
  };
  document.getElementById('nav').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-p]');
    if (a) { e.preventDefault(); go(a.getAttribute('data-p')); }
  });
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1).split(':');
    if (h[0] && h[0] !== S.page) go(h[0], h[1]);
  });

  /* โทเคนที่เก็บไว้ ยังไม่หมดอายุก็เข้าได้เลย */
  var tk = '', at = 0;
  try { tk = localStorage.getItem('smcmd_tk') || ''; at = Number(localStorage.getItem('smcmd_at') || 0); }
  catch (e) { }
  var maxAge = (CFG.TOKEN_HOURS || 8) * 3600 * 1000;
  if (tk && at && (Date.now() - at) < maxAge) {
    S.token = tk;
    start().catch(function () { logout(true); });
  }
}
