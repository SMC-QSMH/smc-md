/* SMC MD — pages-ops.js (รุ่น 2569-10-16.1)
 * หน้างานตรวจสอบคุณภาพ
 *   ข้อ 1  รายงานที่ต้องตรวจสอบ — ส่งหน้างาน (แยกคลินิก + ฝ่าย) · HR ปิดสถานะ · พิมพ์ทั้งหมด/รายแพทย์
 *   ข้อ 4  ค้นหาจาก HN
 *   ข้อ 5  รายงานตามช่วงวันที่ (ดู/ส่งออกเท่านั้น · ปิดรอบ/HRMi/ใบแจ้งยอด ยังรายเดือน)
 *   ข้อ 12 DF ลงชื่อผิดคน — ระงับเข้ารายได้คลินิก / โอนให้แพทย์ที่ถูกต้อง + สถิติ
 */

/* ───────── ตัวเลือกช่วงวันที่ (ใช้ร่วมกัน) ───────── */
function fyStart(d) { var p = String(d || today()).split('-'); return (Number(p[1]) >= 10 ? p[0] : String(Number(p[0]) - 1)) + '-10-01'; }
function monthEnd(ym) { return new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).toISOString().slice(0, 10); }
function rangeBar(id, from, to, presets) {
  var t = today(), ym = thisYm(), lm = ymAdd(ym, -1);
  var P = presets || [['ym', 'เดือนนี้', ym + '-01', t], ['lm', 'เดือนก่อน', lm + '-01', monthEnd(lm)], ['7', '7 วันล่าสุด', shiftDay(t, -6), t], ['30', '30 วันล่าสุด', shiftDay(t, -29), t]];
  return '<div class="ftb" style="padding:0;border:0;background:transparent">' +
    '<label class="fld"><span>ตั้งแต่วันที่</span><input type="date" id="' + id + 'F" value="' + esc(from) + '"></label>' +
    '<label class="fld"><span>ถึงวันที่</span><input type="date" id="' + id + 'T" value="' + esc(to) + '"></label>' +
    '<div class="btn-row"><button class="btn pri" data-go>' + I('search', 'sm') + 'แสดงรายงาน</button></div>' +
    '<div class="btn-row" style="flex-basis:100%">' + P.map(function (x) {
      return '<button class="btn sm ghost" data-pre="' + x[2] + '|' + x[3] + '">' + esc(x[1]) + '</button>'; }).join('') +
    '<span class="small muted">ไม่เกิน 3 เดือนต่อครั้ง</span></div></div>';
}
function bindRange(id, run) {
  var f = document.getElementById(id + 'F'), t = document.getElementById(id + 'T');
  var host = f.closest('.ftb');
  host.querySelector('[data-go]').onclick = function () { run(f.value, t.value); };
  [].forEach.call(host.querySelectorAll('[data-pre]'), function (b) {
    b.onclick = function () { var p = b.getAttribute('data-pre').split('|'); f.value = p[0]; t.value = p[1]; run(p[0], p[1]); };
  });
  [f, t].forEach(function (x) { x.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(f.value, t.value); }); });
}

/* ═══════════════════════════════════════════════════════
   ข้อ 1 — รายงานที่ต้องตรวจสอบ
   ═══════════════════════════════════════════════════════ */
