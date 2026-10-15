/* SMC MD — pages-admin.js (รุ่น 2569-10-15.1)
 * ตัดรอบและออกเอกสาร · ใบแจ้งยอดรายคน · ทะเบียนสัญญา 40(6) · สิทธิ · รหัส DF
 * กฎจัดกลุ่ม · ตั้งค่าระบบ · ผู้ใช้งาน · ประวัติการใช้งาน
 */

/* ═══════════════════════════════════════════════════════
   ตัดรอบและออกเอกสาร
   ═══════════════════════════════════════════════════════ */
ROUTES.close = function (ym) {
  ym = ym || ymAdd(thisYm(), -1);
  header('ตัดรอบและออกเอกสาร', 'รอบ ' + ymTh(ym) + ' · ส่งฝ่ายทรัพยากรบุคคลไม่เกินวันที่ ' + esc((S.me.settings && S.me.settings.submitByDay) || 4) + ' ของเดือนถัดไป',
    monthPicker('close', ym) + refreshBtn());
  load('getMonth', { ym: ym, grp: 'ALL' }, function (D, meta) {
    var s = D.summary;
    var allClosed = D.groups.length && D.groups.every(function (g) { return g.status === 'closed'; });
    var html = '<div class="btn-row" style="justify-content:space-between;margin-bottom:12px"><div class="btn-row">' +
      D.groups.map(function (g) { return tag(g.grpName + ' · ' + g.statusTh, g.status === 'closed' ? 'ok' : 'warn'); }).join(' ') + '</div>' + freshBadge(meta) + '</div>';
    if (!s.doctors) {
      return V(html + card('', note('warn', 'รอบ ' + ymTh(ym) + ' ยังไม่มีข้อมูล · กรุณาดึงข้อมูลจากระบบโรงพยาบาลก่อน') +
        '<button class="btn pri" onclick="syncMonth(\'' + ym + '\')">' + I('refresh', 'sm') + 'ดึงข้อมูลทั้งเดือนนี้</button>'));
    }
    html += '<div class="kpis">' +
      kpi('ยอดรับรองรวม', B(s.base), N(s.doctors) + ' แพทย์ · ' + N(s.cases) + ' เคส', 'hero', 'baht') +
      kpi('ส่วนแพทย์', B(s.pay80), 'ยอดที่ต้องเบิก', 'good', 'steth') +
      kpi('ส่วนโรงพยาบาล', B(s.hos20), '', '', 'pie') +
      kpi('รอจัดกลุ่ม', N(D.waitGroup), D.waitGroup ? 'ต้องจัดก่อนปิดรอบ' : 'เรียบร้อย', D.waitGroup ? 'bad' : 'good', 'shuffle', D.waitGroup ? "go('day')" : '') + '</div>';
    if (D.waitGroup) html += note('bad', '<b>ยังปิดรอบไม่ได้</b> — มี ' + N(D.waitGroup) + ' รายการที่จับกลุ่มการเบิกไม่ได้ <a href="#day">ไปตรวจรายวัน</a> หรือ <a href="#groups">ตั้งกฎจัดกลุ่ม</a>');
    if (s.contractIssues) html += note('warn', 'มี ' + N(s.contractIssues) + ' แพทย์ที่ข้อมูลสัญญา 40(6) ยังไม่เรียบร้อย · ปิดรอบได้ แต่ควรตรวจก่อน <a href="#contracts">ตรวจทะเบียน</a>');

    var q = function (x) { return "'" + x + "'"; };
    var steps = [
      { t: 'ดึงข้อมูลทั้งเดือนให้เป็นปัจจุบัน', d: 'ยอดที่เรียกเก็บได้เปลี่ยนทุกวัน ควรดึงทับอีกครั้งก่อนปิดรอบ',
        b: '<button class="btn" onclick="syncMonth(' + q(ym) + ')">' + I('refresh', 'sm') + 'ดึงข้อมูลทั้งเดือน</button>' },
      { t: 'ตรวจรายการที่มีข้อสังเกต', d: 'จัดกลุ่มรายการที่จับไม่ได้ · ระงับจ่ายรายการที่คีย์ผิดคน · ตรวจสัญญาที่ขึ้นธง', done: !D.waitGroup,
        b: '<a class="btn sm" href="#day">ตรวจรายวัน</a><a class="btn sm" href="#month:' + ym + '">สรุปรายเดือน</a>' },
      { t: 'ปิดรอบ (ล็อกยอด)', d: 'บันทึกยอดของแต่ละแพทย์เป็นหลักฐาน ถ้าภายหลังยอดเปลี่ยน ระบบแจ้งเป็นรายการตกเบิกให้เอง', done: allClosed,
        b: allClosed ? tag('ปิดรอบแล้ว', 'ok') + (isAdmin() ? ' <button class="btn sm" onclick="reopenMonth(' + q(ym) + ')">เปิดรอบใหม่</button>' : '')
                     : '<button class="btn pri" onclick="closeMonth(' + q(ym) + ')"' + (D.waitGroup ? ' disabled' : '') + '>' + I('lock', 'sm') + 'ปิดรอบ ' + ymShort(ym) + '</button>' },
      { t: 'ออกรายงานขอเบิกส่งฝ่ายทรัพยากรบุคคล', d: 'Google Sheet พร้อมหัวรายงาน ยอดรวม และช่องลงนาม สั่งพิมพ์เป็น PDF ได้ทันที',
        b: '<button class="btn" onclick="mkDoc(\'buildHrReport\',{ym:' + q(ym) + ',grp:\'ALL\'},this)">' + I('file', 'sm') + 'ออกรายงานขอเบิก</button>' },
      { t: 'ออกไฟล์นำเข้า HRMi', d: 'ไฟล์ 7 คอลัมน์ · แยกรหัสรายได้ R101 (โรงพยาบาล) และ R106 (ศูนย์สาขา) · มีทั้ง Google Sheet และ CSV',
        b: '<button class="btn" onclick="mkDoc(\'buildHrmiFiles\',{ym:' + q(ym) + ',grp:\'ALL\'},this)">' + I('download', 'sm') + 'ออกไฟล์ HRMi</button>' },
      { t: 'ส่งรายการที่จ่ายแล้วกลับฝ่ายไอที', d: 'ไฟล์ CSV บอกว่ารายการใดจ่ายในรอบใด เพื่อกันการเบิกซ้ำ',
        b: '<button class="btn" onclick="mkDoc(\'buildPaidExport\',{ym:' + q(ym) + ',grp:\'ALL\'},this)">' + I('download', 'sm') + 'ออกไฟล์ส่งไอที</button>' },
      { t: 'ออกใบแจ้งยอดรายคน', d: 'ออกเฉพาะรายที่ขอ ระบบบันทึกไว้ว่าใครสั่งพิมพ์เมื่อใด', b: '<a class="btn sm" href="#docs">ไปหน้าใบแจ้งยอด</a>' }
    ];
    html += card('ขั้นตอนการทำรอบ', '<div class="steps">' + steps.map(function (st, i) {
      return '<div class="step' + (st.done ? ' done' : '') + '"><div class="no">' + (st.done ? I('tick', 'sm') : (i + 1)) + '</div><div><b>' + esc(st.t) + '</b><p>' + st.d + '</p></div>' +
        '<div class="btn-row" style="justify-content:flex-end">' + st.b + '</div></div>';
    }).join('') + '</div><div id="docOut" style="margin-top:14px"></div>', { icon: 'check' });
    V(html);
  }, { msg: 'กำลังตรวจความพร้อมของรอบ ' + ymTh(ym) });
};

function syncMonth(ym) {
  var last = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).toISOString().slice(0, 10);
  if (last > today()) last = today();
  UI.confirm({ title: 'ดึงข้อมูลทั้งเดือน ' + ymTh(ym) + '?', icon: 'refresh', tone: '',
    body: '<p>ดึงรายการจากระบบโรงพยาบาลใหม่ทั้งเดือน ทีละ 2 วัน (ประมาณ 2–6 นาที) · ระหว่างนี้อย่าปิดหน้านี้</p><p class="muted small" style="margin:0">การตัดสินใจที่เจ้าหน้าที่บันทึกไว้จะยังอยู่ครบ · ระบบจะเทียบรายการที่หาย/ยอดเปลี่ยนให้ในหน้าตรวจรายวัน</p>', ok: 'ดึงข้อมูล' })
    .then(function (y) {
      if (!y) return;
      /* รุ่น 15.3 — แบ่งเป็นช่วงละ 2 วัน กันหลังบ้านเกินเวลา 6 นาที แล้วสรุปเดือนครั้งเดียวตอนจบ */
      var chunks = [], d = ym + '-01';
      while (d <= last) { var e = shiftDay(d, 1); if (e > last) e = last; chunks.push([d, e]); d = shiftDay(e, 1); }
      var i = 0, rows = 0, errs = [];
      var bar = document.createElement('div'); bar.className = 'syncbar';
      document.body.appendChild(bar);
      function show(msg) { bar.innerHTML = '<span class="spin"></span><div><b>ดึงข้อมูล ' + ymTh(ym) + '</b><div class="small">' + msg + '</div>' +
        '<div class="pbar"><i style="width:' + Math.round(i / chunks.length * 100) + '%"></i></div></div>'; }
      function next() {
        if (i >= chunks.length) {
          show('กำลังสรุปยอดทั้งเดือน…');
          return api('rebuildMonth', { ym: ym }, { write: true }).then(function () {
            bar.remove();
            if (errs.length) UI.alert({ title: 'ดึงข้อมูลเสร็จ แต่มีบางช่วงไม่สำเร็จ', tone: 'warn', icon: 'alert', body: note('warn', errs.map(esc).join('<br>') + '<br>กดดึงข้อมูลอีกครั้งเพื่อลองช่วงที่ขาด') });
            else toast('ดึงข้อมูลเรียบร้อย ' + N(rows) + ' รายการ', 'ok', 8000);
            go(S.page, ym);
          }).catch(function (e) { bar.remove(); toast(e.message, 'bad', 12000); });
        }
        var c = chunks[i];
        show('ช่วง ' + (i + 1) + '/' + chunks.length + ' · ' + dTh(c[0]) + ' – ' + dTh(c[1]) + ' · ได้แล้ว ' + N(rows) + ' รายการ');
        return api('syncRange', { from: c[0], to: c[1], noMonth: true }, { write: true })
          .then(function (r) { rows += r.rows || 0; }, function (e) { errs.push(c[0] + ' – ' + c[1] + ': ' + e.message); })
          .then(function () { i++; return next(); });
      }
      show('เริ่ม…'); next();
    });
}

