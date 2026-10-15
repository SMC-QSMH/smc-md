/* SMC MD — pages.js (รุ่น 2569-10-15.1)
 * หน้าของแพทย์ · แดชบอร์ด · ตรวจรายวัน · สรุปรายเดือน · ติดตามยอดค้างจ่าย · หนี้เสีย · ตกเบิก
 * ทุกหน้าใช้ load() — เปิดซ้ำเห็นข้อมูลทันทีจากเครื่อง แล้วอัปเดตเบื้องหลัง
 */

function monthPicker(page, ym, n) {
  return '<select class="inp sm" onchange="go(\'' + page + '\',this.value)" aria-label="รอบเดือน">' + ymOptions(ym, n || 24) + '</select>';
}
function refreshBtn() { return '<button class="btn sm ghost" onclick="refreshPage()" title="ดึงตัวเลขล่าสุด">' + I('refresh', 'sm') + '<span class="lbl">รีเฟรช</span></button>'; }
function printBtn() { return '<button class="btn sm ghost" onclick="window.print()">' + I('printer', 'sm') + '<span class="lbl">พิมพ์</span></button>'; }

/* ═══════════════════════════════════════════════════════
   หน้าแพทย์ / ใบแจ้งยอด — ยอดค่าตอบแทนรายเดือนของแพทย์ 1 ท่าน
   ═══════════════════════════════════════════════════════ */
ROUTES.my = function (ym) {
  ym = ym || thisYm();
  header('ยอดค่าตอบแทนของฉัน', 'รอบ ' + ymTh(ym), monthPicker('my', ym) + refreshBtn());
  load('myMonth', { ym: ym }, function (D, meta) { V(renderDoctorMonth(D, ym, true, meta)); drawDoctorMonth(D); },
       { msg: 'กำลังรวบรวมยอดค่าตอบแทนของท่าน' });
};

function renderDoctorMonth(D, ym, isMine, meta) {
  var s = D.summary, h = D.head, html = '';
  html += '<div class="btn-row" style="justify-content:space-between;margin-bottom:12px">' +
    '<div><b style="font-size:17px">' + esc(h.dctName || h.dct) + '</b> <span class="muted small">รหัส ' + esc(h.dct) +
    (h.dept ? ' · ' + esc(h.dept) : '') + ' · รอบ ' + ymTh(ym) + '</span></div>' +
    '<div class="btn-row">' + tag(h.status, h.closed ? 'ok' : 'warn') + freshBadge(meta) + '</div></div>';

  if (s.changedAfterClose) html += note('warn', 'ยอดรอบนี้เปลี่ยนไปจากตอนปิดรอบ (ตอนปิดรอบ ' + B(s.closedBase) + ' · ปัจจุบัน ' + B(s.base) +
    ' บาท) ส่วนต่างจะถูกนำเข้าเป็นรายการตกเบิกในรอบถัดไป');
  if (h.contract && h.contract.flag) html += note('warn', 'ข้อมูลสัญญา 40(6): ' + esc(h.contract.flag));
  if (!h.contract || !h.contract.startDate) html += note('bad', 'ยังไม่พบข้อมูลสัญญาจ้างตามมาตรา 40(6) ในระบบ กรุณาติดต่อเจ้าหน้าที่ประสานงานคลินิกพิเศษเฉพาะทางนอกเวลา');

  html += '<div class="kpis">' +
    kpi('ยอดรับรอง (ฐานคำนวณ)', B(s.base), N(s.cases) + ' เคส · ' + N(s.items) + ' รายการ', 'hero', 'baht') +
    kpi('ส่วนแพทย์ ' + Math.round((s.base ? s.pay80 / s.base : .8) * 100) + '%', B(s.pay80), 'รหัสรายได้ ' + esc(h.incomePay), 'good', 'steth') +
    kpi('ส่วนโรงพยาบาล', B(s.hos20), 'รหัสรายได้ ' + esc(h.incomeHos), '', 'pie') +
    kpi('ยอดค้างเรียกเก็บ', B(s.outstanding), s.pendingCount ? N(s.pendingCount) + ' รายการรอเรียกเก็บ' : 'ไม่มีรายการค้าง', s.outstanding > 0 ? 'warn' : '', 'clock') +
    kpi('ตกเบิกรอดำเนินการ', B(s.backpayAmount), s.backpayCount ? N(s.backpayCount) + ' รายการ' : 'ไม่มี', s.backpayAmount ? 'warn' : '', 'refresh') +
    '</div>';

  if (!s.items) return html + card('', emptyBox('รอบ ' + ymTh(ym) + ' ยังไม่มีรายการ', 'inbox'));

  html += card('ยอดรายวัน', '<div class="chart" id="cDocDay"></div>', { icon: 'month', sub: 'แตะแท่งเพื่อดูรายการของวันนั้นในตารางด้านล่าง' });

  if (D.groups && D.groups.length > 1) {
    html += card('ยอดแยกตามหน่วยที่ให้บริการ', note('info', 'ยอดด้านบนเป็นยอดรวมทุกหน่วยแล้ว · การเบิกผ่านฝ่ายบริหารงานบุคคลใช้รหัสรายได้แยกกัน') +
      hbars(D.groups.map(function (g) { return { label: g.name, v: g.base, sub: N(g.items) + ' รายการ' }; })), { icon: 'shuffle' });
  }
  html += '<div class="grid g2">' +
    card('ตามสิทธิการรักษา', hbars(D.byRight.slice(0, 10).map(function (r) {
      return { label: r.name, v: r.base, sub: N(r.items) + ' รายการ', on: "TBL.setFilter('docRows','pttype'," + JSON.stringify(r.name).replace(/"/g, '&quot;') + ")" };
    })), { icon: 'scale', sub: 'ยอดรับรอง · แตะเพื่อกรองตาราง' }) +
    card('ตามรหัสค่าธรรมเนียม', hbars(D.byCode.slice(0, 10).map(function (c) {
      return { label: c.code + (c.label ? ' · ' + c.label : ''), v: c.base, sub: N(c.items) + ' รายการ', color: 'var(--c1)',
               on: "TBL.setFilter('docRows','code','" + esc(c.code) + "')" };
    })), { icon: 'hash', sub: 'ยอดรับรอง · แตะเพื่อกรองตาราง' }) + '</div>';

  html += card('รายการละเอียด', '<div id="docRows"></div>', { icon: 'list', raw: false, flush: true,
    sub: 'ค้นหา HN · กรองตามวัน สิทธิ รหัส สถานะ · ส่งออก Excel ได้' });
  html += '<div class="small muted" style="margin-top:-6px">ยอดคำนวณจากยอดที่โรงพยาบาลเรียกเก็บได้จริง (เงินสด + ยอดที่เรียกเก็บจากต้นสังกัด/บริษัทประกัน) · ' +
    'หากพบยอดคลาดเคลื่อน กรุณาแจ้งหน่วยงานบริหารเงินเดือน ค่าจ้างและค่าตอบแทน ฝ่ายบริหารงานบุคคล</div>';
  return html;
}

function drawDoctorMonth(D) {
  if (!D.summary.items) return;
  var days = D.byDate || [];
  CH.bar('cDocDay', { labels: days.map(function (d) { return Number(d.date.slice(8)) + ' ' + TH_MON[Number(d.date.slice(5, 7))]; }),
    series: [{ label: 'ยอดรับรอง', data: days.map(function (d) { return d.base; }) }],
    onClick: function (i) { TBL.setRange('docRows', 'date', days[i].date, days[i].date); } });
  TBL.make('docRows', {
    key: 'docRows', reset: true, rows: D.rows, exportName: 'รายการค่าตอบแทน_' + D.head.dct + '_' + D.head.ym,
    search: { placeholder: 'HN · รหัส · สิทธิ', keys: ['hn', 'code', 'codeLabel', 'pttype', 'status'] },
    filters: [{ type: 'daterange', k: 'date', label: 'ตั้งแต่วันที่' },
              { type: 'select', k: 'pttype', label: 'สิทธิการรักษา' },
              { type: 'select', k: 'code', label: 'รหัส' },
              { type: 'select', k: 'status', label: 'สถานะ' }],
    chips: [{ id: 'cnt', label: 'นับจ่าย', fn: function (r) { return r.counted; } },
            { id: 'not', label: 'ไม่นับจ่าย', tone: 'warn', fn: function (r) { return !r.counted; } },
            { id: 'out', label: 'มียอดค้างเก็บ', tone: 'warn', fn: function (r) { return r.outstanding > 0.009; } }],
    rowCls: function (r) { return r.counted ? '' : 'dim'; },
    cols: [{ k: 'date', label: 'วันที่', type: 'date' }, { k: 'hn', label: 'HN', type: 'hn' },
           { k: 'pttype', label: 'สิทธิการรักษา' },
           { k: 'code', label: 'รหัส', render: function (r) { return '<span class="mono">' + esc(r.code) + '</span>' + (r.codeLabel ? '<span class="sub">' + esc(r.codeLabel) + '</span>' : ''); } },
           { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'collected', label: 'เก็บได้', type: 'money', sum: true },
           { k: 'payable', label: 'นับจ่าย', type: 'money0', sum: true, get: function (r) { return r.counted ? r.payable : 0; } },
           { k: 'status', label: 'สถานะ', render: function (r) { return tag(r.status) + (r.reason ? '<span class="sub">' + esc(r.reason) + '</span>' : ''); } }]
  });
}

/* ═══════════════ แพทย์ — ยอดค้างจ่ายของฉัน ═══════════════ */
ROUTES.myPending = function () {
  header('ยอดค้างจ่ายของฉัน', 'รายการที่โรงพยาบาลยังเรียกเก็บเงินไม่ครบ', refreshBtn());
  load('myPending', {}, function (D, meta) {
    var html = '<div class="kpis">' + kpi('ยอดค้างจ่าย', B(D.outstanding), N(D.count) + ' รายการ', D.count ? 'hero' : 'good', 'clock') + '</div>' +
      note('info', esc(D.note));
    if (!D.count) return V(html + card('', note('ok', 'ไม่มีรายการค้างจ่าย ค่าตอบแทนของท่านได้รับครบตามยอดที่โรงพยาบาลเรียกเก็บได้แล้ว')));
    V(html + card('รายการค้างจ่าย', '<div id="myPend"></div>', { icon: 'clock', flush: true, acts: freshBadge(meta) }));
    TBL.make('myPend', { key: 'myPend', rows: D.rows, exportName: 'ยอดค้างจ่ายของฉัน',
      search: { placeholder: 'HN · สิทธิ', keys: ['hn', 'pttype', 'code'] },
      filters: [{ type: 'daterange', k: 'date', label: 'ตั้งแต่วันที่' }, { type: 'select', k: 'pttype', label: 'สิทธิ' }],
      cols: [{ k: 'date', label: 'วันที่', type: 'date' }, { k: 'hn', label: 'HN', type: 'hn' }, { k: 'pttype', label: 'สิทธิการรักษา' },
             { k: 'code', label: 'รหัส', type: 'code' }, { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true },
             { k: 'collected', label: 'เก็บได้', type: 'money', sum: true }, { k: 'outstanding', label: 'ค้างเก็บ', type: 'money', sum: true },
             { k: 'status', label: 'สถานะ', render: function (r) { return tag(r.status) + (r.note || r.reason ? '<span class="sub">' + esc(r.note || r.reason) + '</span>' : ''); } }] });
  });
};

/* ═══════════════ แพทย์ — ประวัติและสัญญา ═══════════════ */
ROUTES.myProfile = function () {
  header('ประวัติและสัญญาของฉัน', 'ข้อมูลตามทะเบียนของหน่วยงานบริหารเงินเดือน ค่าจ้างและค่าตอบแทน', '');
  load('myProfile', {}, function (D) {
    var d = D.doctor, c = D.contract;
    function dl(list) { return '<dl class="dl">' + list.map(function (x) { return '<dt>' + esc(x[0]) + '</dt><dd>' + (x[1] === undefined || x[1] === '' ? '—' : x[1]) + '</dd>'; }).join('') + '</dl>'; }
    var html = '';
    if (D.oldCodes && D.oldCodes.length) html += note('info', 'ระบบทราบว่ารหัสเดิมของท่านคือ ' + D.oldCodes.map(esc).join(', ') + ' และรวมยอดจากรหัสเดิมให้แล้ว');
    if (!c.startDate) html += note('warn', 'ยังไม่พบข้อมูลสัญญาในระบบ หากท่านได้ลงนามสัญญาแล้ว กรุณาติดต่อเจ้าหน้าที่ประสานงานคลินิกพิเศษเฉพาะทางนอกเวลา');
    html += '<div class="grid g2">' +
      card('ประวัติแพทย์', dl([['รหัสแพทย์', esc(d.code)], ['ชื่อ - สกุล', esc(d.fullName || ((d.title || '') + d.name))], ['ฝ่าย / สาขา', esc(d.dept || '')],
        ['ความเชี่ยวชาญ', esc(d.specialty || '')], ['อีเมล', esc(d.email || '')], ['โทรศัพท์', esc(d.phone || '')],
        ['พบรายการครั้งแรก', d.firstSeen ? dTh(d.firstSeen) : ''], ['พบรายการล่าสุด', d.lastSeen ? dTh(d.lastSeen) : '']]), { icon: 'user' }) +
      card('สัญญาจ้างตามมาตรา 40(6)', dl([['เลขที่สัญญา', esc(c.contractNo || '')], ['วันเริ่มสัญญา', c.startDate ? dTh(c.startDate) : ''],
        ['วันลงนาม', c.signDate ? dTh(c.signDate) : ''], ['วันสิ้นสุด', c.endDate ? dTh(c.endDate) : 'ไม่ระบุ (ต่อเนื่อง)'],
        ['สถานะ', tag(c.status || '—', c.startDate ? 'ok' : 'warn')], ['ไฟล์สัญญา', c.hasFile ? esc(c.fileName || 'มีไฟล์แนบ') : 'ยังไม่มีไฟล์ในระบบ']]) +
        (c.hasFile && D.canDownloadContract ? '<div class="btn-row" style="margin-top:14px"><button class="btn pri" onclick="dlContract(this)">' + I('download', 'sm') + 'ดาวน์โหลดไฟล์สัญญา</button></div>'
         : (c.hasFile ? '<div class="hint" style="margin-top:10px">การดาวน์โหลดไฟล์สัญญาถูกปิดไว้ กรุณาติดต่อฝ่ายบริหารงานบุคคล</div>' : '')), { icon: 'file' }) + '</div>';
    V(html);
  });
};
function dlContract(btn) {
  var old = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span> กำลังเตรียมไฟล์';
  api('myContractFile').then(function (f) {
    var bin = atob(f.base64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], { type: f.mime || 'application/pdf' }));
    var a = document.createElement('a'); a.href = url; a.download = f.fileName; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    btn.disabled = false; btn.innerHTML = old;
  }).catch(function (e) { btn.disabled = false; btn.innerHTML = old; toast(e.message, 'bad'); });
}