S.audit = { from: '', to: '' };
ROUTES.audit = function (arg) {
  var p = String(arg || '').split('|');
  var from = p[0] || S.audit.from || thisYm() + '-01', to = p[1] || S.audit.to || today();
  S.audit.from = from; S.audit.to = to;
  header('รายงานที่ต้องตรวจสอบ', 'รวมทุกเรื่องที่หน้างานต้องตามแก้ · ส่งให้คลินิกและฝ่าย · HR ปิดสถานะเมื่อแก้แล้ว',
    '<button class="btn sm" onclick="auditPrint(\'all\')">' + I('printer', 'sm') + '<span class="lbl">พิมพ์ตามที่กรอง</span></button>' +
    '<button class="btn sm" onclick="auditPrint(\'doctor\')">' + I('printer', 'sm') + '<span class="lbl">พิมพ์แยกรายแพทย์</span></button>' + refreshBtn());
  V(card('', rangeBar('au', from, to)) + '<div id="auOut"></div>');
  bindRange('au', function (f, t) { go('audit', f + '|' + t); });
  var out = document.getElementById('auOut');
  out.innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังโหลดข้อมูล</div><div class="sk sk-card"></div>';
  load('getAudit', { from: from, to: to }, function (D, meta) {
    S.cache.audit = D;
    var html = '<div class="btn-row" style="justify-content:space-between;margin-bottom:10px"><span class="small muted">' + dTh(D.from) + ' – ' + dTh(D.to) + ' · ' + N(D.days) + ' วัน</span>' + freshBadge(meta) + '</div>';
    if (D.noVisitData) html += note('info', 'มี ' + N(D.noVisitData) + ' วันที่ยังไม่มีรายชื่อผู้มารับบริการ (visit) เก็บไว้ จึงยังตรวจ "มาตรวจแต่ไม่มี DF" ของวันนั้นไม่ได้ — ดึงข้อมูลวันนั้นใหม่ที่หน้าตรวจรายวัน');
    if (!D.rows.length) { out.innerHTML = html + card('', note('ok', 'ช่วงนี้ไม่มีเรื่องที่ต้องตรวจสอบ')); return; }
    html += '<div class="issues" style="margin-bottom:16px">' + D.summary.map(function (x) {
      return '<button class="issue ' + x.tone + '" onclick="TBL.setChip(\'tAud\',\'k_' + x.kind + '\')"><div class="k"><span>' + esc(x.label) + '</span><b>' + N(x.count) + '</b></div>' +
        '<p>' + esc(x.hint) + ' · ยังไม่ส่ง ' + N(x.open) + '</p></button>'; }).join('') + '</div>';
    html += card('รายการที่ต้องตรวจสอบ', '<div id="tAud"></div>', { icon: 'alert', flush: true,
      sub: 'กรองตามคลินิก/ฝ่าย/แพทย์ แล้วกด "พิมพ์ตามที่กรอง" เพื่อส่งหน้างาน · ติ๊กเลือกแล้วบันทึกสถานะ' });
    out.innerHTML = html;
    var canSt = !has('doctor') || isStaff() || isTtm();
    TBL.make('tAud', { key: 'tAud', reset: true, rows: D.rows, exportName: 'รายงานต้องตรวจสอบ_' + D.from + '_' + D.to, select: canSt, pageSize: 100,
      orders: [{ id: 'dept', label: 'ฝ่าย → รหัส → วันที่', cmp: function (a, b) { return cmpDept()(a, b) || (a.date < b.date ? -1 : a.date > b.date ? 1 : 0); } },
               { id: 'clinic', label: 'คลินิก → วันที่', cmp: function (a, b) { return String(a.clinic).localeCompare(String(b.clinic), 'th') || (a.date < b.date ? -1 : 1); } },
               { id: 'date', label: 'วันที่', cmp: function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.time) < String(b.time) ? -1 : 1; } }],
      search: { placeholder: 'HN · แพทย์ · คลินิก · รายละเอียด', keys: ['hn', 'vn', 'dct', 'dctName', 'clinic', 'dept', 'detail', 'code', 'pttype', 'note'] },
      filters: [{ type: 'select', k: 'kindTh', label: 'ประเภท' }, { type: 'select', k: 'clinic', label: 'คลินิก' }, { type: 'select', k: 'dept', label: 'ฝ่าย' },
                { type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (r) { return (r.dctName || r.dct || '(ไม่ระบุ)'); } },
                { type: 'select', k: 'statusTh', label: 'สถานะ' }, { type: 'daterange', k: 'date', label: 'วันที่' }],
      chips: [{ id: 'open', label: 'ยังไม่ส่ง', tone: 'warn', fn: function (r) { return r.status === 'open'; } },
              { id: 'sent', label: 'ส่งหน้างานแล้ว', fn: function (r) { return r.status === 'sent'; } },
              { id: 'fixed', label: 'แก้แล้ว', fn: function (r) { return r.status === 'fixed'; } }]
        .concat(D.summary.map(function (x) { return { id: 'k_' + x.kind, label: x.label, tone: x.tone === 'bad' ? 'bad' : x.tone === 'warn' ? 'warn' : '', fn: function (r) { return r.kind === x.kind; } }; })),
      actions: canSt ? '<button class="btn sm" onclick="auditSet(\'sent\')">ส่งหน้างานแล้ว</button><button class="btn sm pri" onclick="auditSet(\'fixed\')">' + I('check', 'sm') + 'แก้แล้ว</button>' +
                       '<button class="btn sm ghost" onclick="auditSet(\'open\')">เปิดใหม่</button>' : '',
      rowCls: function (r) { return r.status === 'fixed' ? 'dim' : (r.tone === 'bad' && r.status === 'open' ? 'flag' : ''); },
      cols: [{ k: 'date', label: 'วันที่', type: 'date', render: function (r) { return '<span class="nowrap">' + dTh(r.date) + '</span>' + (r.time ? '<span class="sub">' + esc(String(r.time).slice(0, 5)) + '</span>' : ''); } },
             { k: 'kindTh', label: 'ประเภท', render: function (r) { return tag(r.kindTh, r.tone === 'bad' ? 'bad' : r.tone === 'warn' ? 'warn' : 'info'); } },
             { k: 'hn', label: 'HN', type: 'hn' }, { k: 'vn', label: 'VN', type: 'code' },
             { k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + (r.dct ? '<span class="sub mono">' + esc(r.dct) + '</span>' : ''); } },
             { k: 'clinic', label: 'คลินิก', cls: 'small' }, { k: 'dept', label: 'ฝ่าย', cls: 'small' },
             { k: 'code', label: 'รหัส', type: 'code' }, { k: 'pttype', label: 'สิทธิ', cls: 'small' },
             { k: 'total', label: 'ยอด', type: 'money0', sum: true },
             { k: 'detail', label: 'รายละเอียด', cls: 'small wrap', render: function (r) {
                 /* รุ่น 28.1 — ปุ่มแก้ทันทีของหัวข้อใหม่ */
                 var x = esc(r.detail || '');
                 if (r.kind === 'notdoctor' && r.suggestDct && (isHr() || isAcct()))
                   x += '<div style="margin-top:6px"><button class="btn sm" onclick="event.stopPropagation();auditTransfer(\'' + esc(r.caseId) + '\',\'' + esc(r.suggestDct) + '\',\'' + esc(r.suggestName || '') + '\',\'' + esc(r.dctName || '') + '\')">' + I('swap', 'sm') + 'โอนให้ ' + esc(r.suggestName || r.suggestDct) + '</button></div>';
                 if (r.kind === 'lockwait' && (isHr() || isAcct()))
                   x += '<div style="margin-top:6px"><button class="btn sm" onclick="event.stopPropagation();go(\'locks\',\'' + esc(String(r.date).slice(0, 7)) + '\')">' + I('lock', 'sm') + 'ไปตั้งชื่อแพทย์</button></div>';
                 return x; } },
             { k: 'statusTh', label: 'สถานะ', render: function (r) { return tag(r.statusTh, r.status === 'fixed' ? 'ok' : r.status === 'sent' ? 'info' : 'warn') +
                 (r.note ? '<span class="sub">' + esc(r.note) + '</span>' : '') + (r.by ? '<span class="sub">' + esc(r.by) + ' · ' + esc(r.at) + '</span>' : ''); } }] });
  }, { quiet: true, errTo: 'auOut' });
};
function auditSet(st) {
  var sel = TBL.selected('tAud');
  if (!sel.length) return toast('ยังไม่ได้เลือกรายการ — ติ๊กช่องหน้าแถวก่อน', 'warn');
  var lab = { sent: 'ส่งหน้างานแล้ว', fixed: 'แก้แล้ว', open: 'ยังไม่ส่ง (เปิดใหม่)' }[st];
  UI.dialog({ title: 'บันทึกสถานะ "' + lab + '" ' + N(sel.length) + ' รายการ', icon: 'check',
    body: '<label class="fld"><span>หมายเหตุ (ถ้ามี)</span><input id="auNote" placeholder="เช่น ส่งคลินิกอายุรกรรม 16 ต.ค. · หน้างานคีย์ DF เพิ่มแล้ว"></label>', ok: 'บันทึก',
    onOk: function () {
      return api('setAuditStatus', { ids: sel.map(function (r) { return r.id; }), status: st, note: mv('auNote') }, { write: true })
        .then(function (r) { toast('บันทึกแล้ว ' + N(r.done) + ' รายการ', 'ok'); go('audit', S.audit.from + '|' + S.audit.to); });
    } });
}
/** พิมพ์ส่งหน้างาน — แบบตาราง (ไม่เป็นทางการ) จัดกลุ่ม คลินิก → ฝ่าย · ใช้รายการตามที่กรองไว้ */
function auditPrint(mode) {
  var T = TBL.get('tAud'), D = S.cache.audit;
  if (!T || !D) return toast('กรุณาแสดงรายงานก่อน', 'warn');
  var rows = T.view.slice();
  if (!rows.length) return toast('ไม่มีรายการตามที่กรอง', 'warn');
  var head = function (sub) {
    return '<h2>รายการที่ต้องตรวจสอบ · คลินิกพิเศษเฉพาะทางนอกเวลา</h2><div class="pr-sub">' + esc(D.orgName) + '<br>ช่วงวันที่ ' + dTh(D.from) + ' – ' + dTh(D.to) +
      (sub ? ' · ' + sub : '') + ' · พิมพ์ ' + esc(D.printedAt) + ' โดย ' + esc(D.printedBy) + '</div>';
  };
  var tbl = function (list) {
    return '<table><thead><tr><th style="width:9%">วันที่</th><th>HN</th><th>VN</th><th>แพทย์</th><th>รหัส/สิทธิ</th><th class="n">ยอด</th><th style="width:16%">เรื่องที่ต้องตรวจ</th><th style="width:22%">รายละเอียด</th><th style="width:16%">ผลการตรวจสอบ / ผู้ตรวจ</th></tr></thead><tbody>' +
      list.map(function (r) {
        return '<tr><td>' + dTh(r.date) + (r.time ? ' ' + esc(String(r.time).slice(0, 5)) : '') + '</td><td>' + esc(r.hn) + '</td><td>' + esc(r.vn) + '</td><td>' + esc(r.dctName || '-') +
          (r.dct ? ' <span class="muted">(' + esc(r.dct) + ')</span>' : '') + '</td><td>' + esc(r.code || '') + (r.pttype ? '<br><span class="muted">' + esc(r.pttype) + '</span>' : '') + '</td>' +
          '<td class="n">' + (r.total ? B(r.total) : '') + '</td><td>' + esc(r.kindTh) + '</td><td>' + esc(r.detail) + '</td><td></td></tr>';
      }).join('') + '</tbody></table>';
  };
  var html = '';
  if (mode === 'doctor') {
    var by = {}, order = [];
    rows.forEach(function (r) { var k = r.dct || '(ไม่ระบุแพทย์)'; if (!by[k]) { by[k] = []; order.push(k); } by[k].push(r); });
    order.sort(function (a, b) { return cmpDept()(by[a][0], by[b][0]); });
    html = order.map(function (k) {
      var l = by[k], r0 = l[0];
      return '<div class="pr-page">' + head('แพทย์ ' + esc(r0.dctName || k) + (r0.dct ? ' (' + esc(r0.dct) + ')' : '') + (r0.dept ? ' · ' + esc(r0.dept) : '')) + tbl(l) +
        '<div class="small muted">รวม ' + N(l.length) + ' รายการ · กรุณาตรวจสอบและแจ้งผลกลับงานบริหารเงินเดือน ค่าจ้าง และค่าตอบแทน ฝ่ายทรัพยากรบุคคล</div></div>';
    }).join('');
  } else {
    var groups = {}, keys = [];
    rows.forEach(function (r) { var k = (r.clinic || '(ไม่ระบุคลินิก)') + '\u0001' + (r.dept || '(ไม่ระบุฝ่าย)'); if (!groups[k]) { groups[k] = []; keys.push(k); } groups[k].push(r); });
    keys.sort(function (a, b) { return a.localeCompare(b, 'th'); });
    html = head('รวม ' + N(rows.length) + ' รายการ') + keys.map(function (k) {
      var p = k.split('\u0001');
      return '<div class="pr-blk"><div class="pr-h">คลินิก: ' + esc(p[0]) + ' · ฝ่าย: ' + esc(p[1]) + ' (' + N(groups[k].length) + ' รายการ)</div>' + tbl(groups[k]) + '</div>';
    }).join('') + '<div class="small muted">กรุณาตรวจสอบและแจ้งผลกลับงานบริหารเงินเดือน ค่าจ้าง และค่าตอบแทน ฝ่ายทรัพยากรบุคคล</div>';
  }
  printSheet(html, true);
}