/* ═══════════════ นำเข้าผลเบิกจาก Excel (รุ่น 15.3) ═══════════════ */
var IMP_COLS = {
  dct: ['รหัสประจำตัว', 'รหัสแพทย์', 'รหัสพนักงาน', 'DCT'], name: ['แพทย์', 'ชื่อแพทย์', 'ชื่อ-สกุล'],
  date: ['วันที่', 'วันที่รับบริการ'], hn: ['HN'], right: ['สิทธิ', 'สิทธิการรักษา'],
  code: ['รหัสค่าใช้จ่าย', 'รหัส DF', 'รหัสค่าธรรมเนียม'], total: ['จำนวนเงินรวม', 'ยอดรวม'],
  h20: ['รพ. 20%', 'รพ.20%'], d80: ['แพทย์ 80%', 'แพทย์80%'], diff: ['ส่วนต่าง'], dept: ['ฝ่าย'], note: ['หมายเหตุ']
};
function loadXlsxLib() {
  if (window.XLSX) return Promise.resolve();
  return new Promise(function (ok, bad) {
    var sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    sc.onload = ok; sc.onerror = function () { bad(new Error('โหลดตัวอ่านไฟล์ Excel ไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองใหม่')); };
    document.head.appendChild(sc);
  });
}
function impDate(v) {
  var y, m, d;
  if (typeof v === 'number') {               // เลขวันที่ของ Excel
    var dt = new Date(Math.round((v - 25569) * 86400000));
    y = dt.getUTCFullYear(); m = dt.getUTCMonth() + 1; d = dt.getUTCDate();
  } else {
    var s = String(v || '').trim(), mm;
    if ((mm = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) { y = +mm[1]; m = +mm[2]; d = +mm[3]; }
    else if ((mm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/))) { d = +mm[1]; m = +mm[2]; y = +mm[3]; }
    else return '';
  }
  if (y > 2400) y -= 543;                     // ปี พ.ศ. → ค.ศ.
  return y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
}
ROUTES.import = function () {
  header('นำเข้าผลเบิกจาก Excel', 'ใช้กับเดือนที่ทำเบิกด้วยมือไปแล้ว เช่น ก.ย. 69 · ยอดในไฟล์จะเป็นยอดปิดรอบของเดือนนั้น', '');
  V(note('info', 'รองรับไฟล์รูปแบบ <b>DF_DR_SMC_ดด.ปป_ปรับปรุงยอด.xlsx</b> (คอลัมน์: รหัสประจำตัว · แพทย์ · วันที่ · HN · สิทธิ · รหัสค่าใช้จ่าย · จำนวนเงินรวม · รพ. 20% · แพทย์ 80% · … · ส่วนต่าง · ฝ่าย · หมายเหตุ)<br>' +
      'ไฟล์ถูกอ่านในเครื่องของท่าน ระบบส่งเฉพาะแถวข้อมูลไปบันทึก · หมายเหตุที่มีคำว่า <b>ค้างจ่าย</b> / <b>ระงับ</b> จะเข้าหน้าติดตามยอดค้างจ่ายให้เอง') +
    card('1. เลือกไฟล์', '<label class="drop" id="impDrop"><input type="file" id="impFile" accept=".xlsx,.xls" hidden>' + I('file') +
      '<b>คลิกเพื่อเลือกไฟล์ Excel</b><span class="muted small">หรือลากไฟล์มาวางที่นี่</span></label>', { icon: 'file' }) +
    '<div id="impOut"></div>');
  var inp = document.getElementById('impFile'), drop = document.getElementById('impDrop');
  inp.onchange = function () { if (inp.files[0]) impRead(inp.files[0]); };
  drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('on'); };
  drop.ondragleave = function () { drop.classList.remove('on'); };
  drop.ondrop = function (e) { e.preventDefault(); drop.classList.remove('on'); if (e.dataTransfer.files[0]) impRead(e.dataTransfer.files[0]); };
};
function impRead(file) {
  var out = document.getElementById('impOut');
  out.innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังอ่าน ' + esc(file.name) + '</div>';
  loadXlsxLib().then(function () {
    return file.arrayBuffer();
  }).then(function (buf) {
    var wb = XLSX.read(buf, { type: 'array' });
    var ws = wb.Sheets[wb.SheetNames[0]];
    var aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    var hi = -1, map = {};
    for (var r = 0; r < Math.min(10, aoa.length) && hi < 0; r++) {
      var hdr = aoa[r].map(function (x) { return String(x).trim(); });
      if (hdr.indexOf('HN') >= 0 || hdr.indexOf('จำนวนเงินรวม') >= 0) {
        hi = r;
        for (var k in IMP_COLS) for (var c = 0; c < hdr.length; c++) if (IMP_COLS[k].indexOf(hdr[c]) >= 0 && map[k] === undefined) map[k] = c;
      }
    }
    var need = ['dct', 'date', 'total'].filter(function (k) { return map[k] === undefined; });
    if (hi < 0 || need.length) throw new Error('ไม่พบหัวคอลัมน์ที่จำเป็น: ' + (need.length ? need.map(function (k) { return IMP_COLS[k][0]; }).join(', ') : 'รหัสประจำตัว / วันที่ / จำนวนเงินรวม'));
    var rows = [];
    for (var i = hi + 1; i < aoa.length; i++) {
      var a = aoa[i], g = function (k) { return map[k] === undefined ? '' : a[map[k]]; };
      if (String(g('dct')).trim() === '') continue;
      rows.push({ dct: String(g('dct')).replace(/\.0+$/, '').trim(), name: String(g('name')).trim(), date: impDate(g('date')),
                  hn: String(g('hn')).replace(/\.0+$/, '').trim(), right: String(g('right')).trim(), code: String(g('code')).trim(),
                  total: Number(g('total')) || 0, h20: Number(g('h20')) || 0, d80: Number(g('d80')) || 0,
                  diff: Number(g('diff')) || 0, dept: String(g('dept')).trim(), note: String(g('note')).trim() });
    }
    impPreview(file.name, rows);
  }).catch(function (e) { out.innerHTML = note('bad', esc(e.message)); });
}
function impPreview(fileName, rows) {
  var ymCount = {}, by = {}, tot = 0, h20 = 0, d80 = 0, pend = 0, mis = 0;
  rows.forEach(function (r) {
    var ym = r.date.slice(0, 7); ymCount[ym] = (ymCount[ym] || 0) + 1;
    if (!by[r.dct]) by[r.dct] = { dct: r.dct, name: r.name, dept: r.dept, items: 0, total: 0, d80: 0, h20: 0 };
    var b = by[r.dct]; b.items++; b.total += r.total; b.d80 += r.d80; b.h20 += r.h20;
    tot += r.total; h20 += r.h20; d80 += r.d80;
    if (/ค้างจ่าย|ระงับ/.test(r.note)) pend++;
    if (Math.abs(r.h20 + r.d80 - r.total) > 0.01 && (r.h20 || r.d80)) mis++;
  });
  var yms = Object.keys(ymCount).sort(function (a, b) { return ymCount[b] - ymCount[a]; });
  var ym = yms[0] || '';
  S.cache.imp = { fileName: fileName, rows: rows, ym: ym };
  var list = Object.keys(by).map(function (k) { return by[k]; });
  var html = '<div class="kpis">' + kpi('รอบเดือน', ymTh(ym), yms.length > 1 ? 'มีวันที่นอกรอบ ' + N(rows.length - ymCount[ym]) + ' แถว' : 'ทุกแถวอยู่ในรอบเดียวกัน', yms.length > 1 ? 'bad' : '', 'calendar') +
    kpi('จำนวนรายการ', N(rows.length), N(list.length) + ' แพทย์', '', 'list') +
    kpi('ยอดรวม (ฐาน)', B(tot), 'แพทย์ 80% ' + B(d80) + ' · รพ. 20% ' + B(h20), '', 'baht') +
    kpi('ค้างจ่าย / ระงับ', N(pend), 'จะเข้าหน้าติดตามยอดค้างจ่าย', pend ? 'warn' : '', 'clock') + '</div>';
  if (mis) html += note('warn', 'มี ' + N(mis) + ' แถวที่ รพ. 20% + แพทย์ 80% ไม่เท่ายอดรวม — ระบบใช้ "จำนวนเงินรวม" เป็นฐานแล้วคิด 80/20 ใหม่รายแพทย์');
  html += card('2. ตรวจยอดรายแพทย์ก่อนนำเข้า', '<div id="tImp"></div>', { icon: 'users', raw: true,
    sub: 'เทียบกับไฟล์ R101 ที่ส่งเบิกจริงได้เลย · ยอดนี้จะเป็นยอดปิดรอบ ' + ymTh(ym) });
  html += card('3. ยืนยันนำเข้า', '<div class="ftb" style="padding:0;border:0">' +
    '<label class="fld"><span>รอบเดือน</span><input type="month" id="impYm" value="' + ym + '"></label>' +
    '<label class="fld"><span>หน่วยที่เบิก</span><select id="impGrp"><option value="DR">โรงพยาบาล (R101)</option><option value="ANC">ศูนย์สาขา/ฝากครรภ์ (R106)</option></select></label>' +
    '<div class="btn-row"><button class="btn pri" onclick="impSubmit()">' + I('check', 'sm') + 'นำเข้าและปิดรอบ</button></div></div>' +
    note('warn', 'ถ้ารอบนี้มีข้อมูลอยู่แล้ว (เช่น ที่ดึงจาก API ไม่ครบ) ยอดสรุปรายแพทย์ของรอบ/หน่วยนี้จะถูก<b>แทนที่</b>ด้วยยอดจากไฟล์ และจะไม่ถูกคำนวณทับภายหลัง'), { icon: 'check' });
  document.getElementById('impOut').innerHTML = html;
  TBL.make('tImp', { key: 'tImp', reset: true, rows: list, pageSize: 200, exportName: 'ตรวจนำเข้า_' + ym,
    search: { placeholder: 'รหัส · ชื่อแพทย์ · ฝ่าย', keys: ['dct', 'name', 'dept'] },
    filters: [{ type: 'select', k: 'dept', label: 'ฝ่าย' }], sort: { i: 4, d: -1 },
    cols: [{ k: 'dct', label: 'รหัส', type: 'code' }, { k: 'name', label: 'แพทย์' }, { k: 'dept', label: 'ฝ่าย', cls: 'small muted' },
           { k: 'items', label: 'รายการ', type: 'int', sum: true }, { k: 'total', label: 'ยอดรวม', type: 'money', sum: true },
           { k: 'd80', label: 'แพทย์ 80%', type: 'money', sum: true }, { k: 'h20', label: 'รพ. 20%', type: 'money', sum: true }] });
}
function impSubmit() {
  var I0 = S.cache.imp; if (!I0) return;
  var ym = document.getElementById('impYm').value, grp = document.getElementById('impGrp').value;
  UI.dialog({ title: 'นำเข้าและปิดรอบ ' + ymTh(ym), icon: 'lock', tone: 'warn',
    body: note('warn', 'นำเข้า ' + N(I0.rows.length) + ' รายการจากไฟล์ <b>' + esc(I0.fileName) + '</b> เป็นยอดปิดรอบ ' + ymTh(ym)) +
      '<label class="fld"><span>ยืนยันรหัสผ่านของท่าน</span><input id="impPass" type="password" autocomplete="current-password"></label>',
    ok: 'นำเข้า',
    onOk: function (el) {
      var p = document.getElementById('impPass').value;
      if (!p) return dlgErr(el, 'กรุณากรอกรหัสผ่าน');
      return api('importMonth', { ym: ym, grp: grp, pass: p, fileName: I0.fileName, rows: I0.rows }, { write: true }).then(function (r) {
        UI.alert({ title: 'นำเข้าเรียบร้อย', icon: 'check', tone: 'ok',
          body: '<p>รอบ ' + ymTh(r.ym) + ' · ' + N(r.doctors) + ' แพทย์ · ' + N(r.rows) + ' รายการ</p><p>ยอดรวม <b>' + B(r.base) + '</b> · แพทย์ 80% ' + B(r.pay80) + ' · รพ. 20% ' + B(r.hos20) + '</p>' +
                (r.pending ? '<p>เพิ่มรายการค้างจ่าย/ระงับ ' + N(r.pending) + ' รายการ</p>' : '') +
                (r.warnings && r.warnings.length ? note('warn', 'ข้ามแถว ' + r.warnings.length + ' แถว: ' + r.warnings.slice(0, 5).map(esc).join(' · ')) : '') });
        S.cache.imp = null; go('month', r.ym);
      });
    } });
}
function closeMonth(ym) {
  UI.dialog({ title: 'ยืนยันการปิดรอบ ' + ymTh(ym), icon: 'lock', tone: 'warn',
    body: note('warn', 'การปิดรอบจะบันทึกยอดของแพทย์ทุกรายไว้เป็นหลักฐาน และเป็นยอดที่ใช้อ้างอิงในการเบิกจ่าย · หากภายหลังยอดเปลี่ยน ระบบจะไม่แก้ยอดที่ปิดแล้ว แต่แจ้งเป็นรายการตกเบิกในรอบถัดไป') +
      '<label class="fld"><span>ยืนยันรหัสผ่านของท่าน</span><input id="cmPass" type="password" autocomplete="current-password"></label>',
    ok: 'ปิดรอบ',
    onOk: function (el) {
      var p = document.getElementById('cmPass').value;
      if (!p) return dlgErr(el, 'กรุณากรอกรหัสผ่าน');
      return api('closeMonth', { ym: ym, grp: 'ALL', pass: p }, { write: true }).then(function () { toast('ปิดรอบ ' + ymTh(ym) + ' เรียบร้อย', 'ok'); go('close', ym); });
    } });
}
function reopenMonth(ym) {
  UI.dialog({ title: 'เปิดรอบ ' + ymTh(ym) + ' ใหม่', icon: 'alert', tone: 'bad',
    body: note('bad', 'ใช้เฉพาะกรณีจำเป็น เช่น พบว่ายอดผิดก่อนส่งฝ่ายทรัพยากรบุคคล · ยอดตอนปิดรอบยังเก็บไว้ตรวจตกเบิก และระบบบันทึกผู้สั่งไว้') +
      '<label class="fld"><span>ยืนยันรหัสผ่านของท่าน</span><input id="roPass" type="password"></label>',
    ok: 'เปิดรอบใหม่', okCls: 'danger',
    onOk: function () { return api('reopenMonth', { ym: ym, grp: 'ALL', pass: document.getElementById('roPass').value }, { write: true }).then(function () { toast('เปิดรอบใหม่แล้ว', 'ok'); go('close', ym); }); } });
}