/* ═══════════════════════════════════════════════════════
   แดชบอร์ด — กราฟหลายมุม คลิกเจาะดูได้
   ═══════════════════════════════════════════════════════ */
S.dash = { range: '12', ym: '' };
function dashRange() {
  var cur = thisYm(), r = S.dash.range;
  if (r === 'fy') { var fy = fiscalOf(cur); return { from: (fy - 544) + '-10', to: (fy - 543) + '-09' }; }
  if (r === 'fy1') { var f1 = fiscalOf(cur) - 1; return { from: (f1 - 544) + '-10', to: (f1 - 543) + '-09' }; }
  return { from: ymAdd(cur, -11), to: cur };
}
function setDash(k, v) { S.dash[k] = v; go('dash'); }

ROUTES.dash = function () {
  var rg = dashRange(), fy = fiscalOf(thisYm());
  var acts = '<div class="seg">' + [['12', '12 เดือนล่าสุด'], ['fy', 'ปีงบ ' + fy], ['fy1', 'ปีงบ ' + (fy - 1)]].map(function (x) {
      return '<button class="' + (S.dash.range === x[0] ? 'on' : '') + '" onclick="setDash(\'range\',\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>';
  header('แดชบอร์ด', 'ภาพรวมค่าตอบแทนแพทย์ · แตะกราฟเพื่อเจาะดูรายละเอียด', acts + refreshBtn());
  load('getDashboard', { from: rg.from, to: rg.to, ym: S.dash.ym || '' }, function (D, meta) { V(renderDash(D, meta)); drawDash(D); },
       { msg: 'กำลังรวบรวมภาพรวม' });
};

function renderDash(D, meta) {
  var F = D.focus, fym = D.focusYm, a = D.alert;
  var cur = D.trend.filter(function (t) { return t.ym === fym; })[0] || D.trend[D.trend.length - 1] || null;
  var sum = D.trend.reduce(function (x, y) { return x + Number(y.base || 0); }, 0);
  var html = '<div class="btn-row" style="justify-content:space-between;margin-bottom:14px">' +
    '<div class="btn-row"><span class="muted small">เดือนที่ดูรายละเอียด</span><select class="inp sm" onchange="setDash(\'ym\',this.value)">' +
    D.trend.slice().reverse().map(function (t) { return '<option value="' + t.ym + '"' + (t.ym === fym ? ' selected' : '') + '>' + ymTh(t.ym) + '</option>'; }).join('') +
    (D.trend.length ? '' : '<option>ยังไม่มีข้อมูล</option>') + '</select></div>' + freshBadge(meta) + '</div>';

  var todo = [];
  if (a.waitGroup) todo.push('<b>' + N(a.waitGroup) + '</b> รายการจับกลุ่มการเบิกไม่ได้ — ปิดรอบไม่ได้จนจัดครบ <a href="#day">ไปตรวจรายวัน</a>');
  if (a.noContract) todo.push('<b>' + N(a.noContract) + '</b> แพทย์มียอดเบิกแต่ยังไม่พบสัญญา 40(6) <a href="#contracts">ตรวจทะเบียน</a>');
  if (a.contractFlags) todo.push('<b>' + N(a.contractFlags) + '</b> รายการสัญญาขึ้นธงรอตรวจ <a href="#contracts">ดูรายการ</a>');
  if (a.backpay) todo.push('<b>' + N(a.backpay) + '</b> รายการตกเบิก/เรียกคืนรอดำเนินการ <a href="#backpay">ดูรายการ</a>');
  if (a.openMonths && a.openMonths.length) todo.push('รอบที่ยังไม่ปิด: ' + a.openMonths.slice(0, 6).map(function (x) { return esc(String(x).replace(/^(\d{4}-\d{2})/, function (m) { return ymShort(m); })); }).join(' · ') + ' <a href="#close">ไปตัดรอบ</a>');
  html += todo.length ? note('warn', '<b>เรื่องที่ต้องจัดการ</b><ul>' + todo.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>')
                      : note('ok', 'ไม่มีรายการค้างดำเนินการ ระบบพร้อมสำหรับรอบเบิกถัดไป');

  if (cur) {
    html += '<div class="kpis">' +
      kpi('ยอดรับรอง ' + ymShort(cur.ym), B(cur.base), 'แพทย์ ' + B(cur.pay80) + ' · รพ. ' + B(cur.hos20), 'hero', 'baht', "go('month','" + cur.ym + "')") +
      kpi('แพทย์ที่มียอด', N(cur.doctors) + '<small>ท่าน</small>', N(cur.cases) + ' เคส · ' + N(cur.items) + ' รายการ', '', 'steth', "go('month','" + cur.ym + "')") +
      kpi('ยอดค้างจ่ายสะสม', B(D.pending.amount), N(D.pending.count) + ' รายการรอเรียกเก็บ', D.pending.count ? 'warn' : 'good', 'clock', "go('pending')") +
      kpi('หนี้เสีย / หนี้ศูนย์', B(D.writeoff.amount), N(D.writeoff.count) + ' รายการ · ไม่นับเป็นรายได้', D.writeoff.count ? 'bad' : '', 'slash', "go('writeoff')") +
      kpi('รวมทั้งช่วง', K(sum), D.trend.length + ' เดือน · เฉลี่ย ' + K(D.trend.length ? sum / D.trend.length : 0) + '/เดือน', '', 'trend') +
      kpi('สถานะรอบ ' + ymShort(cur.ym), esc(cur.statusTh), cur.open ? 'ยังแก้ไขได้' : 'ล็อกยอดแล้ว', (cur.open ? 'warn' : 'good') + ' txt', 'lock', "go('close','" + cur.ym + "')") +
      '</div>';
  } else html += card('', emptyBox('ยังไม่มีข้อมูลในช่วงนี้ — ดึงข้อมูลจากระบบโรงพยาบาลที่หน้า "ตัดรอบและออกเอกสาร"', 'inbox'));

  html += '<div class="grid g12">' +
    card('ยอดรับรองรายเดือน', '<div class="chart lg" id="cTrend"></div>', { icon: 'month', sub: 'แยก รพ. / ศูนย์สาขา · แตะแท่งเพื่อเปิดสรุปเดือนนั้น' }) +
    card('สถานะการจ่าย ' + (F ? ymShort(fym) : ''), '<div class="chart lg" id="cStatus"></div>', { icon: 'pie', sub: 'จำนวนรายการตามสถานะ' }) + '</div>';

  if (F) {
    html += '<div class="grid g12">' +
      card('ยอดรายวัน ' + ymTh(fym), '<div class="chart" id="cDays"></div>', { icon: 'calendar', sub: 'แตะแท่งเพื่อไปตรวจรายการของวันนั้น' }) +
      card('ตามวันในสัปดาห์', '<div class="chart" id="cWd"></div>', { icon: 'calendar', sub: 'ยอดรับรองรวมของเดือนที่เลือก' }) + '</div>';
    html += '<div class="grid g2">' +
      card('แพทย์ยอดสูงสุด ' + ymShort(fym), '<div class="chart lg" id="cTop"></div>', { icon: 'steth', sub: 'แตะเพื่อเปิดใบแจ้งยอดรายคน' }) +
      card('ตามสิทธิการรักษา', hbars(F.byRight.slice(0, 10).map(function (r) { return { label: r.name, v: r.base, sub: N(r.items) }; })), { icon: 'scale', sub: 'ยอดรับรอง · ตัวเลขหลังแถบ = จำนวนรายการ' }) + '</div>';
    html += '<div class="grid g3">' +
      card('รหัสค่าธรรมเนียม', hbars(F.byCode.slice(0, 8).map(function (r) { return { label: r.key + (r.name && r.name !== r.key ? ' ' + r.name : ''), v: r.base, color: 'var(--c1)' }; })), { icon: 'hash' }) +
      card('หน่วยที่คีย์ (ref_location)', hbars(F.byClinic.slice(0, 8).map(function (r) { return { label: r.name, v: r.base, color: 'var(--c3)' }; })), { icon: 'shuffle' }) +
      card('อายุรายการค้างจ่าย', '<div class="chart sm" id="cAging"></div>', { icon: 'clock', sub: 'แตะแท่งเพื่อเปิดรายการ' }) + '</div>';
  }

  if (D.trend.length) {
    html += card('สรุปรายเดือน', '<div id="tTrend"></div>', { icon: 'list', flush: true });
  }
  return html;
}

function drawDash(D) {
  var F = D.focus, tr = D.trend;
  if (tr.length) {
    CH.bar('cTrend', { labels: tr.map(function (t) { return ymShort(t.ym); }), stacked: true,
      series: [{ label: 'แพทย์ทั่วไป (R101)', data: tr.map(function (t) { return (t.byGrp || {}).DR || 0; }), color: getComputedStyle(document.documentElement).getPropertyValue('--c0').trim() },
               { label: 'ศูนย์สาขา (R106)', data: tr.map(function (t) { return (t.byGrp || {}).ANC || 0; }), color: getComputedStyle(document.documentElement).getPropertyValue('--c1').trim() }],
      onClick: function (i) { go('month', tr[i].ym); } });
  }
  if (F) {
    var ST_COLOR = { 'จ่ายแล้ว': '--ok', 'จ่ายบางส่วน': '--c4', 'ค้างจ่าย': '--warn', 'ระงับโดยผู้จัดการ': '--bad', 'ไม่เบิก': '--c8', 'รอจัดกลุ่ม': '--c7' };
    var cs = getComputedStyle(document.documentElement);
    CH.donut('cStatus', { labels: F.byStatus.map(function (s) { return s.name; }), data: F.byStatus.map(function (s) { return s.items; }),
      colors: F.byStatus.map(function (s) { return cs.getPropertyValue(ST_COLOR[s.name] || '--c8').trim(); }), fmt: function (v) { return N(v) + ' รายการ'; } });
    var days = F.byDate;
    CH.bar('cDays', { labels: days.map(function (d) { return String(Number(d.date.slice(8))); }),
      series: [{ label: 'ยอดรับรอง', data: days.map(function (d) { return d.base; }) }],
      onClick: function (i) { go('day', days[i].date); } });
    CH.bar('cWd', { labels: F.byWeekday.map(function (w) { return w.name; }), series: [{ label: 'ยอดรับรอง', data: F.byWeekday.map(function (w) { return w.base; }), color: cs.getPropertyValue('--c1').trim() }] });
    var top = (D.topDoctors || []).slice(0, 10);
    CH.bar('cTop', { horizontal: true, labels: top.map(function (d) { return d.dctName || d.dct; }),
      series: [{ label: 'ยอดรับรอง', data: top.map(function (d) { return d.base; }) }],
      onClick: function (i) { go('docs', top[i].dct + '|' + D.focusYm); } });
    var ag = D.aging || [];
    CH.bar('cAging', { labels: ag.map(function (x) { return x.label; }), series: [{ label: 'ยอดค้าง', data: ag.map(function (x) { return x.amount; }), color: cs.getPropertyValue('--warn').trim() }],
      onClick: function (i) { S.pendChip = ['d30', 'd60', 'd90', 'd180', 'd181'][i]; go('pending'); } });
  }
  if (tr.length) {
    TBL.make('tTrend', { key: 'tTrend', reset: true, rows: tr.slice().reverse(), exportName: 'สรุปรายเดือน', compact: true,
      onRow: function (t) { go('month', t.ym); },
      cols: [{ k: 'ym', label: 'รอบ', render: function (t) { return '<b>' + ymTh(t.ym) + '</b>'; } },
             { k: 'doctors', label: 'แพทย์', type: 'int' }, { k: 'cases', label: 'เคส', type: 'int', sum: true },
             { k: 'base', label: 'ยอดรับรอง', type: 'money', sum: true }, { k: 'pay80', label: 'ส่วนแพทย์', type: 'money', sum: true },
             { k: 'hos20', label: 'ส่วน รพ.', type: 'money', sum: true }, { k: 'outstanding', label: 'ค้างเก็บ', type: 'money0', sum: true },
             { k: 'statusTh', label: 'สถานะ', render: function (t) { return tag(t.statusTh, t.open ? 'warn' : 'ok'); } }] });
  }
}

/* ═══════════════════════════════════════════════════════
   สรุปรายเดือน
   ═══════════════════════════════════════════════════════ */
ROUTES.month = function (ym) {
  ym = ym || thisYm();
  header('สรุปรายเดือน', ymTh(ym) + ' · รวมทุกหน่วยต่อแพทย์', monthPicker('month', ym) +
    (isHr() ? '<button class="btn sm" onclick="rebuildMonth(\'' + ym + '\',this)" title="ใช้หลังแก้เงื่อนไขสิทธิ รหัส DF กฎจัดกลุ่ม">' + I('refresh', 'sm') + '<span class="lbl">คำนวณใหม่</span></button>' +
      '<button class="btn sm pri" onclick="go(\'close\',\'' + ym + '\')">' + I('check', 'sm') + '<span class="lbl">ตัดรอบ</span></button>' : '') + printBtn());
  load('getMonth', { ym: ym, grp: 'ALL' }, function (D, meta) {
    var s = D.summary;
    var html = '<div class="btn-row" style="justify-content:space-between;margin-bottom:12px"><div class="btn-row">' +
      D.groups.map(function (g) { return tag(g.grpName + ' · ' + g.statusTh, g.status === 'closed' ? 'ok' : 'warn'); }).join(' ') + '</div>' + freshBadge(meta) + '</div>';
    if (D.waitGroup) html += note('bad', 'มี <b>' + N(D.waitGroup) + '</b> รายการที่จับกลุ่มการเบิกไม่ได้ ยังไม่รวมอยู่ในตาราง และต้องจัดให้ครบก่อนปิดรอบ <a href="#day">ไปตรวจรายวัน</a>');
    if (s.contractIssues) html += note('warn', 'มี <b>' + N(s.contractIssues) + '</b> แพทย์ที่ข้อมูลสัญญา 40(6) ยังไม่เรียบร้อย — กดปุ่มกรอง "สัญญาต้องตรวจ" ด้านล่าง');
    html += '<div class="kpis">' +
      kpi('ยอดรับรองรวม', B(s.base), 'ฐานคำนวณ 80/20', 'hero', 'baht') +
      kpi('ส่วนแพทย์', B(s.pay80), 'ยอดที่ต้องเบิก', 'good', 'steth') +
      kpi('ส่วนโรงพยาบาล', B(s.hos20), 'รายได้โรงพยาบาล', '', 'pie') +
      kpi('แพทย์ที่มียอด', N(s.doctors) + '<small>ท่าน</small>', N(s.cases) + ' เคส · ' + N(s.items) + ' รายการ', '', 'users') +
      kpi('ค้างเรียกเก็บ', B(s.outstanding), 'ยังไม่จ่าย รอเรียกเก็บครบ', s.outstanding ? 'warn' : '', 'clock', "go('pending')") +
      (s.writeoff ? kpi('หนี้เสีย/หนี้ศูนย์', B(s.writeoff), 'ไม่นับเป็นรายได้', 'bad', 'slash', "go('writeoff')") : '') + '</div>';
    if (!D.rows.length) { V(html + card('', emptyBox('รอบ ' + ymTh(ym) + ' ยังไม่มีข้อมูล'))); return; }
    html += card('แพทย์ยอดสูงสุด 15 อันดับ', '<div class="chart lg" id="cMonTop"></div>', { icon: 'steth', sub: 'แตะแท่งเพื่อเปิดใบแจ้งยอดรายคน' });
    html += card('รายละเอียดรายแพทย์', '<div id="tMonth"></div>', { icon: 'list', flush: true, sub: 'แตะแถวเพื่อเปิดใบแจ้งยอด · ส่งออก Excel ได้' });
    V(html);
    var top = D.rows.slice(0, 15);
    CH.bar('cMonTop', { horizontal: true, labels: top.map(function (r) { return r.dctName || r.dct; }),
      series: [{ label: 'ยอดรับรอง', data: top.map(function (r) { return r.base; }) }], onClick: function (i) { go('docs', top[i].dct + '|' + ym); } });
    TBL.make('tMonth', { key: 'tMonth', rows: D.rows, exportName: 'สรุปรายเดือน_' + ym, sort: { i: 6, d: -1 },
      search: { placeholder: 'รหัส · ชื่อแพทย์ · ฝ่าย', keys: ['dct', 'dctName', 'dept'] },
      filters: [{ type: 'select', k: 'grpNames', label: 'หน่วย' }, { type: 'select', k: 'dept', label: 'ฝ่าย/สาขา' }, { type: 'min', k: 'base', label: 'ยอดขั้นต่ำ' }],
      chips: [{ id: 'out', label: 'มีค้างเก็บ', tone: 'warn', fn: function (r) { return r.outstanding > 0; } },
              { id: 'ct', label: 'สัญญาต้องตรวจ', tone: 'bad', fn: function (r) { return !r.contractOk; } },
              { id: 'anc', label: 'มียอดศูนย์สาขา', fn: function (r) { return r.grps && r.grps.indexOf('ANC') >= 0; } },
              { id: 'big', label: 'ยอด ≥ 100,000', fn: function (r) { return r.base >= 100000; } }],
      rowCls: function (r) { return r.contractOk ? '' : 'flag'; },
      onRow: function (r) { go('docs', r.dct + '|' + ym); },
      cols: [{ k: 'dct', label: 'รหัส', type: 'code' },
             { k: 'dctName', label: 'ชื่อ - สกุล', render: function (r) { return '<b>' + esc(r.dctName || '—') + '</b><span class="sub">' + esc(r.dept || '') + '</span>'; } },
             { k: 'grpNames', label: 'หน่วย', cls: 'small' },
             { k: 'cases', label: 'เคส', type: 'int', sum: true }, { k: 'items', label: 'รายการ', type: 'int', sum: true },
             { k: 'contractOk', label: 'สัญญา', sort: false, render: function (r) { return r.contractOk ? tag('มีสัญญา', 'ok') : '<span class="tag warn" title="' + esc(r.contractFlag) + '">ตรวจสอบ</span>'; } },
             { k: 'base', label: 'ยอดรับรอง', type: 'money', sum: true }, { k: 'pay80', label: 'ส่วนแพทย์', type: 'money', sum: true },
             { k: 'hos20', label: 'ส่วน รพ.', type: 'money', sum: true }, { k: 'outstanding', label: 'ค้างเก็บ', type: 'money0', sum: true }] });
  }, { msg: 'กำลังรวมยอดรอบ ' + ymTh(ym) });
};

function rebuildMonth(ym, btn) {
  UI.confirm({ title: 'คำนวณยอดรอบ ' + ymTh(ym) + ' ใหม่?', icon: 'refresh',
    body: '<p>ระบบจะคิดยอดใหม่ตามเงื่อนไขปัจจุบันจากข้อมูลที่ดึงมาแล้ว โดย<b>ไม่ลบ</b>การตัดสินใจที่เจ้าหน้าที่บันทึกไว้</p>' +
      '<p class="muted small" style="margin:0">ถ้ารอบนี้ปิดแล้ว ยอดตอนปิดรอบจะยังอยู่ และส่วนต่างจะขึ้นเป็นรายการตกเบิก</p>', ok: 'คำนวณใหม่' })
    .then(function (y) {
      if (!y) return;
      var old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
      api('rebuildMonth', { ym: ym }, { write: true })
        .then(function () { toast('คำนวณยอดรอบ ' + ymTh(ym) + ' ใหม่เรียบร้อย', 'ok'); go('month', ym); })
        .catch(function (e) { btn.disabled = false; btn.innerHTML = old; toast(e.message, 'bad', 9000); });
    });
}

/* ═══════════════════════════════════════════════════════
   ตรวจรายวัน — ตรวจหน้างานว่าเคสไหน/หัตถการไหน "ไม่ขึ้น"
   ═══════════════════════════════════════════════════════ */
ROUTES.day = function (date) {
  date = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : today();
  header('ตรวจรายวัน', dThLong(date),
    '<button class="btn sm icon" onclick="go(\'day\',\'' + shiftDay(date, -1) + '\')" title="วันก่อน">' + I('left', 'sm') + '</button>' +
    '<input type="date" class="inp sm" value="' + date + '" onchange="go(\'day\',this.value)" aria-label="เลือกวันที่">' +
    '<button class="btn sm icon" onclick="go(\'day\',\'' + shiftDay(date, 1) + '\')" title="วันถัดไป">' + I('right', 'sm') + '</button>' +
    (date !== today() ? '<button class="btn sm ghost" onclick="go(\'day\')">วันนี้</button>' : '') +
    (isHr() ? '<button class="btn sm pri" onclick="doSync(\'' + date + '\')" title="ดึงรายการล่าสุดของวันนี้จากระบบโรงพยาบาล">' + I('refresh', 'sm') + '<span class="lbl">ดึงสดจากระบบ รพ.</span></button>' : refreshBtn()));
  load('getDay', { date: date, grp: 'ALL' }, function (D, meta) { V(renderDay(D, meta)); drawDay(D); }, { msg: 'กำลังโหลดรายการวันที่ ' + dTh(date) });
};

function renderDay(D, meta) {
  var s = D.summary, html = '';
  /* แถบเลือกวัน */
  if (D.strip && D.strip.length) {
    html += '<div class="strip" id="dayStrip">' + D.strip.map(function (x) {
      return '<button class="' + (x.date === D.date ? 'on' : '') + '" onclick="go(\'day\',\'' + x.date + '\')">' +
        '<small>' + TH_WD[wday(x.date)] + '</small><b>' + Number(x.date.slice(8)) + '</b><em>' + N(x.items) + ' รายการ</em>' +
        '<span class="dot' + (x.waitGroup ? '' : ' no') + '"></span></button>';
    }).join('') + '</div>';
  }
  html += '<div class="btn-row" style="justify-content:space-between;margin:6px 0 12px"><span class="small muted">' +
    (s.fetched ? 'ดึงจากระบบโรงพยาบาลล่าสุด ' + esc(s.fetchedAt || s.apiAt) + (s.prevFetchedAt ? ' · ครั้งก่อน ' + esc(s.prevFetchedAt) : '')
               : 'ยังไม่เคยดึงข้อมูลวันนี้' + (isHr() ? ' — กดปุ่ม "ดึงสดจากระบบ รพ."' : '')) + '</span>' + freshBadge(meta) + '</div>';

  if (!s.fetched && !D.rows.length) return html + card('', emptyBox('ยังไม่มีข้อมูลของวันนี้ในระบบ · ระบบดึงอัตโนมัติทุกคืน หรือกด "ดึงสดจากระบบ รพ." เพื่อดึงเดี๋ยวนี้', 'calendar'));

  html += '<div class="kpis">' +
    kpi('ยอดรับรอง', B(s.base), 'ส่วนแพทย์ ' + B(s.pay80), 'hero', 'baht') +
    kpi('รายการ DF', N(s.items) + '<small>รายการ</small>', N(s.cases) + ' เคส · ' + N(s.doctors) + ' แพทย์', '', 'list') +
    kpi('ยอดเรียกเก็บ', B(s.total), 'ก่อนหักยอดที่ยังเก็บไม่ได้', '', 'file') +
    kpi('คีย์แล้วแต่ไม่นับจ่าย', N(s.notCounted) + '<small>รายการ</small>', 'ยอดเรียกเก็บ ' + B(s.notCountedTotal), s.notCounted ? 'warn' : 'good', 'alert', "TBL.setChip('tDay','notcnt')") +
    kpi('รอจัดกลุ่ม', N(s.waitGroup), s.waitGroup ? 'ต้องจัดก่อนปิดรอบ' : 'เรียบร้อย', s.waitGroup ? 'bad' : 'good', 'shuffle', s.waitGroup ? "TBL.setChip('tDay','is_wait')" : '') +
    '</div>';

  /* ทำไมไม่ขึ้น */
  var iss = D.issues || [];
  html += card('ตรวจหน้างาน: รายการที่ต้องดู', iss.length
      ? '<div class="issues">' + iss.map(function (x) {
          return '<button class="issue ' + x.tone + '" onclick="TBL.setChip(\'tDay\',\'is_' + x.key + '\')"><div class="k"><span>' + esc(x.label) + '</span><b>' + N(x.count) + '</b></div>' +
            '<p>' + esc(x.hint) + ' · ยอด ' + B(x.total) + '</p></button>'; }).join('') + '</div>'
      : note('ok', 'ทุกรายการของวันนี้นับจ่ายครบ ไม่มีเรื่องที่ต้องตรวจ'),
    { icon: 'alert', sub: 'แตะการ์ดเพื่อกรองตารางด้านล่าง' });

  /* ยอดเปลี่ยน/หายจากการดึงครั้งก่อน */
  var ch = D.changes || [];
  if (ch.length) {
    var c0 = ch[0];
    var rowsChg = [];
    c0.removed.forEach(function (x) { rowsChg.push({ k: 'rm', x: x }); });
    c0.changed.forEach(function (x) { rowsChg.push({ k: 'ch', x: x }); });
    c0.added.forEach(function (x) { rowsChg.push({ k: 'ad', x: x }); });
    var lab = { rm: ['หายไปจากระบบ รพ.', 'minus'], ch: ['ยอดเปลี่ยน', 'swap'], ad: ['เพิ่มเข้ามาใหม่', 'plus'] };
    html += card('ยอดเปลี่ยน / หายจากการดึงครั้งก่อน',
      note(c0.counts.removed ? 'warn' : 'info', 'ดึงเมื่อ ' + esc(c0.at) + ' เทียบกับ ' + esc(c0.prevAt || 'ครั้งก่อน') + ' · หาย <b>' + N(c0.counts.removed) +
        '</b> · ยอดเปลี่ยน <b>' + N(c0.counts.changed) + '</b> · เพิ่ม <b>' + N(c0.counts.added) + '</b> รายการ' +
        (c0.counts.removed ? '<br>รายการที่หายไปอาจถูกยกเลิกหรือแก้ไขในระบบโรงพยาบาล ควรตรวจกับหน้างาน' : '')) +
      '<div class="chg">' + rowsChg.slice(0, 40).map(function (r) {
        var x = r.x;
        var det = r.k === 'ch' ? 'เรียกเก็บ ' + B(x.before.total) + ' → ' + B(x.total) + ' · เก็บได้ ' + B(x.before.base) + ' → ' + B(x.base) +
                  (x.before.pttype !== x.pttype ? ' · สิทธิ ' + esc(x.before.pttype) + ' → ' + esc(x.pttype) : '')
                : 'เรียกเก็บ ' + B(x.total) + ' · เก็บได้ ' + B(x.base);
        return '<div class="chg-row ' + r.k + '"><div class="ic">' + I(lab[r.k][1], 'sm') + '</div><div><b>' + lab[r.k][0] + '</b> · ' + hnCell(x.hn) +
          ' · <span class="mono">' + esc(x.code) + '</span> · ' + esc(x.dctName || x.dct) + '<div class="d">' + esc(x.pttype) + ' · ' + det + '</div></div>' +
          '<div class="n bold">' + B(x.total) + '</div></div>';
      }).join('') + (rowsChg.length > 40 ? '<div class="muted small">และอีก ' + N(rowsChg.length - 40) + ' รายการ</div>' : '') + '</div>' +
      (ch.length > 1 ? '<details style="margin-top:12px"><summary class="small muted" style="cursor:pointer">ประวัติการเปลี่ยนแปลงก่อนหน้า (' + (ch.length - 1) + ' ครั้ง)</summary><ul class="small">' +
        ch.slice(1).map(function (c) { return '<li>' + esc(c.at) + ' · หาย ' + N(c.counts.removed) + ' · เปลี่ยน ' + N(c.counts.changed) + ' · เพิ่ม ' + N(c.counts.added) + '</li>'; }).join('') + '</ul></details>' : ''),
      { icon: 'swap', sub: 'ระบบดึงทับย้อนหลัง 7 วันทุกคืน จึงเห็นการแก้ไขย้อนหลังในระบบโรงพยาบาล' });
  }

  /* ผู้ป่วยที่มาแต่ไม่มี DF */
  if (isStaff() && D.visits) {
    var vv = D.visits;
    if (!vv.enabled) {
      html += card('ผู้ป่วยที่มารับบริการแต่ไม่มี DF', note('info', 'ส่วนนี้จะเทียบรายชื่อผู้ป่วยที่มารับบริการกับรายการ DF เพื่อหาเคสที่<b>ตรวจแล้วแต่ไม่ได้คีย์ DF</b> · ' +
        'ตอนนี้ปิดการเทียบไว้ · เปิดได้ที่ <a href="#settings">ตั้งค่าระบบ › ที่อยู่ API รายชื่อผู้รับบริการ</a> (ใส่ https://www.thaimed.net/api/?report=smc_visit)'), { icon: 'users' });
    } else if (vv.error) {
      html += card('ผู้ป่วยที่มารับบริการแต่ไม่มี DF', note('bad', esc(vv.error)), { icon: 'users' });
    } else {
      html += card('ผู้ป่วยที่มารับบริการแต่ไม่มี DF', '<div class="kpis" style="margin:0 0 12px">' +
        kpi('ผู้รับบริการทั้งหมด', N(vv.visits), 'ตาม API รายชื่อผู้รับบริการ', '', 'users') +
        kpi('ไม่มี DF เลย', N(vv.noDf.length), 'อาจลืมคีย์ DF', vv.noDf.length ? 'bad' : 'good', 'alert') +
        kpi('มี DF แต่ไม่ใช่ของแพทย์ผู้ตรวจ', N(vv.noDctDf.length), 'อาจคีย์ผิดแพทย์', vv.noDctDf.length ? 'warn' : 'good', 'swap') +
        kpi('visit ที่ยกเลิก', N((vv.cancelled || []).length), 'ไม่นับว่าขาด DF', '', 'slash') + '</div>' +
        '<div id="tVisit"></div>', { icon: 'users', sub: 'เทียบด้วย HN และรหัสแพทย์' });
    }
  }

  html += card('รายการทั้งหมด', '<div id="tDay"></div>', { icon: 'list', flush: true, sub: 'แตะแถวเพื่อดูรายละเอียด' + (isHr() ? ' / แก้สถานะ' : '') });
  html += card('สรุปรายแพทย์', '<div id="tDayDoc"></div>', { icon: 'steth', flush: true, sub: 'แตะแถวเพื่อกรองรายการของแพทย์ท่านนั้น' });
  return html;
}

function drawDay(D) {
  var strip = document.getElementById('dayStrip');
  if (strip) { var on = strip.querySelector('.on'); if (on) strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + 30; }
  if (!D.rows.length && !(D.summary.fetched)) return;
  if (D.visits && D.visits.enabled && !D.visits.error) {
    var vrows = D.visits.noDf.map(function (x) { x.kind = 'ไม่มี DF เลย'; return x; })
      .concat(D.visits.noDctDf.map(function (x) { x.kind = 'มี DF แต่ไม่ใช่แพทย์ผู้ตรวจ'; return x; }))
      .concat((D.visits.cancelled || []).map(function (x) { x.kind = 'visit ที่ยกเลิก'; return x; }));
    TBL.make('tVisit', { key: 'tVisit', reset: true, rows: vrows, compact: true, exportName: 'ผู้รับบริการไม่มีDF_' + D.date, pageSize: 50,
      search: { placeholder: 'HN · VN · แพทย์', keys: ['hn', 'vn', 'dct', 'dctName', 'clinic'] },
      filters: [{ type: 'select', k: 'kind', label: 'ประเภท' }, { type: 'select', k: 'clinic', label: 'คลินิก' }],
      chips: [{ id: 'nodf', label: 'ไม่มี DF เลย', tone: 'bad', fn: function (r) { return r.kind === 'ไม่มี DF เลย'; } },
              { id: 'nodct', label: 'ไม่ใช่แพทย์ผู้ตรวจ', tone: 'warn', fn: function (r) { return r.kind === 'มี DF แต่ไม่ใช่แพทย์ผู้ตรวจ'; } },
              { id: 'cxl', label: 'ยกเลิก', fn: function (r) { return r.kind === 'visit ที่ยกเลิก'; }, hideEmpty: true }],
      initial: { chip: 'nodf' },
      cols: [{ k: 'kind', label: 'ประเภท', render: function (r) { return tag(r.kind, r.kind === 'ไม่มี DF เลย' ? 'bad' : r.kind === 'visit ที่ยกเลิก' ? '' : 'warn') + (r.cancelBy ? '<span class="sub">ยกเลิกโดย ' + esc(r.cancelBy) + '</span>' : ''); } },
             { k: 'hn', label: 'HN', type: 'hn' }, { k: 'vn', label: 'VN', type: 'code' }, { k: 'time', label: 'เวลา' },
             { k: 'dctName', label: 'แพทย์ผู้ตรวจ', render: function (r) { return esc(r.dctName || r.dct || '—') + (r.dct ? '<span class="sub mono">' + esc(r.dct) + '</span>' : ''); } },
             { k: 'pttype', label: 'สิทธิ', cls: 'small' },
             { k: 'clinic', label: 'คลินิก', cls: 'small wrap' }] });
  }
  TBL.make('tDayDoc', { key: 'tDayDoc', reset: true, rows: D.byDoctor, compact: true, pageSize: 15,
    search: { placeholder: 'ชื่อ · รหัสแพทย์', keys: ['dct', 'dctName'] },
    onRow: function (r) { TBL.setFilter('tDay', 'dct', r.dct); },
    rowCls: function (r) { return r.notCounted ? 'flag' : ''; },
    cols: [{ k: 'dctName', label: 'แพทย์', render: function (r) { return '<b>' + esc(r.dctName || '—') + '</b><span class="sub mono">' + esc(r.dct) + '</span>'; } },
           { k: 'cases', label: 'เคส', type: 'int', sum: true }, { k: 'items', label: 'รายการ', type: 'int', sum: true },
           { k: 'notCounted', label: 'ไม่นับจ่าย', type: 'int', sum: true, render: function (r) { return r.notCounted ? '<b class="warnc">' + N(r.notCounted) + '</b>' : '<span class="muted">0</span>'; } },
           { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'base', label: 'ยอดรับรอง', type: 'money', sum: true }] });

  var ISS = {}; (D.issues || []).forEach(function (x) { ISS[x.key] = x; });
  var chips = [{ id: 'notcnt', label: 'ไม่นับจ่ายทั้งหมด', tone: 'warn', fn: function (r) { return !r.counted; } }]
    .concat(Object.keys(ISS).map(function (k) { return { id: 'is_' + k, label: ISS[k].label, tone: ISS[k].tone === 'bad' ? 'bad' : (ISS[k].tone === 'warn' ? 'warn' : ''), fn: function (r) { return r.issue === k; } }; }))
    .concat([{ id: 'flags', label: 'มีข้อสังเกตข้อมูล', fn: function (r) { return r.flags && r.flags.length; }, hideEmpty: true }]);
  TBL.make('tDay', { key: 'tDay', reset: true, rows: D.rows, exportName: 'รายการDF_' + D.date, pageSize: 100,
    search: { placeholder: 'HN · รหัส · ชื่อแพทย์ · สิทธิ', keys: ['hn', 'vn', 'dct', 'dctName', 'code', 'codeLabel', 'pttype', 'clinic', 'status', 'reason'] },
    filters: [{ type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (r) { return r.dctName || r.dct; } },
              { type: 'select', k: 'pttype', label: 'สิทธิการรักษา' },
              { type: 'select', k: 'status', label: 'สถานะ' },
              { type: 'select', k: 'clinic', label: 'หน่วยที่คีย์' }],
    chips: chips,
    rowCls: function (r) { return r.issue === 'wait' || r.issue === 'code' ? 'flag' : (r.counted ? '' : 'dim'); },
    onRow: function (r) { dayDetail(r); },
    cols: [{ k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + '<span class="sub mono">' + esc(r.dct || '') + '</span>'; } },
           { k: 'hn', label: 'HN', type: 'hn' },
           { k: 'pttype', label: 'สิทธิการรักษา', cls: 'small' },
           { k: 'code', label: 'รหัส', render: function (r) { return '<span class="mono">' + esc(r.code) + '</span>' + (r.codeLabel ? '<span class="sub">' + esc(r.codeLabel) + '</span>' : ''); } },
           { k: 'clinic', label: 'หน่วยที่คีย์', cls: 'small', render: function (r) { return esc(r.clinic || r.dept || '—') + (r.grp ? '<span class="sub">' + esc(r.grpName) + '</span>' : ''); } },
           { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'collected', label: 'เก็บได้', type: 'money', sum: true },
           { k: 'payable', label: 'นับจ่าย', type: 'money0', sum: true, get: function (r) { return r.counted ? r.payable : 0; } },
           { k: 'status', label: 'สถานะ', render: function (r) { return tag(r.status) + (r.manual ? ' ' + tag('สั่งโดยเจ้าหน้าที่', 'info') : '') +
               (r.flags.length ? '<span class="sub">' + esc(r.flags.join(' · ')) + '</span>' : ''); } }] });
}

function dayDetail(r) {
  var rows = [['วันที่', dTh(r.date)], ['แพทย์', esc(r.dctName || '—') + ' <span class="mono muted">' + esc(r.dct) + '</span>'],
    ['HN', hnCell(r.hn)], ['VN', esc(r.vn || '—')], ['สิทธิการรักษา', esc(r.pttype || '—')],
    ['รหัสค่าธรรมเนียม', '<span class="mono">' + esc(r.code) + '</span> ' + esc(r.codeLabel || '')],
    ['หน่วยที่คีย์', esc(r.clinic || '—')], ['กลุ่มการเบิก', esc(r.grpName)],
    ['ยอดเรียกเก็บ', B(r.total)], ['เก็บได้ (PAID+CLAIM)', B(r.collected)], ['ค้างเก็บ', B(r.outstanding)],
    ['นับจ่าย', r.counted ? '<b>' + B(r.payable) + '</b>' : '<span class="muted">ไม่นับ</span>'],
    ['สถานะ', tag(r.status) + (r.manual ? ' ' + tag('สั่งโดยเจ้าหน้าที่', 'info') : '')]];
  if (r.entryUser) rows.push(['ผู้คีย์', esc(r.entryUser) + ' ' + esc(r.entryTime)]);
  var body = (r.reason ? note(r.counted ? 'info' : 'warn', esc(r.reason)) : '') +
    (r.flags && r.flags.length ? note('warn', 'ข้อสังเกตข้อมูล: ' + esc(r.flags.join(' · '))) : '') +
    '<dl class="dl">' + rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl>';
  UI.drawer({ title: 'รายละเอียดรายการ', sub: esc(r.dctName || r.dct) + ' · ' + dTh(r.date), body: body,
    foot: (isHr() ? '<button class="btn pri" id="dEdit">' + I('edit', 'sm') + 'แก้สถานะ / ระงับจ่าย</button>' : '') +
      '<button class="btn" onclick="UI.closeDrawer()">ปิด</button>' });
  var b = document.getElementById('dEdit'); if (b) b.onclick = function () { editCase(r); };
}

function doSync(date) {
  UI.confirm({ title: 'ดึงข้อมูลวันที่ ' + dTh(date) + ' จากระบบโรงพยาบาล?', icon: 'refresh', tone: '',
    body: '<p>ระบบจะดึงรายการล่าสุดของวันนี้ทับข้อมูลเดิม และเทียบให้ว่ามีรายการ<b>หาย/ยอดเปลี่ยน/เพิ่มใหม่</b>อะไรบ้าง</p>' +
      '<p class="muted small" style="margin:0">การตัดสินใจที่เจ้าหน้าที่บันทึกไว้จะยังอยู่ครบ</p>', ok: 'ดึงข้อมูล' })
    .then(function (y) {
      if (!y) return;
      toast('กำลังดึงข้อมูลจากระบบโรงพยาบาล…', 'info', 6000);
      api('syncRange', { from: date, to: date }, { write: true })
        .then(function (r) { toast('ดึงข้อมูลเรียบร้อย ' + N(r.rows) + ' รายการ', 'ok'); go('day', date); })
        .catch(function (e) { toast(e.message, 'bad', 9000); });
    });
}

/** แก้สถานะรายเคส — ระงับจ่าย / ไม่เบิก / สั่งจ่าย / คืนตามที่ระบบคำนวณ */
function editCase(r) {
  UI.closeDrawer(true);
  var opts = PAY_STATUS_LIST.slice();
  if (r.manual) opts.push(CASE_RESET);
  UI.dialog({ title: 'แก้สถานะรายการ', icon: 'edit',
    sub: esc(r.dctName || r.dct) + ' · ' + dTh(r.date) + ' · HN ' + esc(r.hn) + ' · ' + esc(r.code) + ' · ' + B(r.total) + ' บาท',
    body: (r.flags && r.flags.length ? note('warn', 'ข้อสังเกต: ' + esc(r.flags.join(' · '))) : '') +
      note('info', '<b>ระงับโดยผู้จัดการ / ไม่เบิก / ค้างจ่าย</b> = ไม่นับจ่าย · <b>จ่ายบางส่วน</b> = จ่ายตามยอดที่เก็บได้ · ' +
        '<b>จ่ายแล้ว</b> = จ่ายเต็มยอดเรียกเก็บ' + (r.manual ? ' · <b>' + CASE_RESET + '</b> = ยกเลิกคำสั่งเดิม' : '') + ' · ระบบคำนวณยอดเดือนใหม่ให้ทันที') +
      '<label class="fld"><span>สถานะใหม่</span><select id="ecStat">' + opts.map(function (x) {
        return '<option' + (x === r.status ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>เหตุผล (บันทึกไว้ตรวจย้อนได้ อย่างน้อย 5 ตัวอักษร)</span>' +
      '<textarea id="ecWhy" placeholder="เช่น เจ้าหน้าที่คีย์รหัสแพทย์ผิด · ประกันยกเลิกกรมธรรม์"></textarea></label>',
    ok: 'บันทึก',
    onOk: function (el) {
      var st = mv('ecStat'), why = mv('ecWhy');
      if (why.length < 5) return dlgErr(el, 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
      return api('setCaseStatus', { id: r.id, status: st, reason: why }, { write: true }).then(function () {
        toast('บันทึกแล้ว ระบบคำนวณยอดเดือนนี้ใหม่ให้เรียบร้อย', 'ok');
        go(S.page, S.arg);
      });
    } });
}

/* ═══════════════════════════════════════════════════════
   ติดตามยอดค้างจ่าย — หน้าหลักของฝ่ายบัญชี
   ═══════════════════════════════════════════════════════ */
ROUTES.pending = function () {
  header('ติดตามยอดค้างจ่าย', 'รายการที่ยังเรียกเก็บเงินไม่ครบ · ไม่หมดอายุเอง', refreshBtn());
  load('getPending', { filter: {} }, function (D, meta) {
    if (D.writeoffReasons) S.cache.writeoffReasons = D.writeoffReasons;
    var t = today(), ym = thisYm();
    var todayAmt = D.rows.filter(function (r) { return r.date === t; }).reduce(function (a, r) { return a + r.outstanding; }, 0);
    var old90 = D.rows.filter(function (r) { return r.ageDays > 90; });
    var html = '<div class="btn-row" style="justify-content:flex-end;margin-bottom:10px">' + freshBadge(meta) + '</div>' +
      '<div class="kpis">' +
      kpi('ยอดค้างจ่ายทั้งหมด', B(D.amount), N(D.count) + ' รายการ', D.count ? 'hero' : 'good', 'clock') +
      kpi('ค้างจากวันนี้', B(todayAmt), 'รายการที่รับบริการวันนี้', '', 'calendar', "TBL.setChip('tPend','today')") +
      kpi('ค้างเกิน 90 วัน', B(old90.reduce(function (a, r) { return a + r.outstanding; }, 0)), N(old90.length) + ' รายการ', old90.length ? 'bad' : 'good', 'alert', "TBL.setChip('tPend','d90p')") +
      kpi('แพทย์ที่มียอดค้าง', N(D.byDoctor.length) + '<small>ท่าน</small>', N(D.byRight.length) + ' สิทธิ', '', 'steth') + '</div>' +
      note('info', 'เมื่อฝ่ายบัญชีบันทึกว่า <b>รับเงินแล้ว</b> ระบบจะตั้งเป็นรายการตกเบิกของรอบถัดไปให้อัตโนมัติ · ตัดหนี้เสีย/หนี้ศูนย์ต้องระบุเหตุผล');
    if (!D.count) return V(html + card('', note('ok', 'ไม่มีรายการค้างจ่าย')));
    html += '<div class="grid g12">' +
      card('ยอดค้างตามวันที่รับบริการ (90 วันล่าสุด)', '<div class="chart" id="cPendDay"></div>', { icon: 'calendar', sub: 'แตะแท่งเพื่อกรองรายการของวันนั้น' }) +
      card('ตามสิทธิการรักษา', hbars(D.byRight.slice(0, 8).map(function (x) {
        return { label: x.name, v: x.amount, color: 'var(--warn)', on: "TBL.setFilter('tPend','pttype'," + JSON.stringify(x.name).replace(/"/g, '&quot;') + ")" }; })),
        { icon: 'scale', sub: 'แตะเพื่อกรอง' }) + '</div>';
    html += card('รายการค้างจ่าย', '<div id="tPend"></div>', { icon: 'list', flush: true,
      sub: 'กรองตามวัน แพทย์ สิทธิ สถานะ · ปุ่มกรองลัด เช่น ค้างวันนี้ ค้างเกิน 90 วัน' + (D.canEdit ? ' · เลือกหลายรายการเพื่อบันทึกผลพร้อมกัน' : '') });
    V(html);

    /* กราฟค้างจ่ายรายวัน */
    var from = shiftDay(t, -89), byD = {};
    D.rows.forEach(function (r) { if (r.date >= from) byD[r.date] = (byD[r.date] || 0) + r.outstanding; });
    var ds = Object.keys(byD).sort();
    CH.bar('cPendDay', { labels: ds.map(function (d) { return dTh(d); }), series: [{ label: 'ยอดค้าง', data: ds.map(function (d) { return byD[d]; }), color: getComputedStyle(document.documentElement).getPropertyValue('--warn').trim() }],
      onClick: function (i) { TBL.setRange('tPend', 'date', ds[i], ds[i]); } });

    var first = S.pendChip || ''; S.pendChip = '';
    TBL.make('tPend', { key: 'tPend', rows: D.rows, exportName: 'ยอดค้างจ่าย_' + t, select: !!D.canEdit, initial: first ? { chip: first } : null,
      search: { placeholder: 'HN · รหัสแพทย์ · ชื่อแพทย์ · สิทธิ', keys: ['hn', 'dct', 'dctName', 'pttype', 'code', 'status', 'note'] },
      filters: [{ type: 'daterange', k: 'date', label: 'รับบริการตั้งแต่' },
                { type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (r) { return r.dctName || r.dct; } },
                { type: 'select', k: 'pttype', label: 'สิทธิการรักษา' },
                { type: 'select', k: 'status', label: 'สถานะ' },
                { type: 'select', k: 'ymDue', label: 'รอบที่ควรได้', labelOf: function (r) { return r.ymDueTh; } },
                { type: 'min', k: 'outstanding', label: 'ค้างตั้งแต่ (บาท)' }],
      chips: [{ id: 'today', label: 'วันนี้', fn: function (r) { return r.date === t; } },
              { id: 'yday', label: 'เมื่อวาน', fn: function (r) { return r.date === shiftDay(t, -1); } },
              { id: 'd7', label: '7 วันล่าสุด', fn: function (r) { return r.ageDays <= 7; } },
              { id: 'mon', label: 'เดือนนี้', fn: function (r) { return String(r.date).slice(0, 7) === ym; } },
              { id: 'mon1', label: 'เดือนก่อน', fn: function (r) { return String(r.date).slice(0, 7) === ymAdd(ym, -1); } },
              { id: 'd30', label: '≤ 30 วัน', fn: function (r) { return r.ageDays <= 30; }, hideEmpty: true },
              { id: 'd60', label: '31–60 วัน', fn: function (r) { return r.ageDays > 30 && r.ageDays <= 60; }, hideEmpty: true },
              { id: 'd90', label: '61–90 วัน', fn: function (r) { return r.ageDays > 60 && r.ageDays <= 90; }, hideEmpty: true },
              { id: 'd90p', label: 'เกิน 90 วัน', tone: 'warn', fn: function (r) { return r.ageDays > 90; } },
              { id: 'd180', label: '91–180 วัน', fn: function (r) { return r.ageDays > 90 && r.ageDays <= 180; }, hideEmpty: true },
              { id: 'd181', label: 'เกิน 180 วัน', tone: 'bad', fn: function (r) { return r.ageDays > 180; } },
              { id: 'big', label: 'ยอด ≥ 5,000', fn: function (r) { return r.outstanding >= 5000; } },
              { id: 'part', label: 'จ่ายบางส่วน', fn: function (r) { return r.status === 'จ่ายบางส่วน'; }, hideEmpty: true },
              { id: 'susp', label: 'ระงับโดยผู้จัดการ', tone: 'bad', fn: function (r) { return r.status === 'ระงับโดยผู้จัดการ'; }, hideEmpty: true }],
      actions: D.canEdit ? '<button class="btn sm pri" onclick="bulkPend()">' + I('check', 'sm') + 'บันทึกผลที่เลือก</button>' : '',
      rowCls: function (r) { return r.ageDays > 180 ? 'flag' : ''; },
      onRow: function (r) { pendDetail(r, D.canEdit); },
      cols: [{ k: 'date', label: 'รับบริการ', type: 'date' },
             { k: 'ageDays', label: 'ค้าง (วัน)', type: 'int', render: function (r) { return '<b class="' + (r.ageDays > 180 ? 'badc' : r.ageDays > 90 ? 'warnc' : '') + '">' + N(r.ageDays) + '</b>'; } },
             { k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + '<span class="sub mono">' + esc(r.dct) + '</span>'; } },
             { k: 'hn', label: 'HN', type: 'hn' },
             { k: 'pttype', label: 'สิทธิการรักษา', cls: 'small' },
             { k: 'code', label: 'รหัส', type: 'code' },
             { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'collected', label: 'เก็บได้', type: 'money', sum: true },
             { k: 'outstanding', label: 'ค้างเก็บ', type: 'money', sum: true, render: function (r) { return '<b>' + B(r.outstanding) + '</b>'; } },
             { k: 'status', label: 'สถานะ', render: function (r) { return tag(r.status) + (r.acctBy ? '<span class="sub">บันทึกโดย ' + esc(r.acctBy) + '</span>' : ''); } },
             { k: 'ymDueTh', label: 'รอบที่ควรได้', cls: 'small nowrap' }] });
  }, { msg: 'กำลังรวบรวมยอดค้างจ่าย' });
};

function pendDetail(r, canEdit) {
  var rows = [['รับบริการ', dTh(r.date) + ' · ค้างมา ' + N(r.ageDays) + ' วัน'], ['แพทย์', esc(r.dctName || '—') + ' <span class="mono muted">' + esc(r.dct) + '</span>'],
    ['HN', hnCell(r.hn)], ['สิทธิการรักษา', esc(r.pttype)], ['รหัส', '<span class="mono">' + esc(r.code) + '</span> ' + esc(r.codeLabel || '')],
    ['เรียกเก็บ', B(r.total)], ['เก็บได้', B(r.collected)], ['ค้างเก็บ', '<b>' + B(r.outstanding) + '</b>'],
    ['สถานะ', tag(r.status)], ['รอบที่ควรได้', esc(r.ymDueTh)]];
  if (r.acctBy) rows.push(['บันทึกล่าสุด', esc(r.acctBy) + ' · ' + esc(r.acctAt)]);
  if (r.note || r.reason) rows.push(['หมายเหตุ', esc(r.note || r.reason)]);
  UI.drawer({ title: 'รายการค้างจ่าย', sub: esc(r.dctName || r.dct) + ' · HN ' + esc(r.hn),
    body: '<dl class="dl">' + rows.map(function (x) { return '<dt>' + x[0] + '</dt><dd>' + x[1] + '</dd>'; }).join('') + '</dl>',
    foot: (canEdit ? '<button class="btn pri" id="pEdit">' + I('check', 'sm') + 'บันทึกผลการเรียกเก็บ</button>' : '') +
      '<a class="btn" href="#day:' + r.date + '">' + I('calendar', 'sm') + 'ดูวันนั้น</a><button class="btn" onclick="UI.closeDrawer()">ปิด</button>' });
  var b = document.getElementById('pEdit'); if (b) b.onclick = function () { UI.closeDrawer(true); editPend(r); };
}

function writeoffForm() {
  var RS = S.cache.writeoffReasons || ['ประกันยกเลิกกรมธรรม์', 'ผู้ป่วยไม่มาชำระส่วนต่าง', 'ต้นสังกัดปฏิเสธการเบิก', 'ติดต่อผู้ป่วยไม่ได้'];
  return '<label class="fld"><span>ผลการเรียกเก็บ</span><select id="pdStat" onchange="pdToggle()">' +
    '<option value="จ่ายแล้ว">รับเงินครบแล้ว — นำเข้ารอบเบิกถัดไป</option>' +
    '<option value="จ่ายบางส่วน">รับเงินบางส่วน — นำเข้ารอบถัดไปเท่าที่รับ</option>' +
    '<option value="ค้างจ่าย">ยังเรียกเก็บไม่ได้ — ติดตามต่อ</option>' +
    '<option value="หนี้เสีย">หนี้เสีย — เรียกเก็บไม่ได้แน่นอน ไม่นับเป็นรายได้</option>' +
    '<option value="หนี้ศูนย์">หนี้ศูนย์ — ยกเลิกยอด ไม่ติดตามต่อ</option></select></label>' +
    '<div class="frow"><label class="fld"><span>ยอดที่รับจริง (บาท)</span><input id="pdAmt" type="number" step="0.01" inputmode="decimal"></label>' +
    '<label class="fld"><span>วันที่รับเงิน</span><input id="pdDate" type="date"></label></div>' +
    '<label class="fld"><span>เหตุผล / หมายเหตุ</span><select id="pdReason" onchange="if(this.value)document.getElementById(\'pdNote\').value=this.value">' +
    '<option value="">— เลือกเหตุผลที่พบบ่อย —</option>' + RS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>' +
    '<textarea id="pdNote" style="margin-top:8px" placeholder="จำเป็นเมื่อตัดเป็นหนี้เสีย/หนี้ศูนย์"></textarea></label>';
}
function pdToggle() {
  var st = mv('pdStat'), paid = (st === 'จ่ายแล้ว' || st === 'จ่ายบางส่วน');
  document.getElementById('pdAmt').disabled = !paid; document.getElementById('pdDate').disabled = !paid;
}
function editPend(r) {
  UI.dialog({ title: 'บันทึกผลการเรียกเก็บ', icon: 'check',
    sub: esc(r.dctName || r.dct) + ' · HN ' + esc(r.hn) + ' · ' + esc(r.pttype) + ' · ค้าง ' + B(r.outstanding) + ' บาท',
    body: writeoffForm(), ok: 'บันทึก',
    onOpen: function () { document.getElementById('pdAmt').value = r.outstanding; document.getElementById('pdDate').value = today(); pdToggle(); },
    onOk: function (el) {
      var st = mv('pdStat'), why = mv('pdNote');
      if ((st === 'หนี้เสีย' || st === 'หนี้ศูนย์') && why.length < 5) return dlgErr(el, 'การตัดเป็นหนี้เสีย/หนี้ศูนย์ ต้องระบุเหตุผล');
      return api('setPendingResult', { id: r.id, status: st, amount: mv('pdAmt'), recvDate: mv('pdDate'), reason: why }, { write: true })
        .then(function () { toast('บันทึกผลเรียบร้อย', 'ok'); go('pending'); });
    } });
}
function bulkPend() {
  var sel = TBL.selected('tPend');
  if (!sel.length) return toast('ยังไม่ได้เลือกรายการ — ติ๊กช่องหน้าแถวที่ต้องการก่อน', 'warn');
  var amt = sel.reduce(function (a, r) { return a + r.outstanding; }, 0);
  UI.dialog({ title: 'บันทึกผลหลายรายการ', icon: 'check', sub: N(sel.length) + ' รายการ · ยอดค้างรวม ' + B(amt) + ' บาท',
    body: note('warn', 'ระบบจะบันทึกผลเดียวกันกับทุกรายการที่เลือก · ถ้าเลือกสถานะที่ต้องใส่ยอดรับ ระบบจะใช้ยอดค้างเต็มของแต่ละรายการ') + writeoffForm(),
    ok: 'บันทึกทั้งหมด',
    onOpen: function () { document.getElementById('pdAmt').value = ''; document.getElementById('pdAmt').placeholder = 'ใช้ยอดค้างเต็มของแต่ละรายการ'; document.getElementById('pdDate').value = today(); pdToggle(); document.getElementById('pdAmt').disabled = true; },
    onOk: function (el) {
      var st = mv('pdStat'), why = mv('pdNote');
      if ((st === 'หนี้เสีย' || st === 'หนี้ศูนย์') && why.length < 5) return dlgErr(el, 'การตัดเป็นหนี้เสีย/หนี้ศูนย์ ต้องระบุเหตุผล');
      return api('bulkPendingResult', { ids: sel.map(function (r) { return r.id; }), status: st, recvDate: mv('pdDate'), reason: why }, { write: true })
        .then(function (r) { toast('บันทึกสำเร็จ ' + N(r.done) + ' รายการ' + (r.errors.length ? ' · ผิดพลาด ' + r.errors.length : ''), r.errors.length ? 'warn' : 'ok', 8000); go('pending'); });
    } });
}

/* ═══════════════ หนี้เสีย / หนี้ศูนย์ ═══════════════ */
ROUTES.writeoff = function () {
  header('หนี้เสีย / หนี้ศูนย์', 'รายการที่ตัดออก ไม่นับเป็นรายได้แพทย์', refreshBtn());
  load('getWriteoff', {}, function (D, meta) {
    var html = '<div class="kpis">' + kpi('ยอดที่ตัดออกทั้งหมด', B(D.amount), N(D.count) + ' รายการ', D.count ? 'bad' : 'good', 'slash') + '</div>' + note('info', esc(D.note));
    if (!D.count) return V(html + card('', note('ok', 'ยังไม่มีรายการที่ถูกตัดออก')));
    html += card('แยกตามเหตุผล', hbars(D.byReason.map(function (x) { return { label: x.reason, v: x.amount, color: 'var(--bad)', on: "TBL.setFilter('tWo','acctReason'," + JSON.stringify(x.reason).replace(/"/g, '&quot;') + ")" }; })), { icon: 'pie', sub: 'แตะเพื่อกรอง' });
    html += card('รายการทั้งหมด', '<div id="tWo"></div>', { icon: 'list', flush: true, acts: freshBadge(meta) });
    V(html);
    TBL.make('tWo', { key: 'tWo', rows: D.rows, exportName: 'หนี้เสีย_หนี้ศูนย์',
      search: { placeholder: 'HN · แพทย์ · สิทธิ', keys: ['hn', 'dct', 'dctName', 'pttype', 'acctReason', 'acctBy'] },
      filters: [{ type: 'daterange', k: 'date', label: 'รับบริการตั้งแต่' }, { type: 'select', k: 'status', label: 'ประเภท' },
                { type: 'select', k: 'acctReason', label: 'เหตุผล' }, { type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (r) { return r.dctName || r.dct; } }],
      cols: [{ k: 'date', label: 'รับบริการ', type: 'date' }, { k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + '<span class="sub mono">' + esc(r.dct) + '</span>'; } },
             { k: 'hn', label: 'HN', type: 'hn' }, { k: 'pttype', label: 'สิทธิ', cls: 'small' },
             { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'outstanding', label: 'ตัดออก', type: 'money', sum: true },
             { k: 'status', label: 'ประเภท', type: 'status' }, { k: 'acctReason', label: 'เหตุผล', cls: 'small wrap' },
             { k: 'acctBy', label: 'ผู้บันทึก', render: function (r) { return esc(r.acctBy || '—') + '<span class="sub">' + esc(r.acctAt || '') + '</span>'; } }] });
  });
};

/* ═══════════════ ตกเบิก / เรียกคืน ═══════════════ */
ROUTES.backpay = function (ym) {
  header('ตกเบิก / เรียกคืน', 'ยอดที่เปลี่ยนหลังปิดรอบ', refreshBtn());
  load('getBackpay', { ym: ym || '' }, function (D, meta) {
    var html = '<div class="kpis">' + kpi('รอดำเนินการ', B(D.amount), N(D.openCount) + ' รายการ', D.openCount ? 'warn' : 'good', 'refresh') +
      kpi('ทั้งหมด', N(D.count) + '<small>รายการ</small>', 'ย้อนตรวจ ' + esc(D.recheckDays) + ' วัน', '', 'list') + '</div>' + note('info', esc(D.note));
    if (!D.count) return V(html + card('', note('ok', 'ยอดทุกรอบที่ปิดแล้วยังตรงกับระบบโรงพยาบาล ไม่มีรายการตกเบิก')));
    html += card('รายการ', '<div id="tBp"></div>', { icon: 'list', flush: true, acts: freshBadge(meta) }) +
      note('warn', '<b>ตกเบิกเพิ่ม</b> ให้นำส่วนต่างไปรวมในรอบเบิกเดือนถัดไป · <b>เรียกคืน</b> เกิดจากยอดในระบบโรงพยาบาลลดลงหลังปิดรอบ ต้องตรวจสาเหตุก่อนดำเนินการ');
    V(html);
    TBL.make('tBp', { key: 'tBp', rows: D.rows, exportName: 'ตกเบิก_เรียกคืน',
      search: { placeholder: 'รหัส · ชื่อแพทย์', keys: ['dct', 'dctName', 'kind'] },
      filters: [{ type: 'select', k: 'ymClosed', label: 'รอบที่ปิดไว้', labelOf: function (r) { return r.ymClosedTh; } }, { type: 'select', k: 'kind', label: 'ประเภท' }],
      chips: [{ id: 'open', label: 'รอดำเนินการ', tone: 'warn', fn: function (r) { return r.status === 'open'; } },
              { id: 'up', label: 'ตกเบิกเพิ่ม', fn: function (r) { return r.diff > 0; } }, { id: 'down', label: 'เรียกคืน', tone: 'bad', fn: function (r) { return r.diff < 0; } }],
      cols: [{ k: 'ymClosedTh', label: 'รอบที่ปิดไว้', cls: 'nowrap' },
             { k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + '<span class="sub mono">' + esc(r.dct) + '</span>'; } },
             { k: 'grpName', label: 'หน่วย', cls: 'small' },
             { k: 'closedBase', label: 'ตอนปิดรอบ', type: 'money' }, { k: 'currentBase', label: 'ปัจจุบัน', type: 'money' },
             { k: 'diff', label: 'ส่วนต่าง', type: 'money', sum: true, render: function (r) { return '<b class="' + (r.diff > 0 ? 'good' : 'badc') + '">' + (r.diff > 0 ? '+' : '') + B(r.diff) + '</b>'; } },
             { k: 'kind', label: 'ประเภท', render: function (r) { return tag(r.kind, r.diff > 0 ? 'ok' : 'bad'); } },
             { k: 'status', label: 'สถานะ', render: function (r) { return tag(r.status === 'open' ? 'รอดำเนินการ' : r.status, r.status === 'open' ? 'warn' : ''); } },
             { k: 'detectedAt', label: 'ตรวจพบเมื่อ', cls: 'small muted' }] });
  });
};