/* ═══════════════════════════════════════════════════════
   ข้อ 4 — ค้นหาจาก HN
   ═══════════════════════════════════════════════════════ */
ROUTES.hn = function (arg) {
  var p = String(arg || '').split('|'), hn = p[0] || '', from = p[1] || fyStart(), to = p[2] || today();
  header('ค้นหาจาก HN', 'ประวัติการมารับบริการและรายการ DF ของผู้ป่วย · ไม่แสดงชื่อผู้ป่วย · ระบบบันทึกการค้นหาทุกครั้ง', '');
  V(card('', '<div class="ftb" style="padding:0;border:0;background:transparent">' +
      '<label class="fld search"><span>HN</span>' + I('search', 'sm') + '<input id="hnQ" inputmode="numeric" value="' + esc(hn) + '" placeholder="เช่น 1234567"></label>' +
      '<label class="fld"><span>ตั้งแต่วันที่</span><input type="date" id="hnF" value="' + esc(from) + '"></label>' +
      '<label class="fld"><span>ถึงวันที่</span><input type="date" id="hnT" value="' + esc(to) + '"></label>' +
      '<div class="btn-row"><button class="btn pri" onclick="hnRun()">' + I('search', 'sm') + 'ค้นหา</button></div>' +
      '<div class="btn-row" style="flex-basis:100%"><button class="btn sm ghost" onclick="hnPre(\'' + fyStart() + '\')">ตั้งแต่ต้นปีงบ (ต.ค.)</button>' +
      '<button class="btn sm ghost" onclick="hnPre(\'' + shiftDay(today(), -365) + '\')">12 เดือนล่าสุด</button>' +
      '<button class="btn sm ghost" onclick="hnPre(\'' + shiftDay(today(), -90) + '\')">90 วันล่าสุด</button></div></div>') + '<div id="hnOut"></div>');
  var q = document.getElementById('hnQ');
  q.addEventListener('keydown', function (e) { if (e.key === 'Enter') hnRun(); });
  if (hn) hnRun(true); else q.focus();
};
function hnPre(f) { document.getElementById('hnF').value = f; document.getElementById('hnT').value = today(); hnRun(); }
function hnRun(noHash) {
  var hn = mv('hnQ').replace(/\D/g, ''), f = mv('hnF'), t = mv('hnT');
  if (!hn) return toast('กรุณากรอก HN', 'warn');
  if (!noHash) { S.arg = hn + '|' + f + '|' + t; history.replaceState(null, '', '#hn:' + S.arg); }
  var out = document.getElementById('hnOut');
  out.innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังค้นหา HN ' + esc(hn) + '</div><div class="sk sk-card"></div>';
  api('hnSearch', { hn: hn, from: f, to: t }).then(function (D) {
    var s = D.summary, html = '';
    if (D.noIndex && D.noIndex.length) html += note('warn', 'เดือน ' + D.noIndex.map(ymShort).join(', ') + ' ยังไม่มีดัชนี HN (ข้อมูลที่ดึงก่อนรุ่น 16.1) จึงยังค้นในเดือนนั้นไม่ได้' +
      (isHr() ? ' <button class="btn sm" onclick="hnBuild(' + esc(JSON.stringify(D.noIndex)).replace(/"/g, '&quot;') + ',this)">สร้างดัชนีเดือนเหล่านี้</button>' : ' — แจ้ง HR สร้างดัชนี'));
    html += '<div class="kpis">' + kpi('HN', '<span class="mono">' + esc(D.hn) + '</span>', dTh(D.from) + ' – ' + dTh(D.to), 'hero', 'search') +
      kpi('วันที่มารับบริการ', N(s.visits) + '<small>วัน</small>', '', '', 'calendar') +
      kpi('รายการ DF', N(s.items) + '<small>รายการ</small>', 'ยอดเรียกเก็บ ' + B(s.total), '', 'list') +
      kpi('แพทย์ที่เกี่ยวข้อง', N(s.doctors.length) + '<small>ท่าน</small>', esc(s.doctors.slice(0, 3).map(function (d) { return d.name; }).join(', ')), '', 'steth') + '</div>';
    if (!D.rows.length) { out.innerHTML = html + card('', emptyBox('ไม่พบ HN นี้ในช่วงวันที่ที่เลือก', 'search')); return; }
    html += '<div class="grid g2">' + card('สิทธิการรักษาที่ใช้', s.rights.map(function (r) { return tag(r, 'info'); }).join(' ') || '—', { icon: 'scale' }) +
      card('คลินิก', s.clinics.map(function (r) { return tag(r); }).join(' ') || '—', { icon: 'shuffle' }) + '</div>';
    html += card('ประวัติ (ใหม่ → เก่า)', '<div id="tHn"></div>', { icon: 'list', flush: true, sub: 'แถว "มารับบริการ" มาจากรายชื่อผู้รับบริการ (visit) · แถว DF มาจากรายการค่าธรรมเนียมแพทย์' });
    out.innerHTML = html;
    TBL.make('tHn', { key: 'tHn', reset: true, rows: D.rows, exportName: 'ประวัติHN_' + D.hn, pageSize: 200,
      filters: [{ type: 'select', k: 'kind', label: 'ชนิด', labelOf: function (r) { return r.kind === 'df' ? 'รายการ DF' : 'มารับบริการ'; } },
                { type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (r) { return r.dctName || r.dct; } }, { type: 'select', k: 'pttype', label: 'สิทธิ' }],
      rowCls: function (r) { return r.kind === 'visit' ? 'dim' : (r.status && !/จ่ายแล้ว|จ่ายบางส่วน/.test(r.status) ? 'flag' : ''); },
      onRow: function (r) { if (r.kind === 'df' && isStaff()) go('day', r.date); },
      cols: [{ k: 'date', label: 'วันที่', type: 'date', render: function (r) { return '<span class="nowrap">' + dTh(r.date) + '</span>' + (r.time ? '<span class="sub">' + esc(String(r.time).slice(0, 5)) + '</span>' : ''); } },
             { k: 'kind', label: 'ชนิด', render: function (r) { return r.kind === 'df' ? tag('DF', 'brand') : tag(r.cancelBy ? 'visit ยกเลิก' : 'มารับบริการ'); } },
             { k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + (r.dct ? '<span class="sub mono">' + esc(r.dct) + '</span>' : ''); } },
             { k: 'clinic', label: 'คลินิก', cls: 'small' }, { k: 'pttype', label: 'สิทธิ', cls: 'small' }, { k: 'vn', label: 'VN', type: 'code' },
             { k: 'code', label: 'รหัส', render: function (r) { return r.code ? '<span class="mono">' + esc(r.code) + '</span>' + (r.codeLabel ? '<span class="sub">' + esc(r.codeLabel) + '</span>' : '') : ''; } },
             { k: 'total', label: 'เรียกเก็บ', type: 'money0', sum: true }, { k: 'payable', label: 'นับจ่าย', type: 'money0', sum: true },
             { k: 'status', label: 'สถานะ', render: function (r) { return r.kind === 'df' ? tag(r.status) + (r.reason ? '<span class="sub">' + esc(r.reason) + '</span>' : '') : ''; } }] });
  }).catch(function (e) { out.innerHTML = note('bad', esc(e.message)); });
}
function hnBuild(yms, btn) {
  btn.disabled = true; var i = 0, done = 0;
  (function next() {
    if (i >= yms.length) { toast('สร้างดัชนีแล้ว ' + N(done) + ' เดือน', 'ok'); return hnRun(true); }
    btn.innerHTML = '<span class="spin"></span> ' + ymShort(yms[i]);
    api('hnIndexBuild', { ym: yms[i] }, { write: true }).then(function () { done++; }, function (e) { toast(ymShort(yms[i]) + ': ' + e.message, 'bad', 8000); })
      .then(function () { i++; next(); });
  })();
}

/* ═══════════════════════════════════════════════════════
   ข้อ 5 — รายงานตามช่วงวันที่
   ═══════════════════════════════════════════════════════ */
ROUTES.range = function (arg) {
  var p = String(arg || '').split('|'), from = p[0] || thisYm() + '-01', to = p[1] || today();
  header('รายงานตามช่วงวันที่', 'ดูและส่งออกได้ทุกช่วง (ไม่เกิน 3 เดือน) · การปิดรอบ ไฟล์ HRMi และใบแจ้งยอด ยังเป็นรายเดือน', printBtn());
  V(card('', rangeBar('rg', from, to)) + '<div id="rgOut"></div>');
  bindRange('rg', function (f, t) { go('range', f + '|' + t); });
  var out = document.getElementById('rgOut');
  out.innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังโหลดข้อมูล</div><div class="sk sk-card"></div>';
  load('getRange', { from: from, to: to }, function (D, meta) {
    var s = D.summary;
    var html = '<div class="btn-row" style="justify-content:space-between;margin-bottom:10px"><span class="small muted">' + dTh(D.from) + ' – ' + dTh(D.to) + ' · ' + N(D.days) + ' วัน</span>' + freshBadge(meta) + '</div>' +
      note('info', esc(D.note)) + (D.truncated ? note('warn', 'รายการละเอียดแสดง 20,000 รายการแรก — เลือกช่วงสั้นลงเพื่อดูครบ (ยอดสรุปครบทุกรายการ)') : '') +
      '<div class="kpis">' + kpi('ยอดรับรอง', B(s.base), 'ส่วนแพทย์ประมาณ ' + B(s.base * 0.8), 'hero', 'baht') +
      kpi('ยอดเรียกเก็บ', B(s.total), N(s.items) + ' รายการ', '', 'file') + kpi('ค้างเก็บ', B(s.outstanding), '', s.outstanding ? 'warn' : '', 'clock') +
      kpi('แพทย์', N(D.doctors.length) + '<small>ท่าน</small>', '', '', 'users') + '</div>';
    html += card('สรุปรายแพทย์', '<div id="tRgDoc"></div>', { icon: 'steth', flush: true, fold: 'rgDoc', sub: 'แตะแถวเพื่อกรองรายการละเอียด' }) +
      card('รายการละเอียด', '<div id="tRg"></div>', { icon: 'list', flush: true, fold: 'rgRows', open: false });
    out.innerHTML = html;
    TBL.make('tRgDoc', { key: 'tRgDoc', reset: true, rows: D.doctors, exportName: 'สรุปรายแพทย์_' + D.from + '_' + D.to, orders: ordersFor(), pageSize: 200,
      search: { placeholder: 'รหัส · ชื่อ · ฝ่าย', keys: ['dct', 'dctName', 'dept'] }, filters: [{ type: 'select', k: 'dept', label: 'ฝ่าย' }, { type: 'select', k: 'grpNames', label: 'หน่วย' }],
      onRow: function (r) { var d = document.querySelector('[data-fold="rgRows"]'); if (d) d.open = true; TBL.setFilter('tRg', 'dct', r.dct); },
      cols: [{ k: 'dct', label: 'รหัส', type: 'code' }, { k: 'dctName', label: 'ชื่อ - สกุล', render: function (r) { return '<b>' + esc(r.dctName || '—') + '</b><span class="sub">' + esc(r.dept || '') + '</span>'; } },
             { k: 'grpNames', label: 'หน่วย', cls: 'small' }, { k: 'cases', label: 'เคส', type: 'int', sum: true }, { k: 'items', label: 'รายการ', type: 'int', sum: true },
             { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'base', label: 'ยอดรับรอง', type: 'money', sum: true },
             { k: 'pay80Est', label: 'ส่วนแพทย์ (ประมาณ)', type: 'money', sum: true }, { k: 'outstanding', label: 'ค้างเก็บ', type: 'money0', sum: true },
             { k: 'notCounted', label: 'ไม่นับจ่าย', type: 'int', sum: true }] });
    TBL.make('tRg', { key: 'tRg', reset: true, rows: D.rows, exportName: 'รายการ_' + D.from + '_' + D.to, pageSize: 100,
      search: { placeholder: 'HN · แพทย์ · รหัส · สิทธิ', keys: ['hn', 'dct', 'dctName', 'code', 'pttype', 'clinic', 'status'] },
      filters: [{ type: 'daterange', k: 'date', label: 'วันที่' }, { type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (r) { return r.dctName || r.dct; } },
                { type: 'select', k: 'pttype', label: 'สิทธิ' }, { type: 'select', k: 'status', label: 'สถานะ' }, { type: 'select', k: 'clinic', label: 'คลินิก' }],
      rowCls: function (r) { return r.counted ? '' : 'dim'; },
      cols: [{ k: 'date', label: 'วันที่', type: 'date' }, { k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + '<span class="sub mono">' + esc(r.dct) + '</span>'; } },
             { k: 'hn', label: 'HN', type: 'hn' }, { k: 'pttype', label: 'สิทธิ', cls: 'small' }, { k: 'code', label: 'รหัส', type: 'code' }, { k: 'clinic', label: 'คลินิก', cls: 'small' },
             { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'collected', label: 'เก็บได้', type: 'money', sum: true },
             { k: 'payable', label: 'นับจ่าย', type: 'money0', sum: true }, { k: 'status', label: 'สถานะ', type: 'status' }] });
  }, { quiet: true, errTo: 'rgOut' });
};

/* ═══════════════════════════════════════════════════════
   ข้อ 12 — DF ลงชื่อผิดคน: ระงับเข้ารายได้คลินิก / โอนให้แพทย์ที่ถูกต้อง
   ═══════════════════════════════════════════════════════ */
var REASSIGN_CATS = ['พยาบาล/PN คีย์ DF แทนแพทย์', 'คีย์ DF ผิดแพทย์', 'แพทย์ไม่มีสัญญา 40(6)', 'ผู้จัดการคลินิกสั่งระงับ', 'อื่น ๆ'];
function doctorList() {
  if (S.cache.docList) return Promise.resolve(S.cache.docList);
  return api('getRegistry', { kind: 'contracts' }).then(function (D) {
    S.cache.docList = (D.doctors || []).filter(function (d) { return !d.hidden; }).map(function (d) { return { code: d.code, name: d.fullName || d.name || '', ok: !!(d.contract && d.contract.startDate) }; });
    return S.cache.docList;
  }).catch(function () { return []; });
}
/** ids = รายการที่เลือก (คีย์รายการ) · fromDct = รหัสที่ลงชื่อในระบบ รพ. — เลือกได้ว่าจะสั่งเฉพาะรายการ หรือทั้งเดือนของรหัสนั้น */
function reassignDlg(ids, action, fromDct, ym) {
  ids = ids || [];
  ym = ym || (ids[0] ? String(ids[0]).split('|')[1].slice(0, 7) : thisYm());
  doctorList().then(function (docs) {
    UI.dialog({ title: 'DF ลงชื่อผิดคน · รหัส ' + (fromDct || '—'), icon: 'swap', wide: true,
      sub: 'ฝ่ายบัญชี / HR / แอดมิน ทำได้ทันที ไม่ต้องรออนุมัติ · บันทึกผู้สั่งและเหตุผลไว้ตรวจย้อน · ยกเลิกคำสั่งได้ภายหลัง',
      body: '<div class="seg" id="raAct" style="margin-bottom:12px"><button type="button" data-a="suspend" class="' + (action === 'suspend' ? 'on' : '') + '">ระงับ · เข้ารายได้คลินิก</button>' +
          '<button type="button" data-a="transfer" class="' + (action === 'transfer' ? 'on' : '') + '">โอนให้แพทย์ที่ถูกต้อง</button></div>' +
        '<div class="fld"><span>ขอบเขต</span>' +
          (ids.length ? '<label class="chk"><input type="radio" name="raSc" value="item" checked><div><b>เฉพาะรายการที่เลือก (' + N(ids.length) + ' รายการ)</b></div></label>' : '') +
          (fromDct ? '<label class="chk"><input type="radio" name="raSc" value="month"' + (ids.length ? '' : ' checked') + '><div><b>ทั้งเดือน ' + ymTh(ym) + ' ของรหัส ' + esc(fromDct) + '</b><small>รวมรายการที่จะเข้ามาภายหลังในเดือนนี้ด้วย</small></div></label>' : '') + '</div>' +
        '<label class="fld" id="raToBox"' + (action === 'transfer' ? '' : ' style="display:none"') + '><span>โอนให้รหัสแพทย์ (แพทย์ผู้ตรวจจริง)</span><input id="raTo" list="raDocs" placeholder="พิมพ์รหัสหรือชื่อ">' +
          '<datalist id="raDocs">' + docs.map(function (d) { return '<option value="' + esc(d.code) + '">' + esc(d.name) + (d.ok ? '' : ' (ไม่มีสัญญา)') + '</option>'; }).join('') + '</datalist>' +
          '<div class="hint" id="raToName"></div></label>' +
        '<label class="fld"><span>ประเภท (ใช้ทำสถิติ)</span><select id="raCat">' + REASSIGN_CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></label>' +
        '<label class="fld"><span>เหตุผล</span><textarea id="raWhy" placeholder="เช่น PN คีย์ DF แทนแพทย์ ตรวจกับตารางเวรแล้วแพทย์ผู้ตรวจคือ …"></textarea></label>' +
        note('info', '<b>ระงับ</b> = ไม่จ่ายแพทย์ ยอดแสดงเป็น "รายได้คลินิก" แยกบรรทัดในรายงาน · <b>โอน</b> = ยอดไปเป็นของแพทย์ผู้ตรวจ (ต้องมีสัญญา 40(6)) · ' +
          'รอบที่ปิดแล้ว ระบบจะขึ้นเป็นตกเบิก/เรียกคืนให้อัตโนมัติ'),
      ok: 'บันทึกคำสั่ง',
      onOpen: function (el) {
        var cur = action;
        el.querySelector('#raAct').addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          cur = b.getAttribute('data-a'); el.querySelectorAll('#raAct button').forEach(function (x) { x.classList.toggle('on', x === b); });
          el.querySelector('#raToBox').style.display = cur === 'transfer' ? '' : 'none';
        });
        el._act = function () { return cur; };
        var to = el.querySelector('#raTo');
        to.addEventListener('input', function () {
          var d = docs.filter(function (x) { return x.code === to.value.trim(); })[0];
          el.querySelector('#raToName').innerHTML = d ? esc(d.name) + (d.ok ? ' · ' + tag('มีสัญญา', 'ok') : ' · ' + tag('ยังไม่พบสัญญา 40(6)', 'warn')) : '';
        });
      },
      onOk: function (el) {
        var act = el._act(), sc = (el.querySelector('input[name=raSc]:checked') || {}).value || 'item', why = mv('raWhy'), cat = mv('raCat');
        if (why.length < 5) return dlgErr(el, 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
        var p = { action: act, scope: sc, category: cat, reason: why };
        if (act === 'transfer') { p.toDct = mv('raTo'); if (!p.toDct) return dlgErr(el, 'กรุณาระบุรหัสแพทย์ที่จะโอนให้'); }
        if (sc === 'month') { p.ym = ym; p.fromDct = fromDct; } else p.ids = ids;
        return api('reassign', p, { write: true }).then(function (r) { toast(r.note, 'ok', 8000); go(S.page, S.arg); });
      } });
  });
}
function reassignSel(tbl, action) {
  var sel = TBL.selected(tbl);
  if (!sel.length) return toast('ยังไม่ได้เลือกรายการ — ติ๊กช่องหน้าแถวก่อน', 'warn');
  var froms = {}; sel.forEach(function (r) { froms[r.dct0 || r.dct] = 1; });
  var fk = Object.keys(froms);
  reassignDlg(sel.map(function (r) { return r.id; }), action, fk.length === 1 ? fk[0] : '');
}
function reassignUndo(id) {
  UI.confirm({ title: 'ยกเลิกคำสั่งระงับ/โอนนี้?', body: '<p>ยอดจะกลับเป็นของรหัสที่ลงชื่อในระบบโรงพยาบาลตามเดิม และระบบคำนวณเดือนนั้นใหม่</p>', ok: 'ยกเลิกคำสั่ง', danger: true })
    .then(function (y) {
      if (!y) return;
      api('reassignUndo', { id: id }, { write: true }).then(function () { toast('ยกเลิกคำสั่งแล้ว', 'ok'); go(S.page, S.arg); }).catch(function (e) { toast(e.message, 'bad', 9000); });
    });
}
ROUTES.reassign = function (arg) {
  var p = String(arg || '').split('|'), from = p[0] || shiftDay(today(), -365), to = p[1] || today();
  header('DF ลงชื่อผิดคน', 'ระงับเข้ารายได้คลินิก / โอนให้แพทย์ที่ถูกต้อง · สถิติแยกคลินิก คน และเดือน',
    ((isHr() || isAcct()) ? '<button class="btn sm pri" onclick="reassignMonthDlg()">' + I('plus', 'sm') + '<span class="lbl">สั่งทั้งเดือนของรหัสหนึ่ง</span></button>' : '') + refreshBtn());
  V(card('', rangeBar('ra', from, to, [['12', '12 เดือนล่าสุด', shiftDay(today(), -365), today()], ['fy', 'ปีงบนี้', fyStart(), today()]])) + '<div id="raOut"></div>');
  bindRange('ra', function (f, t) { go('reassign', f + '|' + t); });
  document.getElementById('raOut').innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังโหลดข้อมูล</div><div class="sk sk-card"></div>';
  load('getReassign', { from: from, to: to }, function (D, meta) {
    var act = D.rows.filter(function (r) { return r.status === 'active'; });
    var amtS = act.filter(function (r) { return r.action === 'suspend'; }).reduce(function (a, r) { return a + r.amount; }, 0);
    var amtT = act.filter(function (r) { return r.action === 'transfer'; }).reduce(function (a, r) { return a + r.amount; }, 0);
    var html = '<div class="btn-row" style="justify-content:flex-end;margin-bottom:10px">' + freshBadge(meta) + '</div><div class="kpis">' +
      kpi('คำสั่งที่มีผล', N(act.length), 'ยกเลิกแล้ว ' + N(D.rows.length - act.length), 'hero', 'swap') +
      kpi('ระงับ · เข้ารายได้คลินิก', B(amtS), N(act.filter(function (r) { return r.action === 'suspend'; }).length) + ' คำสั่ง', '', 'slash') +
      kpi('โอนให้แพทย์ที่ถูกต้อง', B(amtT), N(act.filter(function (r) { return r.action === 'transfer'; }).length) + ' คำสั่ง', '', 'swap') + '</div>';
    if (!D.rows.length) { document.getElementById('raOut').innerHTML = html + card('', note('ok', 'ยังไม่มีคำสั่งในช่วงนี้ · สั่งได้จากหน้าตรวจรายวัน (แตะรายการ) หรือปุ่ม "สั่งทั้งเดือนของรหัสหนึ่ง"')); return; }
    var hb = function (list, color) { return hbars(list.slice(0, 10).map(function (x) { return { label: x.key, v: x.count, sub: B(x.amount) + ' บาท', color: color }; }), { fmt: N }); };
    html += '<div class="grid g2">' + card('ตามประเภท', hb(D.byCategory, 'var(--c1)'), { icon: 'pie', sub: 'จำนวนคำสั่ง · ตัวเลขหลังแถบ = ยอด' }) +
      card('ตามคนที่ถูกลงชื่อ', hb(D.byPerson, 'var(--warn)'), { icon: 'user' }) + '</div>' +
      '<div class="grid g2">' + card('ตามคลินิก', hb(D.byClinic, 'var(--c3)'), { icon: 'shuffle' }) + card('ตามเดือน', hb(D.byMonth, 'var(--c0)'), { icon: 'month' }) + '</div>' +
      card('คำสั่งทั้งหมด', '<div id="tRa"></div>', { icon: 'list', flush: true });
    document.getElementById('raOut').innerHTML = html;
    TBL.make('tRa', { key: 'tRa', reset: true, rows: D.rows, exportName: 'DFลงชื่อผิดคน', initial: { chip: 'act' },
      search: { placeholder: 'รหัส · ชื่อ · เหตุผล', keys: ['fromDct', 'fromName', 'toDct', 'toName', 'reason', 'category', 'clinic'] },
      filters: [{ type: 'select', k: 'category', label: 'ประเภท' }, { type: 'select', k: 'clinic', label: 'คลินิก' }, { type: 'select', k: 'ymTh', label: 'เดือน' }],
      chips: [{ id: 'act', label: 'มีผล', fn: function (r) { return r.status === 'active'; } }, { id: 'undo', label: 'ยกเลิกแล้ว', fn: function (r) { return r.status !== 'active'; } }],
      rowCls: function (r) { return r.status === 'active' ? '' : 'dim'; },
      cols: [{ k: 'at', label: 'สั่งเมื่อ', cls: 'small nowrap', render: function (r) { return esc(r.at) + '<span class="sub">' + esc(r.by) + '</span>'; } },
             { k: 'actionTh', label: 'คำสั่ง', render: function (r) { return tag(r.actionTh, r.action === 'suspend' ? 'brand' : 'info') + '<span class="sub">' + esc(r.scopeTh) + (r.date ? ' · ' + dTh(r.date) : ' · ' + esc(r.ymTh)) + '</span>'; } },
             { k: 'fromDct', label: 'ลงชื่อในระบบ รพ.', render: function (r) { return '<span class="mono">' + esc(r.fromDct) + '</span><span class="sub">' + esc(r.fromName || '') + '</span>'; } },
             { k: 'toDct', label: 'โอนให้', render: function (r) { return r.toDct ? '<span class="mono">' + esc(r.toDct) + '</span><span class="sub">' + esc(r.toName || '') + '</span>' : '—'; } },
             { k: 'clinic', label: 'คลินิก', cls: 'small' }, { k: 'category', label: 'ประเภท', cls: 'small' }, { k: 'reason', label: 'เหตุผล', cls: 'small wrap' },
             { k: 'amount', label: 'ยอด', type: 'money', sum: true },
             { k: 'x', label: '', sort: false, export: false, render: function (r) { return r.status === 'active' && (isHr() || isAcct()) ? '<button class="btn sm" onclick="event.stopPropagation();reassignUndo(\'' + esc(r.id) + '\')">ยกเลิกคำสั่ง</button>' : tag(r.statusTh); } }] });
  }, { quiet: true, errTo: 'raOut' });
};
function reassignMonthDlg() {
  UI.dialog({ title: 'สั่งทั้งเดือนของรหัสหนึ่ง', icon: 'swap', body: '<div class="frow"><label class="fld"><span>รอบเดือน</span><select id="rmYm">' + ymOptions(thisYm(), 6) + '</select></label>' +
      '<label class="fld"><span>รหัสที่ลงชื่อผิด (ในระบบ รพ.)</span><input id="rmFrom" placeholder="เช่น รหัสพยาบาล/PN"></label></div>', ok: 'ถัดไป',
    onOk: function (el) {
      var f = mv('rmFrom'), ym = mv('rmYm'); if (!f) return dlgErr(el, 'กรุณาระบุรหัส');
      setTimeout(function () { reassignDlg([], 'suspend', f, ym); }, 200);
    } });
}