/** สร้างเอกสารแล้วแสดงลิงก์ */
function mkDoc(action, payload, btn) {
  var old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังสร้างไฟล์';
  api(action, payload, { write: true }).then(function (r) {
    btn.disabled = false; btn.innerHTML = old;
    var h = '<b>' + esc(r.name) + '</b> · <a href="' + esc(r.url) + '" target="_blank" rel="noopener">เปิดไฟล์ ' + I('link', 'sm') + '</a>';
    if (r.blocks) {
      h += '<div class="tw" style="margin-top:8px"><table class="t compact"><thead><tr><th>หน่วย</th><th>รหัสรายได้</th><th class="n">แพทย์</th><th class="n">บรรทัด</th>' +
        '<th class="n">ยอดรับรอง</th><th class="n">80%</th><th class="n">20%</th><th>ตรวจยอด</th></tr></thead><tbody>' +
        r.blocks.map(function (b) {
          return '<tr><td>' + esc(b.groupName) + '</td><td class="mono">' + esc(b.incomePay) + ' / ' + esc(b.incomeHos) + '</td><td class="n">' + N(b.doctors) + '</td>' +
            '<td class="n">' + N(b.lines) + '</td><td class="n">' + B(b.base) + '</td><td class="n">' + B(b.pay80) + '</td><td class="n">' + B(b.hos20) + '</td>' +
            '<td>' + (b.checkSum ? tag('80+20 = ยอดเต็ม', 'ok') : tag('ยอดไม่ตรง', 'bad')) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      if (r.csv && r.csv.length) h += '<div style="margin-top:8px">ไฟล์ CSV: ' + r.csv.map(function (c) { return '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.name) + '</a>'; }).join(' · ') + '</div>';
      if (r.warnings && r.warnings.length) h += '<div style="margin-top:6px">⚠ ' + r.warnings.map(esc).join(' · ') + '</div>';
    }
    if (r.rows !== undefined && r.amount !== undefined) h += '<div class="small" style="margin-top:6px">' + N(r.rows) + ' รายการ · ยอดรวม ' + B(r.amount) + ' บาท</div>';
    if (r.note) h += '<div class="small" style="margin-top:6px">' + esc(r.note) + '</div>';
    var out = document.getElementById('docOut');
    if (out) out.insertAdjacentHTML('afterbegin', note('ok', h)); else toast('สร้างไฟล์เรียบร้อย: ' + r.name, 'ok');
    toast('สร้างไฟล์เรียบร้อย', 'ok');
  }).catch(function (e) {
    btn.disabled = false; btn.innerHTML = old;
    var out = document.getElementById('docOut');
    if (out) out.insertAdjacentHTML('afterbegin', note('bad', esc(e.message))); else toast(e.message, 'bad', 9000);
  });
}

/* ═══════════════════════════════════════════════════════
   ใบแจ้งยอดรายคน
   ═══════════════════════════════════════════════════════ */
ROUTES.docs = function (arg) {
  var parts = String(arg || '').split('|');
  var dct = parts[0] || '', ym = parts[1] || ymAdd(thisYm(), -1);
  header('ใบแจ้งยอดรายคน', 'แทนไฟล์ Excel แยกรายคน · ระบบบันทึกว่าใครสั่งออกเอกสารเมื่อใด', printBtn());
  V(card('', '<div class="ftb" style="padding:0;border:0">' +
    '<label class="fld"><span>รอบเดือน</span><select id="slipYm">' + ymOptions(ym, 24) + '</select></label>' +
    '<label class="fld"><span>รหัสแพทย์</span><input id="slipDct" value="' + esc(dct) + '" placeholder="เช่น 2680247"></label>' +
    '<div class="btn-row"><button class="btn pri" onclick="viewSlip()">' + I('search', 'sm') + 'ดูยอด</button></div></div>' +
    '<div class="hint" style="margin-top:8px">หรือเลือกจาก <a href="#month:' + ym + '">หน้าสรุปรายเดือน</a> แล้วแตะแถวของแพทย์</div>') +
    '<div id="slipOut"></div>');
  var inp = document.getElementById('slipDct');
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') viewSlip(); });
  if (dct) viewSlip(); else inp.focus();
};
function viewSlip() {
  var dct = mv('slipDct'), ym = mv('slipYm');
  if (!dct) return toast('กรุณากรอกรหัสแพทย์', 'warn');
  var out = document.getElementById('slipOut');
  out.innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังรวบรวมยอด</div><div class="sk sk-card"></div>';
  S.arg = dct + '|' + ym;
  history.replaceState(null, '', '#docs:' + dct + '|' + ym);
  api('getDoctorMonth', { ym: ym, dct: dct }).then(function (D) {
    out.innerHTML = '<div class="btn-row no-print" style="margin-bottom:14px">' +
      '<button class="btn pri" onclick="mkDoc(\'buildDoctorSlip\',{ym:\'' + ym + '\',dct:\'' + esc(dct) + '\'},this)">' + I('file', 'sm') + 'ออกใบแจ้งยอด (Google Sheet)</button>' +
      '<button class="btn" onclick="window.print()">' + I('printer', 'sm') + 'พิมพ์หน้านี้</button></div><div id="docOut"></div>' +
      renderDoctorMonth(D, ym, false);
    drawDoctorMonth(D);
  }).catch(function (e) { out.innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════════════════════════════════════════════
   ทะเบียนสัญญา 40(6)
   ═══════════════════════════════════════════════════════ */
ROUTES.contracts = function () {
  header('ทะเบียนสัญญา 40(6)', 'การเบิกค่าตอบแทนต้องมีสัญญาประกอบ · ระบบขึ้นธงเตือน ไม่ระงับจ่ายเอง',
    (isAdmin() ? '<button class="btn sm" onclick="editAlias()">' + I('swap', 'sm') + '<span class="lbl">รหัสแพทย์ที่เปลี่ยน</span></button>' : '') + refreshBtn());
  load('getRegistry', { kind: 'contracts' }, function (D, meta) {
    S.cache.registry = D;
    var html = '<div class="kpis">' +
      kpi('แพทย์ในทะเบียน', N(D.doctors.length), 'ราย', '', 'users') +
      kpi('ไม่มีสัญญา', N(D.noContract || 0), 'ไม่พบวันเริ่มสัญญา', D.noContract ? 'bad' : 'good', 'alert', "TBL.setChip('tCon','none')") +
      kpi('ขึ้นธงรอตรวจ', N(D.contractFlags || 0), '', D.contractFlags ? 'warn' : 'good', 'alert', "TBL.setChip('tCon','flag')") +
      kpi('ยังไม่แนบไฟล์', N(D.noFile || 0), 'ไม่ขึ้นธง', '', 'file', "TBL.setChip('tCon','nofile')") + '</div>';
    html += card('รายชื่อ', '<div id="tCon"></div>', { icon: 'file', flush: true, acts: freshBadge(meta), sub: 'แตะแถวเพื่อแก้ไขข้อมูลสัญญา / แนบไฟล์' });
    V(html);
    TBL.make('tCon', { key: 'tCon', rows: D.doctors, exportName: 'ทะเบียนสัญญา40(6)', idOf: function (d) { return d.code; },
      search: { placeholder: 'รหัส · ชื่อ · ฝ่าย · เลขที่สัญญา', keys: ['code', 'fullName', 'dept', function (d) { return d.contract.contractNo; }] },
      filters: [{ type: 'select', k: 'dept', label: 'ฝ่าย/สาขา' }, { type: 'select', k: 'cst', label: 'สถานะสัญญา', get: function (d) { return d.contract.status || ''; } }],
      chips: [{ id: 'flag', label: 'ขึ้นธง', tone: 'warn', fn: function (d) { return !!d.contract.flag; } },
              { id: 'none', label: 'ไม่มีสัญญา', tone: 'bad', fn: function (d) { return !d.contract.startDate; } },
              { id: 'nofile', label: 'ยังไม่แนบไฟล์', fn: function (d) { return !d.contract.hasFile; } },
              { id: 'paid', label: 'มียอดรอบล่าสุด', fn: function (d) { return d.lastBase > 0; } }],
      rowCls: function (d) { return d.contract.flag ? 'flag' : ''; },
      onRow: function (d) { editContract(d.code); },
      cols: [{ k: 'code', label: 'รหัส', type: 'code' }, { k: 'fullName', label: 'ชื่อ - สกุล', render: function (d) { return '<b>' + esc(d.fullName || '—') + '</b><span class="sub">' + esc(d.dept || '') + '</span>'; } },
             { k: 'cno', label: 'เลขที่สัญญา', get: function (d) { return d.contract.contractNo; }, cls: 'small' },
             { k: 'cstart', label: 'วันเริ่มสัญญา', type: 'date', get: function (d) { return d.contract.startDate; } },
             { k: 'file', label: 'ไฟล์', sort: false, render: function (d) { return d.contract.hasFile ? tag('มีไฟล์', 'ok') : tag('ยังไม่แนบ'); } },
             { k: 'lastBase', label: 'ยอดรอบล่าสุด', type: 'money0' },
             { k: 'flag', label: 'สถานะ / ข้อสังเกต', cls: 'wrap small', get: function (d) { return d.contract.flag || d.contract.status; },
               render: function (d) { return d.contract.flag ? '<span class="warnc">⚠ ' + esc(d.contract.flag) + '</span>' : esc(d.contract.status || '—'); } }] });
  }, { msg: 'กำลังโหลดทะเบียนสัญญา' });
};

function editContract(code) {
  var D = S.cache.registry, d = D.doctors.filter(function (x) { return String(x.code) === String(code); })[0];
  if (!d) return toast('ไม่พบข้อมูล', 'bad');
  var c = d.contract;
  UI.dialog({ title: 'สัญญา 40(6) · ' + (d.fullName || code), icon: 'file',
    sub: 'รหัสแพทย์ ' + esc(code) + (d.dept ? ' · ' + esc(d.dept) : '') + (d.lastBase ? ' · ยอดรอบล่าสุด ' + B(d.lastBase) + ' บาท' : ''),
    body: (c.flag ? note('warn', 'ข้อสังเกตปัจจุบัน: ' + esc(c.flag)) : '') +
      '<div class="frow"><label class="fld"><span>เลขที่สัญญา</span><input id="ctNo" value="' + esc(c.contractNo) + '"></label>' +
      '<label class="fld"><span>วันเริ่มสัญญา</span><input id="ctStart" type="date" value="' + esc(c.startDate) + '"></label></div>' +
      '<div class="frow"><label class="fld"><span>วันลงนาม</span><input id="ctSign" type="date" value="' + esc(c.signDate) + '"></label>' +
      '<label class="fld"><span>วันสิ้นสุด (เว้นว่างได้)</span><input id="ctEnd" type="date" value="' + esc(c.endDate) + '"></label></div>' +
      '<label class="fld"><span>สถานะ</span><select id="ctStat">' + ['มีสัญญา', 'ยังไม่มีสัญญา', 'รออนุมัติ', 'รอส่งเอกสาร', 'สิ้นสุดสัญญา'].map(function (x) {
        return '<option' + (x === c.status ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>ไฟล์สัญญา (PDF หรือรูปภาพ ไม่เกิน 8 MB)</span><input id="ctFile" type="file" accept=".pdf,image/*">' +
      '<div class="hint">' + (c.hasFile ? 'ไฟล์ปัจจุบัน: ' + esc(c.fileName) + ' · อัปโหลดใหม่จะเก็บไฟล์เดิมไว้ในโฟลเดอร์ประวัติ' : 'ยังไม่มีไฟล์ในระบบ') + '</div></label>' +
      '<label class="fld"><span>หมายเหตุ</span><textarea id="ctNote">' + esc(c.note) + '</textarea></label>' +
      (c.flag ? '<label class="chk"><input type="checkbox" id="ctClear"><div><b>ตรวจแล้วเรียบร้อย</b><small>ลบข้อสังเกตนี้ออก</small></div></label>' : ''),
    ok: 'บันทึก',
    onOk: function (el) {
      var p = { code: code, contractNo: mv('ctNo'), startDate: mv('ctStart'), signDate: mv('ctSign'), endDate: mv('ctEnd'),
                status: mv('ctStat'), note: mv('ctNote'), clearFlag: !!(document.getElementById('ctClear') && document.getElementById('ctClear').checked) };
      var f = document.getElementById('ctFile').files[0];
      var send = function () { return api('saveContract', { data: p }, { write: true }).then(function () { toast('บันทึกสัญญาเรียบร้อย', 'ok'); go('contracts'); }); };
      if (!f) return send();
      if (f.size > 8 * 1024 * 1024) return dlgErr(el, 'ไฟล์ใหญ่เกิน 8 MB กรุณาบีบอัดหรือสแกนที่ความละเอียดต่ำลง');
      return new Promise(function (res, rej) {
        var fr = new FileReader();
        fr.onload = function () { p.fileBase64 = String(fr.result).split(',')[1]; p.fileName = f.name; p.fileMime = f.type || 'application/pdf'; send().then(res, rej); };
        fr.onerror = function () { rej(new Error('อ่านไฟล์ไม่สำเร็จ')); };
        fr.readAsDataURL(f);
      });
    } });
}

function editAlias() {
  UI.dialog({ title: 'ผูกรหัสแพทย์เดิมกับรหัสใหม่', icon: 'swap', tone: 'warn',
    body: note('warn', 'ใช้เมื่อแพทย์เปลี่ยนรหัสแต่ระบบโรงพยาบาลยังส่งรหัสเดิมมา · ตรวจชื่อ-สกุลให้ตรงกันก่อนยืนยัน เพราะถ้าผูกผิด เงินจะเข้าผิดคน') +
      '<div class="frow"><label class="fld"><span>รหัสเดิม</span><input id="alOld" placeholder="2680247"></label>' +
      '<label class="fld"><span>รหัสใหม่</span><input id="alNew" placeholder="2690049"></label></div>' +
      '<label class="fld"><span>ชื่อ - สกุล (เพื่อยืนยันว่าเป็นคนเดียวกัน)</span><input id="alName"></label>' +
      '<label class="fld"><span>หมายเหตุ</span><input id="alNote"></label>' +
      '<label class="chk"><input type="checkbox" id="alOk"><div><b>ตรวจแล้วว่าเป็นบุคคลเดียวกัน</b><small>ยืนยันให้ระบบรวมยอด</small></div></label>',
    ok: 'บันทึก',
    onOk: function () {
      return api('saveAlias', { data: { oldCode: mv('alOld'), newCode: mv('alNew'), name: mv('alName'), note: mv('alNote'), confirmed: document.getElementById('alOk').checked } }, { write: true })
        .then(function (r) { toast(r.note || 'บันทึกแล้ว', 'ok', 8000); go('contracts'); });
    } });
}

/* ═══════════════════════════════════════════════════════
   สิทธิการรักษา — หน้าที่กระทบเงินมากที่สุด
   ═══════════════════════════════════════════════════════ */
var POLICY_TH = { pay: 'จ่ายได้เลย', hold: 'ค้างจ่ายก่อน', skip: 'ไม่รวมยอด' };
ROUTES.rights = function () {
  header('สิทธิการรักษา', 'เงื่อนไขการจ่ายตามสิทธิ · ⚠ กระทบยอดเงินโดยตรง', '<button class="btn sm pri" onclick="saveRights()">' + I('check', 'sm') + 'บันทึกการเปลี่ยนแปลง</button>');
  load('getRegistry', { kind: 'rights' }, function (D) {
    S.cache.rights = D.rights; S.cache.rightEdit = {};
    var html = note('warn', '<b>จ่ายได้เลย</b> — สิทธิที่แน่ใจว่าเก็บเงินได้ (บริษัทคู่สัญญา · พ.ร.บ. · ประกันชีวิต) จ่ายบนยอดเรียกเก็บเต็ม แต่ยังขึ้นยอดค้างรับให้ฝ่ายบัญชีตามเก็บ<br>' +
      '<b>ค้างจ่ายก่อน</b> — จ่ายเท่าที่เก็บเงินได้ ส่วนที่เหลือรอเรียกเก็บครบ · <b>ไม่รวมยอด</b> — ไม่นำมาคิดค่าตอบแทนเลย<br>' +
      'สิทธิที่พบใหม่ตั้งเป็น "ค้างจ่ายก่อน" อัตโนมัติ เพราะจ่ายช้าแก้ได้ จ่ายเกินตามคืนยาก');
    html += card('ทะเบียนสิทธิ', '<div id="tRights"></div>', { icon: 'scale', flush: true, sub: 'เปลี่ยนเงื่อนไขในตาราง แล้วกด "บันทึกการเปลี่ยนแปลง" ด้านบน' });
    V(html);
    TBL.make('tRights', { key: 'tRights', rows: D.rights, pageSize: 500, idOf: function (r) { return r.name; },
      search: { placeholder: 'ชื่อสิทธิ', keys: ['name', 'grp'] },
      filters: [{ type: 'select', k: 'grp', label: 'หมวด' }, { type: 'select', k: 'policy', label: 'เงื่อนไข', labelOf: function (r) { return POLICY_TH[r.policy] || r.policy; } }],
      chips: [{ id: 'pay', label: 'จ่ายได้เลย', fn: function (r) { return r.policy === 'pay'; } }, { id: 'hold', label: 'ค้างจ่ายก่อน', fn: function (r) { return r.policy === 'hold'; } },
              { id: 'skip', label: 'ไม่รวมยอด', fn: function (r) { return r.policy === 'skip'; } }],
      cols: [{ k: 'name', label: 'สิทธิการรักษา', render: function (r) { return '<b>' + esc(r.name) + '</b>'; } }, { k: 'grp', label: 'หมวด', cls: 'small muted' },
             { k: 'policy', label: 'เงื่อนไขการจ่าย', w: '200px', render: function (r) {
               var cur = (S.cache.rightEdit || {})[r.name] || r.policy;
               return '<select class="inp sm rPol" data-name="' + esc(r.name) + '" data-grp="' + esc(r.grp) + '" data-orig="' + esc(r.policy) + '" onchange="rightChanged(this)"' +
                 (cur !== r.policy ? ' style="border-color:var(--warn);box-shadow:0 0 0 3px var(--warn-bg)"' : '') + '>' +
                 ['pay', 'hold', 'skip'].map(function (p) { return '<option value="' + p + '"' + (cur === p ? ' selected' : '') + '>' + POLICY_TH[p] + '</option>'; }).join('') + '</select>'; } },
             { k: 'firstSeen', label: 'พบครั้งแรก', type: 'date' }, { k: 'updatedBy', label: 'แก้ล่าสุด', cls: 'small muted' }] });
  });
};
function rightChanged(sel) {
  S.cache.rightEdit = S.cache.rightEdit || {};
  S.cache.rightEdit[sel.dataset.name] = sel.value;
  var ch = sel.value !== sel.dataset.orig;
  sel.style.borderColor = ch ? 'var(--warn)' : ''; sel.style.boxShadow = ch ? '0 0 0 3px var(--warn-bg)' : '';
}
function saveRights() {
  var ed = S.cache.rightEdit || {}, changed = [], all = (S.cache.rights || []).map(function (r) {
    var p = ed[r.name] || r.policy;
    if (p !== r.policy) changed.push(r.name + ' : ' + POLICY_TH[r.policy] + ' → ' + POLICY_TH[p]);
    return { name: r.name, grp: r.grp, policy: p };
  });
  if (!changed.length) return toast('ยังไม่มีการเปลี่ยนแปลง', 'info');
  UI.confirm({ title: 'ยืนยันเปลี่ยนเงื่อนไข ' + changed.length + ' สิทธิ?', icon: 'scale', tone: 'warn',
    body: '<ul class="small">' + changed.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' + note('warn', 'ยอดของรอบที่ยังไม่ปิดจะเปลี่ยนตามทันที'), ok: 'บันทึก' })
    .then(function (y) {
      if (!y) return;
      api('saveRights', { rows: all }, { write: true }).then(function (r) { toast(r.note || 'บันทึกแล้ว', 'ok', 10000); go('rights'); })
        .catch(function (e) { toast(e.message, 'bad', 9000); });
    });
}

/* ═══════════════════════════════════════════════════════
   รหัสค่าธรรมเนียมแพทย์
   ═══════════════════════════════════════════════════════ */
var GRP_NAMES = { DR: 'แพทย์ทั่วไป', ANC: 'ศูนย์สาขา/ฝากครรภ์', DN: 'ทันตกรรม', VTH: 'แพทย์แผนไทย', XRAY: 'รังสีวิทยา', WAIT: 'รอจัดกลุ่ม' };
var DF_ST = { active: 'ใช้งาน', pending: 'รอยืนยัน', off: 'ปิดใช้' };
ROUTES.dfcodes = function () {
  header('รหัสค่าธรรมเนียม', 'รหัสที่ "รอยืนยัน" จะไม่ถูกนับจ่าย', '<button class="btn sm pri" onclick="saveDf()">' + I('check', 'sm') + 'บันทึกการเปลี่ยนแปลง</button>');
  load('getRegistry', { kind: 'dfcodes' }, function (D) {
    S.cache.df = D.dfCodes; S.cache.dfEdit = {};
    var html = (D.dfPending ? note('warn', 'มีรหัสใหม่ <b>' + N(D.dfPending) + '</b> รหัสที่ยังไม่ได้ยืนยัน ยอดของรหัสเหล่านี้ยังไม่เข้ารายงานเบิก — ตรวจแล้วเปลี่ยนสถานะเป็น "ใช้งาน"') : '') +
      note('info', 'เมื่อระบบโรงพยาบาลส่งรหัสใหม่ที่ไม่เคยเจอ ระบบบันทึกเป็นรอยืนยันและแจ้งเตือน เพื่อให้ตรวจก่อนว่าเป็นค่าธรรมเนียมแพทย์จริงและเป็นของหน่วยใด');
    html += card('รายการรหัส', '<div id="tDf"></div>', { icon: 'hash', flush: true });
    V(html);
    TBL.make('tDf', { key: 'tDf', rows: D.dfCodes, pageSize: 300, idOf: function (c) { return c.code; },
      search: { placeholder: 'รหัส · ชื่อรายการ', keys: ['code', 'label', 'typeTh'] },
      filters: [{ type: 'select', k: 'grp', label: 'หน่วยที่เบิก', labelOf: function (c) { return GRP_NAMES[c.grp] || c.grp; } }, { type: 'select', k: 'status', label: 'สถานะ', labelOf: function (c) { return DF_ST[c.status] || c.status; } }],
      chips: [{ id: 'pend', label: 'รอยืนยัน', tone: 'warn', fn: function (c) { return c.status !== 'active'; } }],
      rowCls: function (c) { return c.status !== 'active' ? 'flag' : ''; },
      cols: [{ k: 'code', label: 'รหัส', render: function (c) { return '<b class="mono">' + esc(c.code) + '</b>'; } },
             { k: 'label', label: 'ชื่อรายการ', render: function (c) { return '<input class="inp sm" style="width:100%;min-width:180px" value="' + esc(dfv(c, 'label')) + '" oninput="dfSet(\'' + esc(c.code) + '\',\'label\',this.value)">'; } },
             { k: 'typeTh', label: 'ประเภท', cls: 'small muted', get: function (c) { return c.typeTh || c.type; } },
             { k: 'grp', label: 'หน่วยที่เบิก', render: function (c) { return '<select class="inp sm" onchange="dfSet(\'' + esc(c.code) + '\',\'grp\',this.value)">' +
               Object.keys(GRP_NAMES).map(function (g) { return '<option value="' + g + '"' + (dfv(c, 'grp') === g ? ' selected' : '') + '>' + GRP_NAMES[g] + '</option>'; }).join('') + '</select>'; } },
             { k: 'status', label: 'สถานะ', render: function (c) { return '<select class="inp sm" onchange="dfSet(\'' + esc(c.code) + '\',\'status\',this.value)">' +
               Object.keys(DF_ST).map(function (g) { return '<option value="' + g + '"' + (dfv(c, 'status') === g ? ' selected' : '') + '>' + DF_ST[g] + '</option>'; }).join('') + '</select>'; } },
             { k: 'items', label: 'พบ (รายการ)', type: 'int' }, { k: 'lastSeen', label: 'พบล่าสุด', type: 'date' }] });
  });
};
function dfv(c, k) { var e = (S.cache.dfEdit || {})[c.code]; return e && e[k] !== undefined ? e[k] : c[k]; }
function dfSet(code, k, v) { S.cache.dfEdit = S.cache.dfEdit || {}; (S.cache.dfEdit[code] = S.cache.dfEdit[code] || {})[k] = v; }
function saveDf() {
  var ed = S.cache.dfEdit || {};
  var rows = (S.cache.df || []).map(function (c) { return { code: c.code, label: dfv(c, 'label'), grp: dfv(c, 'grp'), status: dfv(c, 'status') }; });
  if (!Object.keys(ed).length) return toast('ยังไม่มีการเปลี่ยนแปลง', 'info');
  api('saveDfCodes', { rows: rows }, { write: true }).then(function (r) { toast('บันทึก ' + N(r.saved) + ' รหัส' + (r.note ? ' · ' + r.note : ''), 'ok', 9000); go('dfcodes'); })
    .catch(function (e) { toast(e.message, 'bad', 9000); });
}

/* ═══════════════════════════════════════════════════════
   กฎจัดกลุ่มการเบิก
   ═══════════════════════════════════════════════════════ */
var RULE_KINDS = { clinic: 'หน่วยที่คีย์ (ref_location)', doctor: 'รายแพทย์', code: 'รายรหัสค่าธรรมเนียม', dept: 'รายฝ่าย' };
ROUTES.groups = function () {
  header('กฎจัดกลุ่มการเบิก', 'แยก รพ. (R101) กับศูนย์สาขา (R106)', '<button class="btn sm" onclick="addRule()">' + I('plus', 'sm') + 'เพิ่มกฎ</button><button class="btn sm pri" onclick="saveRules()">' + I('check', 'sm') + 'บันทึก</button>');
  load('getRegistry', { kind: 'grouprules' }, function (D) {
    S.cache.groupRules = D.groupRules; S.cache.groupList = D.groups;
    var html = note('info', '<b>ลำดับที่ระบบใช้ตัดสิน</b> (ข้อที่พบก่อนชนะ): 1. กลุ่มที่ระบบโรงพยาบาลส่งมา · 2. กฎรายแพทย์ · 3. <b>หน่วยที่คีย์ (ref_location)</b> · 4. กฎรายรหัส · 5. กฎรายฝ่าย · ' +
      'ไม่เข้าข้อใดเลย = "รอจัดกลุ่ม" และ<b>ไม่ถูกนับเข้ายอดเบิกของหน่วยใด</b>');
    html += card('กฎที่ใช้อยู่', '<div class="tw"><table class="t compact"><thead><tr><th style="width:200px">ชนิดกฎ</th><th>ค่าที่ตรงกัน</th><th style="width:220px">จัดเข้าหน่วย</th><th>หมายเหตุ</th><th style="width:50px"></th></tr></thead><tbody id="rulesBody"></tbody></table></div>' +
      '<div class="hint" style="padding:10px 18px">ชนิด "หน่วยที่คีย์" เทียบแบบ <b>มีคำนี้อยู่ข้างใน</b> เช่น "ศูนย์ฯแหลมฉบัง" จะจับ "ฝากครรภ์นอกเวลา (ศูนย์ฯแหลมฉบัง)" ได้</div>', { icon: 'shuffle', raw: true });
    if (isAdmin()) html += card('ตรวจค่าที่ระบบโรงพยาบาลส่งมา', '<div class="ftb" style="padding:0;border:0"><label class="fld"><span>วันที่</span><input type="date" id="tstDate" value="' + shiftDay(today(), -1) + '"></label>' +
      '<div class="btn-row"><button class="btn pri" onclick="testApiNow()">' + I('play', 'sm') + 'ตรวจ</button></div></div><div id="tstOut" style="margin-top:12px"></div>', { icon: 'search', sub: 'ดูว่า ref_location ส่งค่าอะไรมาจริง และค่าใดยังไม่มีกฎรองรับ' });
    V(html); drawRules();
  });
};
function drawRules() {
  var rows = S.cache.groupRules || [], gl = S.cache.groupList || [];
  document.getElementById('rulesBody').innerHTML = rows.map(function (r, ix) {
    return '<tr><td><select class="inp sm rK" style="width:100%">' + Object.keys(RULE_KINDS).map(function (k) { return '<option value="' + k + '"' + (r.kind === k ? ' selected' : '') + '>' + RULE_KINDS[k] + '</option>'; }).join('') + '</select></td>' +
      '<td><input class="inp sm rM" style="width:100%" value="' + esc(r.match) + '"></td>' +
      '<td><select class="inp sm rG" style="width:100%">' + gl.map(function (g) { return '<option value="' + g.code + '"' + (r.grp === g.code ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select></td>' +
      '<td><input class="inp sm rN" style="width:100%" value="' + esc(r.note || '') + '"></td>' +
      '<td><button class="btn sm icon ghost" title="ลบ" onclick="delRule(' + ix + ')">' + I('x', 'sm') + '</button></td></tr>';
  }).join('') || '<tr><td colspan="5">' + emptyBox('ยังไม่มีกฎ') + '</td></tr>';
}
function readRules() {
  var ks = document.querySelectorAll('.rK'), ms = document.querySelectorAll('.rM'), gs = document.querySelectorAll('.rG'), ns = document.querySelectorAll('.rN'), out = [];
  for (var i = 0; i < ks.length; i++) out.push({ kind: ks[i].value, match: ms[i].value.trim(), grp: gs[i].value, note: ns[i].value });
  return out;
}
function addRule() { S.cache.groupRules = readRules(); S.cache.groupRules.push({ kind: 'clinic', match: '', grp: 'ANC', note: '' }); drawRules(); var m = document.querySelectorAll('.rM'); if (m.length) m[m.length - 1].focus(); }
function delRule(ix) { S.cache.groupRules = readRules(); S.cache.groupRules.splice(ix, 1); drawRules(); }
function saveRules() {
  var rows = readRules().filter(function (r) { return r.match; });
  api('saveGroupRules', { rows: rows }, { write: true }).then(function (r) { toast('บันทึก ' + N(r.saved) + ' กฎ · ' + r.note, 'ok', 9000); go('groups'); })
    .catch(function (e) { toast(e.message, 'bad', 9000); });
}
function testApiNow() {
  var out = document.getElementById('tstOut');
  out.innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังเรียก API</div>';
  api('testApi', { date: mv('tstDate') }).then(function (r) {
    var h = '<div class="small"><b>' + N(r.rows) + ' รายการ</b> · ตอบใน ' + N(r.ms) + ' มิลลิวินาที<br><span class="mono tiny muted">' + esc(r.url) + '</span></div>' +
      '<div class="btn-row" style="margin:10px 0">' + (r.extraFieldsReady.length ? tag('ฟิลด์พร้อม: ' + r.extraFieldsReady.join(', '), 'ok') : '') +
      (r.extraFieldsMissing.length ? tag('ยังไม่มา: ' + r.extraFieldsMissing.join(', '), 'warn') : '') + '</div>' + note(r.refLocation.filled ? 'info' : 'warn', esc(r.locNote));
    if (r.refLocation.distinct && r.refLocation.distinct.length) {
      h += '<div class="tw"><table class="t compact"><thead><tr><th>ค่าที่ส่งมา (ref_location)</th><th class="n">รายการ</th><th>จัดเข้าหน่วย</th><th></th></tr></thead><tbody>' +
        r.refLocation.distinct.map(function (d) {
          var no = d.grp === 'ยังไม่มีกฎ';
          return '<tr' + (no ? ' class="flag"' : '') + '><td>' + esc(d.value) + '</td><td class="n">' + N(d.rows) + '</td><td>' + (no ? tag('ยังไม่มีกฎ', 'warn') : tag(d.grp, 'ok')) + '</td>' +
            '<td>' + (no ? '<button class="btn sm" onclick="quickRule(' + JSON.stringify(JSON.stringify(d.value)).replace(/"/g, '&quot;') + ')">ตั้งกฎ</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    out.innerHTML = h;
  }).catch(function (e) { out.innerHTML = note('bad', esc(e.message)); });
}
function quickRule(json) {
  S.cache.groupRules = readRules();
  S.cache.groupRules.push({ kind: 'clinic', match: JSON.parse(json), grp: 'ANC', note: 'เพิ่มจากหน้าตรวจ API' });
  drawRules(); toast('เพิ่มกฎในตารางแล้ว — ตรวจหน่วยที่จัดเข้าให้ถูก แล้วกดบันทึก', 'info', 8000); window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════════════════
   ตั้งค่าระบบ
   ═══════════════════════════════════════════════════════ */
var SET_GROUPS = [
  { t: 'แหล่งข้อมูลจากระบบโรงพยาบาล', i: 'link', keys: [['apiBase', 'ที่อยู่ API', 'text'], ['apiReport', 'ชื่อรายงาน', 'text'],
    ['apiToken', 'โทเคน (ถ้าฝ่ายไอทีล็อก API)', 'password'], ['nightlyBackDays', 'ดึงทับย้อนหลังทุกคืน (วัน)', 'number'],
    ['visitApiUrl', 'ที่อยู่ API รายชื่อผู้รับบริการ (visit) — ใช้เทียบ "ผู้ป่วยที่มาแต่ไม่มี DF" · เว้นว่าง = ปิด', 'text'] ] },
  { t: 'การเข้าใช้งานของแพทย์ผ่านระบบ HIS', i: 'user', keys: [['hisVerifyUrl', 'ที่อยู่ API ตรวจรหัสผู้ใช้ HIS (ต้องเป็น https)', 'text'],
    ['hisAutoCreate', 'สร้างบัญชีแพทย์ให้เองเมื่อ HIS ยืนยันตัวตนแล้ว', 'onoff'] ] },
  { t: 'การคิดค่าตอบแทน ⚠ กระทบเงิน', i: 'baht', keys: [['sharePct', 'สัดส่วนส่วนแพทย์ (0.8 = 80%)', 'text'], ['baseField', 'ฐานคิดค่าตอบแทน', 'text'],
    ['ruleModeDR', 'กติกาตัด DF แพทย์ทั่วไป', 'rule'], ['ruleFromDR', 'เริ่มใช้กติกาตั้งแต่วันที่', 'date'],
    ['ruleModeANC', 'กติกาตัด DF ศูนย์สาขา', 'rule'], ['ruleFromANC', 'เริ่มใช้กติกาตั้งแต่วันที่', 'date'] ] },
  { t: 'รหัสรายได้สำหรับไฟล์นำเข้า HRMi ⚠ กระทบเงิน', i: 'hash', keys: [['splitIncomeByGroup', 'แยกรหัสรายได้ตามหน่วย', 'onoff'],
    ['incomeDRPay', 'แพทย์ทั่วไป · ส่วนแพทย์ 80%', 'text'], ['incomeDRHos', 'แพทย์ทั่วไป · ส่วนโรงพยาบาล 20%', 'text'],
    ['incomeANCPay', 'ศูนย์สาขา · ส่วนแพทย์ 80%', 'text'], ['incomeANCHos', 'ศูนย์สาขา · ส่วนโรงพยาบาล 20%', 'text'],
    ['jobCode', 'รหัสงาน', 'text'], ['idCardField', 'ช่องเลขบัตรประชาชน', 'text'] ] },
  { t: 'รอบเบิกและการตกเบิก', i: 'calendar', keys: [['submitByDay', 'ส่งฝ่ายทรัพยากรบุคคลไม่เกินวันที่', 'number'], ['recheckDays', 'ย้อนตรวจยอดที่เปลี่ยนหลังปิดรอบ (วัน)', 'number'],
    ['mergeViewAllGroups', 'หน้าจอรายงานรวมยอดทุกหน่วย', 'onoff'], ['notifyEmail', 'อีเมลรับแจ้งเตือนรอบเบิก', 'text'] ] },
  { t: 'สัญญา 40(6)', i: 'file', keys: [['contractCheck', 'ตรวจสัญญาอัตโนมัติ', 'onoff'], ['contractAction', 'เมื่อไม่พบสัญญา', 'contract'],
    ['doctorCanDownloadContract', 'ให้แพทย์ดาวน์โหลดสัญญาเองได้', 'yn'] ] },
  { t: 'เอกสารและผู้ลงนาม', i: 'printer', keys: [['reportTitle', 'ชื่อรายงาน', 'text'], ['signer1Label', 'ตำแหน่งผู้ลงนามช่องที่ 1', 'text'],
    ['signer1Name', 'ชื่อผู้ลงนามช่องที่ 1', 'text'], ['signer1Title', 'ตำแหน่งใต้ชื่อช่องที่ 1', 'text'], ['signer2Label', 'ข้อความรับรองช่องที่ 2', 'text'],
    ['signer2Name', 'ชื่อผู้ลงนามช่องที่ 2', 'text'], ['signer2Title', 'ตำแหน่งใต้ชื่อช่องที่ 2', 'text'],
    ['printQc', 'บันทึกว่าใครสั่งพิมพ์ใบแจ้งยอด', 'onoff'], ['contactLine', 'ข้อความติดต่อท้ายเอกสาร', 'text'] ] }
];
ROUTES.settings = function () {
  header('ตั้งค่าระบบ', 'ค่าที่กระทบยอดเงินต้องยืนยันรหัสผ่าน', '<button class="btn sm pri" onclick="saveSettings()">' + I('check', 'sm') + 'บันทึกการตั้งค่า</button>');
  load('getSettings', {}, function (D) {
    var st = D.settings, html = (D.warn || []).map(function (w) { return note('warn', esc(w)); }).join('');
    var SEL = { onoff: [['on', 'เปิด'], ['off', 'ปิด']], yn: [['Y', 'ได้'], ['N', 'ไม่ได้']],
      rule: [['off', 'จ่ายทุกรายการ (ใช้อยู่)'], ['A', 'จ่ายสูงสุดอันเดียวต่อผู้ป่วยต่อวัน'], ['B', 'จ่ายสูงสุดประเภทละ 1 ต่อผู้ป่วยต่อวัน']],
      contract: [['flag', 'ขึ้นธงเตือน แต่ยังจ่าย'], ['hold', 'ระงับจ่ายไว้ก่อน']] };
    html += '<div class="grid g2">' + SET_GROUPS.map(function (G) {
      return card(esc(G.t), G.keys.map(function (k) {
        var key = k[0], v = st[key] === undefined ? '' : String(st[key]), t = k[2];
        var inp = SEL[t] ? '<select class="sv" data-k="' + key + '">' + SEL[t].map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'
          : '<input class="sv" data-k="' + key + '" type="' + (t === 'password' ? 'password' : t === 'number' ? 'number' : t === 'date' ? 'date' : 'text') + '" value="' + esc(v) + '">';
        return '<label class="fld"><span>' + esc(k[1]) + '</span>' + inp + '</label>';
      }).join(''), { icon: G.i });
    }).join('') + '</div>';
    html += card('ตรวจความพร้อมของระบบ', '<div class="small muted">ตรวจตาราง ค่าตั้งค่า โฟลเดอร์ กุญแจเข้ารหัส ทริกเกอร์ และการเชื่อมต่อ API</div><div id="hcOut" style="margin-top:10px"></div>',
      { icon: 'check', acts: '<button class="btn sm" onclick="runHealth(this)">' + I('play', 'sm') + 'ตรวจเดี๋ยวนี้</button>' });
    V(html);
  });
};
function saveSettings() {
  var patch = {};
  [].forEach.call(document.querySelectorAll('.sv'), function (x) { patch[x.dataset.k] = x.value; });
  UI.dialog({ title: 'บันทึกการตั้งค่า', icon: 'settings',
    body: note('warn', 'ถ้าแก้ค่าที่กระทบยอดเงิน (สัดส่วน 80/20 · ฐานคิด · กติกาตัด DF · รหัสรายได้) ต้องกรอกรหัสผ่าน และกดคำนวณรอบที่ยังไม่ปิดใหม่ก่อนออกไฟล์เบิก') +
      '<label class="fld"><span>รหัสผ่านของท่าน (กรอกเมื่อแก้ค่าที่กระทบเงิน)</span><input id="setPass" type="password"></label>',
    ok: 'บันทึก',
    onOk: function () {
      return api('saveSettings', { settings: patch, pass: document.getElementById('setPass').value }, { write: true })
        .then(function (r) { toast(r.note || 'บันทึกแล้ว', r.moneyChanged && r.moneyChanged.length ? 'warn' : 'ok', 11000); go('settings'); });
    } });
}
function runHealth(btn) {
  var out = document.getElementById('hcOut');
  btn.disabled = true;
  out.innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังตรวจ</div>';
  api('health').then(function (r) {
    btn.disabled = false;
    out.innerHTML = note(r.ok ? 'ok' : 'bad', r.ok ? 'ระบบพร้อมใช้งาน · ตรวจผ่านทุกข้อ' : 'พบข้อที่ยังไม่พร้อม กรุณาแก้ตามรายการด้านล่าง') +
      (r.warn || []).map(function (w) { return note('warn', esc(w)); }).join('') +
      '<div class="tw"><table class="t compact"><tbody>' + r.checks.map(function (c) {
        return '<tr><td style="width:34px">' + (c.ok ? '<span class="good">' + I('tick', 'sm') + '</span>' : '<span class="badc">' + I('x', 'sm') + '</span>') + '</td><td>' + esc(c.name) + '</td><td class="small muted">' + esc(c.detail) + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="tiny muted" style="margin-top:6px">ตรวจเมื่อ ' + esc(r.at) + ' · รุ่น ' + esc(r.build) + '</div>';
  }).catch(function (e) { btn.disabled = false; out.innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════════════════════════════════════════════
   ผู้ใช้งาน
   ═══════════════════════════════════════════════════════ */
ROUTES.users = function () {
  header('ผู้ใช้งาน', 'ระบบกรองข้อมูลที่หลังบ้านตามบทบาท ไม่ใช่เพียงซ่อนปุ่ม', '<button class="btn sm pri" onclick="editUser()">' + I('plus', 'sm') + 'เพิ่มผู้ใช้</button>');
  load('listUsers', {}, function (D) {
    S.cache.users = D;
    V(note('info', '<b>ผู้ดูแลระบบ</b> ทำได้ทุกอย่าง · <b>ทรัพยากรบุคคล</b> ตัดรอบ ออกเอกสาร แก้ทะเบียน · <b>บัญชี</b> บันทึกผลเรียกเก็บและตัดหนี้เสีย · ' +
      '<b>หัวหน้าฝ่าย</b> ดูเฉพาะแพทย์ในฝ่าย · <b>แพทย์</b> ดูเฉพาะยอดของตนเอง') + card('รายชื่อผู้ใช้', '<div id="tUsers"></div>', { icon: 'users', flush: true }));
    TBL.make('tUsers', { key: 'tUsers', rows: D.rows, idOf: function (u) { return u.empCode; },
      search: { placeholder: 'รหัส · ชื่อ · ฝ่าย', keys: ['empCode', 'name', 'dct', 'dept', 'roleTh'] },
      filters: [{ type: 'select', k: 'roleTh', label: 'บทบาท' }],
      chips: [{ id: 'lock', label: 'ถูกล็อก/ปิดใช้', tone: 'bad', fn: function (u) { return u.locked || u.active === 'N'; } }, { id: 'must', label: 'ต้องตั้งรหัสใหม่', fn: function (u) { return u.mustChange; } }],
      onRow: function (u) { editUser(u.empCode); },
      cols: [{ k: 'empCode', label: 'รหัสผู้ใช้', type: 'code' }, { k: 'name', label: 'ชื่อ - สกุล', render: function (u) { return '<b>' + esc(u.name || '—') + '</b>'; } },
             { k: 'roleTh', label: 'บทบาท', cls: 'small' }, { k: 'dct', label: 'รหัสแพทย์', type: 'code' }, { k: 'dept', label: 'ฝ่าย', cls: 'small' },
             { k: 'st', label: 'สถานะ', get: function (u) { return u.active === 'N' ? 'ปิดใช้' : u.locked ? 'ถูกล็อก' : u.mustChange ? 'ต้องตั้งรหัสใหม่' : 'ใช้งานได้'; },
               render: function (u) { return u.active === 'N' ? tag('ปิดใช้', 'bad') : u.locked ? tag('ถูกล็อก', 'bad') : u.mustChange ? tag('ต้องตั้งรหัสใหม่', 'warn') : tag('ใช้งานได้', 'ok'); } },
             { k: 'lastLogin', label: 'เข้าใช้ล่าสุด', cls: 'small muted' },
             { k: 'x', label: '', sort: false, export: false, render: function (u) { return '<button class="btn sm" onclick="event.stopPropagation();resetPass(\'' + esc(u.empCode) + '\')">' + I('key', 'sm') + 'ตั้งรหัสใหม่</button>'; } }] });
  });
};
function editUser(code) {
  var D = S.cache.users, u = code ? D.rows.filter(function (x) { return String(x.empCode) === String(code); })[0] : null;
  UI.dialog({ title: u ? 'แก้ไขผู้ใช้ ' + code : 'เพิ่มผู้ใช้ใหม่', icon: 'user',
    body: '<div class="frow"><label class="fld"><span>รหัสพนักงาน / รหัสผู้ใช้</span><input id="uCode" value="' + esc(u ? u.empCode : '') + '"' + (u ? ' readonly' : '') + '></label>' +
      '<label class="fld"><span>ชื่อ - สกุล</span><input id="uName" value="' + esc(u ? u.name : '') + '"></label></div>' +
      '<label class="fld"><span>ตำแหน่ง</span><input id="uTitle" value="' + esc(u ? u.title : '') + '"></label>' +
      '<div class="fld"><span>บทบาท (เลือกได้มากกว่าหนึ่ง)</span>' + D.roles.map(function (r) {
        return '<label class="chk"><input type="checkbox" class="uRole" value="' + r.code + '"' + (u && u.roles.indexOf(r.code) >= 0 ? ' checked' : '') + '><div><b>' + esc(r.name) + '</b></div></label>'; }).join('') + '</div>' +
      '<div class="frow"><label class="fld"><span>ผูกรหัสแพทย์ (บทบาทแพทย์)</span><input id="uDct" value="' + esc(u ? u.dct : '') + '"></label>' +
      '<label class="fld"><span>ฝ่าย (หัวหน้าฝ่าย)</span><input id="uDept" value="' + esc(u ? u.dept : '') + '"></label></div>' +
      (u ? '<label class="fld"><span>สถานะ</span><select id="uActive"><option value="Y"' + (u.active !== 'N' ? ' selected' : '') + '>ใช้งานได้</option><option value="N"' + (u.active === 'N' ? ' selected' : '') + '>ปิดใช้</option></select></label>'
         : '<label class="fld"><span>รหัสผ่านเริ่มต้น (ผู้ใช้ต้องเปลี่ยนเมื่อเข้าครั้งแรก)</span><input id="uPass"></label>'),
    ok: 'บันทึก',
    onOk: function (el) {
      var roles = [].map.call(document.querySelectorAll('.uRole:checked'), function (x) { return x.value; });
      if (!roles.length) return dlgErr(el, 'กรุณาเลือกบทบาทอย่างน้อยหนึ่งอย่าง');
      var d = { empCode: mv('uCode'), name: mv('uName'), title: mv('uTitle'), roles: roles, dct: mv('uDct'), dept: mv('uDept') };
      if (document.getElementById('uActive')) d.active = mv('uActive');
      if (document.getElementById('uPass')) d.pass = mv('uPass');
      if (roles.indexOf('doctor') >= 0 && !d.dct) return dlgErr(el, 'บทบาทแพทย์ต้องผูกรหัสแพทย์ ไม่งั้นระบบไม่รู้ว่าจะแสดงยอดของใคร');
      return api('saveUser', { data: d }, { write: true }).then(function (r) {
        toast('บันทึกแล้ว' + (r && r.pass ? ' · รหัสผ่านเริ่มต้น: ' + r.pass : ''), 'ok', 12000); go('users');
      });
    } });
}
function resetPass(code) {
  UI.dialog({ title: 'ตั้งรหัสผ่านใหม่ให้ ' + code, icon: 'key', tone: 'warn',
    body: note('warn', 'ผู้ใช้จะต้องเปลี่ยนรหัสผ่านเองเมื่อเข้าใช้งานครั้งถัดไป · ระบบบันทึกไว้ว่าใครสั่งตั้งรหัสใหม่') +
      '<label class="fld"><span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span><input id="rpNew"></label>',
    ok: 'ตั้งรหัสใหม่',
    onOk: function () { return api('resetPass', { empCode: code, pass: mv('rpNew') }, { write: true }).then(function () { toast('ตั้งรหัสผ่านใหม่เรียบร้อย', 'ok'); go('users'); }); } });
}

/* ═══════════════════════════════════════════════════════
   ประวัติการใช้งาน
   ═══════════════════════════════════════════════════════ */
ROUTES.logs = function (kind) {
  kind = kind || 'audit';
  var tabs = [['audit', 'การแก้ไขข้อมูล'], ['print', 'การออกเอกสาร'], ['fetch', 'การดึงข้อมูล']];
  header('ประวัติการใช้งาน', 'ทุกการเปลี่ยนแปลงที่กระทบยอดเงิน พร้อมผู้ทำและเวลา',
    '<div class="seg">' + tabs.map(function (t) { return '<button class="' + (t[0] === kind ? 'on' : '') + '" onclick="go(\'logs\',\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('') + '</div>');
  load('getLogs', { kind: kind, limit: 500 }, function (D) {
    var cols = kind === 'print' ? [['at', 'เวลา'], ['by', 'ผู้ทำ'], ['kind', 'ประเภท'], ['target', 'เป้าหมาย'], ['ym', 'รอบ'], ['detail', 'รายละเอียด']]
      : kind === 'fetch' ? [['at', 'เวลา'], ['range', 'ช่วงวันที่'], ['rows', 'จำนวนแถว'], ['status', 'ผล'], ['detail', 'รายละเอียด']]
      : [['at', 'เวลา'], ['by', 'ผู้ทำ'], ['role', 'บทบาท'], ['action', 'การกระทำ'], ['target', 'เป้าหมาย'], ['detail', 'รายละเอียด']];
    V(card('ทั้งหมด ' + N(D.total) + ' รายการ · แสดง ' + N(D.rows.length) + ' รายการล่าสุด', '<div id="tLog"></div>', { icon: 'list', flush: true }));
    TBL.make('tLog', { key: 'tLog_' + kind, rows: D.rows, exportName: 'ประวัติ_' + kind, compact: true,
      search: { placeholder: 'ค้นหาทุกช่อง', keys: cols.map(function (c) { return c[0]; }) },
      filters: kind === 'fetch' ? [{ type: 'select', k: 'status', label: 'ผล' }] : [{ type: 'select', k: kind === 'print' ? 'kind' : 'action', label: kind === 'print' ? 'ประเภท' : 'การกระทำ' }, { type: 'select', k: 'by', label: 'ผู้ทำ' }],
      cols: cols.map(function (c) {
        if (c[0] === 'status') return { k: 'status', label: c[1], render: function (r) { var ok = r.status === 'ok' || r.status === 'สำเร็จ'; return tag(ok ? 'สำเร็จ' : r.status, ok ? 'ok' : 'bad'); } };
        if (c[0] === 'rows') return { k: 'rows', label: c[1], type: 'int' };
        return { k: c[0], label: c[1], cls: c[0] === 'at' ? 'small muted nowrap' : (c[0] === 'detail' ? 'small wrap' : 'small') };
      }) });
  });
};
