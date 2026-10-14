/* SMC MD — pages.js
 * หน้าของแพทย์ · แดชบอร์ด · สรุปรายเดือน · ตรวจรายการรายวัน · ยอดค้างจ่าย · หนี้เสีย · ตกเบิก
 */

/* ═══════════════════════════════════════════════════════
   หน้าแพทย์ — ยอดค่าตอบแทนของฉัน
   ออกแบบให้ตรงกับไฟล์ Excel รายคนรายเดือนที่แพทย์เคยเห็น
   แต่เพิ่มยอดสรุปด้านบน เพราะเดิมต้องเลื่อนหาเอง
   ═══════════════════════════════════════════════════════ */
ROUTES.my = function (ym) {
  ym = ym || thisYm();
  loading('กำลังรวบรวมยอดค่าตอบแทนของท่าน');
  api('myMonth', { ym: ym })
    .then(function (D) { V(renderDoctorMonth(D, ym, true)); })
    .catch(showErr);
};

function renderDoctorMonth(D, ym, isMine) {
  var s = D.summary, h = D.head;
  var html = '';

  html += '<div class="toolbar no-print">' +
    '<label class="f"><span>รอบเดือน</span><select onchange="go(S.page,this.value)">' +
    ymOptions(ym, 24) + '</select></label>' +
    '<div style="flex:1"></div>' +
    (isMine ? '' : '<button class="btn-sm" onclick="window.print()">พิมพ์หน้านี้</button>') +
    '</div>';

  /* หัวเรื่อง */
  html += '<div class="card"><div class="card-head">' +
    '<div><h1 style="margin:0">' + esc(h.dctName || h.dct) + '</h1>' +
    '<div class="small muted">รหัสแพทย์ ' + esc(h.dct) +
    (h.dept ? ' · ' + esc(h.dept) : '') + ' · รอบ ' + ymTh(ym) + '</div></div>' +
    '<div class="spacer"></div>' +
    tag(h.status, h.closed ? 'ok' : 'warn') + '</div>';

  /* เตือนเรื่องสำคัญ */
  if (s.changedAfterClose) {
    html += note('warn', 'ยอดรอบนี้เปลี่ยนไปจากตอนปิดรอบ (ตอนปิดรอบ ' + B(s.closedBase) +
      ' บาท · ปัจจุบัน ' + B(s.base) + ' บาท) ส่วนต่างจะถูกนำเข้าเป็นรายการตกเบิกในรอบถัดไป');
  }
  if (h.contract && h.contract.flag) {
    html += note('warn', 'ข้อมูลสัญญา 40(6): ' + esc(h.contract.flag));
  }
  if (!h.contract || !h.contract.startDate) {
    html += note('bad', 'ยังไม่พบข้อมูลสัญญาจ้างตามมาตรา 40(6) ในระบบ ' +
      'กรุณาติดต่อเจ้าหน้าที่ประสานงานคลินิกพิเศษเฉพาะทางนอกเวลา');
  }

  /* ยอดสรุป */
  html += '<div class="grid c4" style="margin-top:12px">' +
    kpi('ยอดรับรอง (ฐานคำนวณ)', B(s.base), 'จาก ' + N(s.cases) + ' เคส · ' + N(s.items) + ' รายการ', 'accent') +
    kpi('ส่วนแพทย์ 80%', B(s.pay80), 'รหัสรายได้ ' + esc(h.incomePay), 'good', 'good') +
    kpi('ส่วนโรงพยาบาล 20%', B(s.hos20), 'รหัสรายได้ ' + esc(h.incomeHos)) +
    kpi('ยอดค้างเรียกเก็บ', B(s.outstanding),
        s.pendingCount ? N(s.pendingCount) + ' รายการรอเรียกเก็บ' : 'ไม่มีรายการค้าง',
        s.outstanding > 0 ? 'warn' : 'good', s.outstanding > 0 ? '' : 'good') +
    '</div>';

  html += '<div class="grid c3" style="margin-top:12px">' +
    kpi('ยอดเรียกเก็บทั้งหมด', B(s.total), 'ยอดก่อนหักส่วนที่ยังเก็บไม่ได้') +
    kpi('สิทธิการรักษาที่ใช้', N(s.rights) + ' สิทธิ', N(s.codes) + ' รหัสค่าธรรมเนียม') +
    kpi('ตกเบิกรอดำเนินการ', B(s.backpayAmount),
        s.backpayCount ? N(s.backpayCount) + ' รายการ' : 'ไม่มี',
        s.backpayAmount > 0 ? 'warn' : '') +
    '</div></div>';

  if (!s.items) {
    return html + '<div class="card">' + note('info', 'รอบ ' + ymTh(ym) + ' ยังไม่มีรายการ') + '</div>';
  }

  /* กลุ่มการเบิก — แสดงเฉพาะเมื่อมีมากกว่าหนึ่งกลุ่ม */
  if (D.groups && D.groups.length > 1) {
    html += '<div class="card"><h3>ยอดแยกตามหน่วยที่ให้บริการ</h3>' +
      note('info', 'ยอดด้านบนเป็นยอดรวมทุกหน่วยแล้ว ตารางนี้แสดงที่มาของยอด ' +
        'เพราะการเบิกผ่านฝ่ายบริหารงานบุคคลใช้รหัสรายได้แยกกัน') +
      '<div class="tw"><table class="tight"><thead><tr><th>หน่วย</th>' +
      '<th class="num">รายการ</th><th class="num">ยอดรับรอง</th>' +
      '<th class="num">ส่วนแพทย์ 80%</th></tr></thead><tbody>';
    for (var g = 0; g < D.groups.length; g++) {
      var G = D.groups[g];
      html += '<tr><td>' + esc(G.name) + '</td><td class="num">' + N(G.items) + '</td>' +
        '<td class="num">' + B(G.base) + '</td>' +
        '<td class="num">' + B(Math.round(G.base * 0.8 * 100) / 100) + '</td></tr>';
    }
    html += '</tbody></table></div></div>';
  }

  /* สรุปตามสิทธิ + ตามรหัส */
  html += '<div class="grid c2">';
  html += '<div class="card"><h3>สรุปตามสิทธิการรักษา</h3><div class="tw">' +
    '<table class="tight"><thead><tr><th>สิทธิ</th><th class="num">รายการ</th>' +
    '<th class="num">ยอดรับรอง</th><th class="num">ค้างเก็บ</th></tr></thead><tbody>';
  for (var i = 0; i < D.byRight.length; i++) {
    var R = D.byRight[i];
    html += '<tr' + (R.base === 0 ? ' class="dim"' : '') + '><td>' + esc(R.name) +
      (R.policy !== 'pay' ? ' <span class="tiny muted">(' + esc(R.policyTh) + ')</span>' : '') +
      '</td><td class="num">' + N(R.items) + '</td><td class="num">' + B(R.base) + '</td>' +
      '<td class="num">' + (R.outstanding ? B(R.outstanding) : '—') + '</td></tr>';
  }
  html += '</tbody></table></div></div>';

  html += '<div class="card"><h3>สรุปตามรหัสค่าธรรมเนียมแพทย์</h3><div class="tw">' +
    '<table class="tight"><thead><tr><th>รหัส</th><th>รายการ</th>' +
    '<th class="num">จำนวน</th><th class="num">ยอดรับรอง</th></tr></thead><tbody>';
  for (var j = 0; j < D.byCode.length; j++) {
    var C = D.byCode[j];
    html += '<tr><td class="mono">' + esc(C.code) + '</td><td>' + esc(C.label || '—') + '</td>' +
      '<td class="num">' + N(C.items) + '</td><td class="num">' + B(C.base) + '</td></tr>';
  }
  html += '</tbody></table></div></div></div>';

  /* ยอดรายวัน */
  html += '<div class="card"><h3>ยอดรายวัน</h3>' + sparkDays(D.byDate) + '</div>';

  /* รายการค้างจ่าย */
  if (D.pending && D.pending.length) {
    html += '<div class="card"><div class="card-head"><h3>รายการที่ยังไม่ได้รับค่าตอบแทน</h3>' +
      '<div class="spacer"></div>' + tag(N(D.pending.length) + ' รายการ', 'warn') + '</div>' +
      note('info', 'รายการเหล่านี้โรงพยาบาลยังเรียกเก็บเงินไม่ครบ เมื่อเก็บได้แล้ว ' +
        'ระบบจะนำเข้ารอบเบิกถัดไปให้อัตโนมัติ ไม่มีวันหมดอายุ') +
      '<div class="tw"><table class="tight"><thead><tr><th>วันที่</th><th>HN</th><th>สิทธิ</th>' +
      '<th>รหัส</th><th class="num">เรียกเก็บ</th><th class="num">เก็บได้</th>' +
      '<th class="num">ค้างเก็บ</th><th>สถานะ</th></tr></thead><tbody>';
    for (var p = 0; p < D.pending.length; p++) {
      var P = D.pending[p];
      html += '<tr><td class="nowrap">' + dTh(P.date) + '</td><td class="mono">' + esc(P.hn) + '</td>' +
        '<td>' + esc(P.pttype) + '</td><td class="mono">' + esc(P.code) + '</td>' +
        '<td class="num">' + B(P.total) + '</td><td class="num">' + B(P.collected) + '</td>' +
        '<td class="num">' + B(P.outstanding) + '</td><td>' + tag(P.status) + '</td></tr>';
    }
    html += '</tbody></table></div></div>';
  }

  /* รายการละเอียด */
  html += '<div class="card"><div class="card-head"><h3>รายการละเอียดทั้งหมด</h3>' +
    '<div class="spacer"></div><span class="small muted">' + N(D.rows.length) + ' รายการ</span></div>' +
    '<div class="tw"><table class="tight"><thead><tr><th>วันที่</th><th>HN</th><th>สิทธิการรักษา</th>' +
    '<th>รหัส</th><th>รายการ</th><th class="num">เรียกเก็บ</th><th class="num">เก็บได้</th>' +
    '<th class="num">นับจ่าย</th><th>สถานะ</th></tr></thead><tbody>';
  for (var k = 0; k < D.rows.length; k++) {
    var r = D.rows[k];
    html += '<tr' + (r.counted ? '' : ' class="dim"') + '>' +
      '<td class="nowrap">' + dTh(r.date) + '</td><td class="mono">' + esc(r.hn) + '</td>' +
      '<td>' + esc(r.pttype) + '</td><td class="mono">' + esc(r.code) + '</td>' +
      '<td>' + esc(r.codeLabel || '—') + '</td>' +
      '<td class="num">' + B(r.total) + '</td><td class="num">' + B(r.collected) + '</td>' +
      '<td class="num">' + (r.counted ? B(r.payable) : '—') + '</td>' +
      '<td>' + tag(r.status) + (r.reason ? '<div class="tiny muted">' + esc(r.reason) + '</div>' : '') +
      '</td></tr>';
  }
  html += '<tr class="sum"><td colspan="7">รวมยอดรับรอง</td>' +
    '<td class="num">' + B(s.base) + '</td><td></td></tr>';
  html += '</tbody></table></div></div>';

  html += '<div class="card small muted">ยอดในหน้านี้คำนวณจากยอดที่โรงพยาบาลเรียกเก็บได้จริง ' +
    '(เงินสด + ยอดที่เรียกเก็บจากต้นสังกัด/บริษัทประกัน) ตามหลักเกณฑ์ที่ใช้อยู่ · ' +
    'หากพบยอดคลาดเคลื่อน กรุณาแจ้งหน่วยงานบริหารเงินเดือน ค่าจ้างและค่าตอบแทน ฝ่ายบริหารงานบุคคล</div>';

  return html;
}

/** กราฟแท่งรายวันแบบไม่ใช้ไลบรารีภายนอก */
function sparkDays(byDate) {
  if (!byDate || !byDate.length) return '<div class="muted small">ไม่มีข้อมูล</div>';
  var mx = 0;
  for (var i = 0; i < byDate.length; i++) mx = Math.max(mx, Number(byDate[i].base || 0));
  if (!mx) mx = 1;
  var bars = '', xs = '';
  for (var j = 0; j < byDate.length; j++) {
    var d = byDate[j], hp = Math.max(2, Math.round(Number(d.base || 0) / mx * 100));
    bars += '<div class="b" style="height:' + hp + '%" title="' + dTh(d.date) + ' · ' +
            B(d.base) + ' บาท · ' + N(d.cases) + ' เคส"></div>';
    xs += '<span>' + String(Number(String(d.date).slice(8, 10))) + '</span>';
  }
  var tot = byDate.reduce(function (a, b) { return a + Number(b.base || 0); }, 0);
  return '<div class="spark">' + bars + '</div><div class="spark-x">' + xs + '</div>' +
    '<div class="small muted" style="margin-top:6px">ออกตรวจ ' + N(byDate.length) +
    ' วัน · รวม ' + B(tot) + ' บาท · สูงสุดวันละ ' + B(mx) + ' บาท</div>';
}

/* ═══════════════ แพทย์ — ยอดค้างจ่ายของฉัน ═══════════════ */
ROUTES.myPending = function () {
  loading('กำลังตรวจรายการค้างจ่าย');
  api('myPending').then(function (D) {
    var html = '<div class="card"><div class="card-head"><h1 style="margin:0">ยอดค้างจ่ายของฉัน</h1>' +
      '<div class="spacer"></div>' +
      tag(N(D.count) + ' รายการ · ' + B(D.outstanding) + ' บาท', D.count ? 'warn' : 'ok') + '</div>' +
      note('info', esc(D.note)) + '</div>';

    if (!D.count) {
      return V(html + '<div class="card">' + note('ok',
        'ไม่มีรายการค้างจ่าย ค่าตอบแทนของท่านได้รับครบตามยอดที่โรงพยาบาลเรียกเก็บได้แล้ว') + '</div>');
    }

    html += '<div class="card"><div class="tw"><table><thead><tr><th>วันที่</th><th>HN</th>' +
      '<th>สิทธิการรักษา</th><th>รหัส</th><th class="num">เรียกเก็บ</th>' +
      '<th class="num">เก็บได้</th><th class="num">ค้างเก็บ</th><th>สถานะ</th>' +
      '<th>หมายเหตุ</th></tr></thead><tbody>';
    for (var i = 0; i < D.rows.length; i++) {
      var r = D.rows[i];
      html += '<tr><td class="nowrap">' + dTh(r.date) + '</td><td class="mono">' + esc(r.hn) + '</td>' +
        '<td>' + esc(r.pttype) + '</td><td class="mono">' + esc(r.code) + '</td>' +
        '<td class="num">' + B(r.total) + '</td><td class="num">' + B(r.collected) + '</td>' +
        '<td class="num">' + B(r.outstanding) + '</td><td>' + tag(r.status) + '</td>' +
        '<td class="small">' + esc(r.note || r.reason || '') + '</td></tr>';
    }
    html += '<tr class="sum"><td colspan="6">รวม</td><td class="num">' + B(D.outstanding) +
      '</td><td colspan="2"></td></tr></tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};

/* ═══════════════ แพทย์ — ประวัติและสัญญา ═══════════════ */
ROUTES.myProfile = function () {
  loading('กำลังโหลดประวัติ');
  api('myProfile').then(function (D) {
    var d = D.doctor, c = D.contract;
    var rows = [
      ['รหัสแพทย์', d.code],
      ['ชื่อ - สกุล', d.fullName || ((d.title || '') + d.name)],
      ['ฝ่าย / สาขา', d.dept || '—'],
      ['สาขาความเชี่ยวชาญ', d.specialty || '—'],
      ['อีเมล', d.email || '—'],
      ['โทรศัพท์', d.phone || '—'],
      ['พบรายการเบิกครั้งแรก', d.firstSeen ? dTh(d.firstSeen) : '—'],
      ['พบรายการเบิกครั้งล่าสุด', d.lastSeen ? dTh(d.lastSeen) : '—']
    ];
    var crows = [
      ['เลขที่สัญญา', c.contractNo || '—'],
      ['วันเริ่มสัญญา', c.startDate ? dTh(c.startDate) : '—'],
      ['วันลงนาม', c.signDate ? dTh(c.signDate) : '—'],
      ['วันสิ้นสุดสัญญา', c.endDate ? dTh(c.endDate) : 'ไม่ระบุ (ต่อเนื่อง)'],
      ['สถานะ', c.status || '—'],
      ['ไฟล์สัญญา', c.hasFile ? esc(c.fileName || 'มีไฟล์แนบ') : 'ยังไม่มีไฟล์ในระบบ']
    ];
    function tbl(list) {
      var h = '<table class="tight"><tbody>';
      for (var i = 0; i < list.length; i++) {
        h += '<tr><td class="muted" style="width:42%">' + esc(list[i][0]) + '</td>' +
             '<td class="bold">' + (list[i][1] === undefined ? '' : list[i][1]) + '</td></tr>';
      }
      return h + '</tbody></table>';
    }

    var html = '<div class="card"><h1 style="margin:0 0 2px">ประวัติและสัญญาของฉัน</h1>' +
      '<div class="small muted">ข้อมูลตามทะเบียนของหน่วยงานบริหารเงินเดือน ค่าจ้างและค่าตอบแทน</div></div>';

    if (D.oldCodes && D.oldCodes.length) {
      html += note('info', 'ระบบทราบว่ารหัสเดิมของท่านคือ ' +
        D.oldCodes.map(esc).join(', ') + ' และรวมยอดจากรหัสเดิมให้แล้ว');
    }

    html += '<div class="grid c2">' +
      '<div class="card"><h3>ประวัติแพทย์</h3>' + tbl(rows) + '</div>' +
      '<div class="card"><h3>สัญญาจ้างตามมาตรา 40(6)</h3>' + tbl(crows) +
      (c.hasFile && D.canDownloadContract
        ? '<div class="btn-row" style="margin-top:12px"><button class="btn-primary" ' +
          'onclick="dlContract(this)">ดาวน์โหลดไฟล์สัญญา</button></div>'
        : (c.hasFile ? '<div class="hint">การดาวน์โหลดไฟล์สัญญาถูกปิดไว้ กรุณาติดต่อฝ่ายบริหารงานบุคคล</div>'
                     : '')) +
      '</div></div>';

    if (!c.startDate) {
      html += '<div class="card">' + note('warn',
        'ยังไม่พบข้อมูลสัญญาในระบบ หากท่านได้ลงนามสัญญาแล้ว ' +
        'กรุณาติดต่อเจ้าหน้าที่ประสานงานคลินิกพิเศษเฉพาะทางนอกเวลาเพื่อบันทึกข้อมูล ' +
        'เพราะการเบิกค่าตอบแทนต้องมีสัญญาประกอบ') + '</div>';
    }
    V(html);
  }).catch(showErr);
};

function dlContract(btn) {
  btn.disabled = true; btn.textContent = 'กำลังเตรียมไฟล์...';
  api('myContractFile').then(function (f) {
    var bin = atob(f.base64), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var url = URL.createObjectURL(new Blob([arr], { type: f.mime || 'application/pdf' }));
    var a = document.createElement('a');
    a.href = url; a.download = f.fileName; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    btn.disabled = false; btn.textContent = 'ดาวน์โหลดไฟล์สัญญา';
  }).catch(function (e) {
    btn.disabled = false; btn.textContent = 'ดาวน์โหลดไฟล์สัญญา';
    toast(e.message, 'bad');
  });
}

/* ═══════════════════════════════════════════════════════
   แดชบอร์ด
   ═══════════════════════════════════════════════════════ */
ROUTES.dash = function () {
  loading('กำลังรวบรวมภาพรวม');
  api('getDashboard', { from: ymAdd(thisYm(), -11), to: thisYm() }).then(function (D) {
    var last = D.trend.length ? D.trend[D.trend.length - 1] : null;
    var a = D.alert;
    var html = '<div class="card-head"><h1 style="margin:0">ภาพรวมค่าตอบแทนแพทย์</h1>' +
      '<div class="spacer"></div><span class="small muted">รอบล่าสุด ' +
      (D.latestYm ? ymTh(D.latestYm) : 'ยังไม่มีข้อมูล') + '</span></div>';

    /* เรื่องที่ต้องจัดการก่อน */
    var todo = [];
    if (a.waitGroup)     todo.push('<b>' + N(a.waitGroup) + '</b> รายการจับกลุ่มการเบิกไม่ได้ ' +
      '<a href="#day">(ไปจัดกลุ่ม)</a> — ปิดรอบไม่ได้จนจัดครบ');
    if (a.noContract)    todo.push('<b>' + N(a.noContract) + '</b> แพทย์มียอดเบิกแต่ยังไม่พบสัญญา 40(6) ' +
      '<a href="#contracts">(ตรวจทะเบียน)</a>');
    if (a.contractFlags) todo.push('<b>' + N(a.contractFlags) + '</b> รายการสัญญาขึ้นธงรอตรวจ ' +
      '<a href="#contracts">(ดูรายการ)</a>');
    if (a.backpay)       todo.push('<b>' + N(a.backpay) + '</b> รายการตกเบิก/เรียกคืนรอดำเนินการ ' +
      '<a href="#backpay">(ดูรายการ)</a>');
    if (a.openMonths && a.openMonths.length) todo.push('รอบที่ยังไม่ปิด: ' +
      esc(a.openMonths.join(' · ')) + ' <a href="#close">(ไปตัดรอบ)</a>');
    if (todo.length) {
      html += note('warn', '<b>เรื่องที่ต้องจัดการ</b><ul style="margin:6px 0 0;padding-left:18px">' +
        todo.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>');
    } else {
      html += note('ok', 'ไม่มีรายการค้างดำเนินการ ระบบพร้อมสำหรับรอบเบิกถัดไป');
    }

    /* ตัวเลขรอบล่าสุด */
    if (last) {
      html += '<div class="grid c4">' +
        kpi('ยอดรับรองรอบ ' + ymShort(last.ym), B(last.base),
            N(last.doctors) + ' แพทย์ · ' + N(last.cases) + ' เคส', 'accent') +
        kpi('ส่วนแพทย์ 80%', B(last.pay80), 'ยอดที่ต้องเบิกผ่าน HR', 'good') +
        kpi('ส่วนโรงพยาบาล 20%', B(last.hos20), 'รายได้โรงพยาบาล') +
        kpi('สถานะรอบ', esc(last.statusTh), last.open ? 'ยังแก้ไขได้' : 'ล็อกยอดแล้ว',
            last.open ? 'warn' : 'good') +
        '</div>';
    }

    html += '<div class="grid c3" style="margin-top:14px">' +
      kpi('ยอดค้างจ่ายสะสม', B(D.pending.amount), N(D.pending.count) + ' รายการรอเรียกเก็บ',
          D.pending.count ? 'warn' : 'good') +
      kpi('หนี้เสีย / หนี้ศูนย์', B(D.writeoff.amount),
          N(D.writeoff.count) + ' รายการ (ไม่นับเป็นรายได้)', 'bad') +
      kpi('รวม 12 เดือน', K(D.trend.reduce(function (x, y) { return x + Number(y.base || 0); }, 0)),
          'ยอดรับรองรวมทั้งปี') +
      '</div>';

    /* แนวโน้มรายเดือน */
    if (D.trend.length) {
      var mx = 0;
      D.trend.forEach(function (t) { mx = Math.max(mx, Number(t.base || 0)); });
      if (!mx) mx = 1;
      var bars = '', xs = '';
      D.trend.forEach(function (t) {
        bars += '<div class="b" style="height:' + Math.max(2, Math.round(t.base / mx * 100)) + '%" ' +
          'title="' + ymTh(t.ym) + ' · ' + B(t.base) + ' บาท · ' + N(t.doctors) + ' แพทย์"></div>';
        xs += '<span>' + ymShort(t.ym) + '</span>';
      });
      html += '<div class="card"><h3>แนวโน้มยอดรับรองรายเดือน</h3>' +
        '<div class="spark" style="height:110px">' + bars + '</div>' +
        '<div class="spark-x">' + xs + '</div>' +
        '<div class="tw" style="margin-top:12px"><table class="tight"><thead><tr><th>รอบ</th>' +
        '<th class="num">แพทย์</th><th class="num">เคส</th><th class="num">ยอดรับรอง</th>' +
        '<th class="num">ส่วนแพทย์ 80%</th><th class="num">ค้างเก็บ</th><th>สถานะ</th>' +
        '<th></th></tr></thead><tbody>';
      for (var i = D.trend.length - 1; i >= 0; i--) {
        var t = D.trend[i];
        html += '<tr><td class="nowrap">' + ymTh(t.ym) + '</td>' +
          '<td class="num">' + N(t.doctors) + '</td><td class="num">' + N(t.cases) + '</td>' +
          '<td class="num">' + B(t.base) + '</td><td class="num">' + B(t.pay80) + '</td>' +
          '<td class="num">' + (t.outstanding ? B(t.outstanding) : '—') + '</td>' +
          '<td>' + tag(t.statusTh, t.open ? 'warn' : 'ok') + '</td>' +
          '<td><a href="#month:' + t.ym + '" class="small">ดูรายละเอียด</a></td></tr>';
      }
      html += '</tbody></table></div></div>';
    }

    /* แพทย์ยอดสูงสุด */
    if (D.topDoctors.length) {
      html += '<div class="card"><h3>แพทย์ยอดสูงสุด รอบ ' + ymTh(D.latestYm) + '</h3><div class="tw">' +
        '<table class="tight"><thead><tr><th>ลำดับ</th><th>รหัส</th><th>ชื่อ - สกุล</th>' +
        '<th>หน่วย</th><th class="num">เคส</th><th class="num">ยอดรับรอง</th>' +
        '<th class="num">ส่วนแพทย์ 80%</th><th class="num">ค้างเก็บ</th></tr></thead><tbody>';
      D.topDoctors.forEach(function (d, ix) {
        html += '<tr><td class="num">' + (ix + 1) + '</td><td class="mono">' + esc(d.dct) + '</td>' +
          '<td><a href="#docs:' + esc(d.dct) + '">' + esc(d.dctName || '—') + '</a></td>' +
          '<td class="small">' + esc(d.grpName) + '</td>' +
          '<td class="num">' + N(d.cases) + '</td><td class="num">' + B(d.base) + '</td>' +
          '<td class="num">' + B(d.pay80) + '</td>' +
          '<td class="num">' + (d.outstanding ? B(d.outstanding) : '—') + '</td></tr>';
      });
      html += '</tbody></table></div></div>';
    }

    /* รายวัน 30 วันล่าสุด */
    if (D.recentDays.length) {
      html += '<div class="card"><h3>30 วันล่าสุด</h3>' +
        sparkDays(D.recentDays.map(function (d) {
          return { date: d.date, base: d.base, cases: d.cases };
        })) + '</div>';
    }

    V(html);
  }).catch(showErr);
};

/* ═══════════════════════════════════════════════════════
   สรุปรายเดือน
   ═══════════════════════════════════════════════════════ */
ROUTES.month = function (ym) {
  ym = ym || thisYm();
  loading('กำลังรวมยอดรอบ ' + ymTh(ym));
  api('getMonth', { ym: ym, grp: 'ALL' }).then(function (D) {
    var s = D.summary;
    var html = '<div class="toolbar no-print">' +
      '<label class="f"><span>รอบเดือน</span><select onchange="go(\'month\',this.value)">' +
      ymOptions(ym, 24) + '</select></label>' +
      '<div style="flex:1"></div>' +
      (isHr() ? '<button onclick="rebuildMonth(\'' + ym + '\',this)" ' +
                'title="ใช้เมื่อเพิ่งแก้เงื่อนไขสิทธิ รหัส DF กฎจัดกลุ่ม หรือค่าตั้งค่าที่กระทบเงิน">' +
                'คำนวณรอบนี้ใหม่</button>' +
                '<button class="btn-primary" onclick="go(\'close\',\'' + ym + '\')">' +
                'ตัดรอบและออกเอกสาร</button>' : '') +
      '<button onclick="window.print()">พิมพ์</button></div>';

    html += '<div class="card-head"><h1 style="margin:0">สรุปรายเดือน ' + ymTh(ym) + '</h1>' +
      '<div class="spacer"></div>' +
      D.groups.map(function (g) {
        return tag(g.grpName + ': ' + g.statusTh, g.status === 'closed' ? 'ok' : 'warn');
      }).join(' ') + '</div>';

    if (D.waitGroup) {
      html += note('warn', 'มี <b>' + N(D.waitGroup) + '</b> รายการที่ระบบจับกลุ่มการเบิกไม่ได้ ' +
        'ยอดเหล่านี้ยังไม่รวมอยู่ในตารางด้านล่าง และต้องจัดกลุ่มให้ครบก่อนปิดรอบ ' +
        '<a href="#day">(ไปจัดกลุ่ม)</a>');
    }
    if (s.contractIssues) {
      html += note('warn', 'มี <b>' + N(s.contractIssues) + '</b> แพทย์ที่ข้อมูลสัญญา 40(6) ยังไม่เรียบร้อย ' +
        'ดูเครื่องหมายในคอลัมน์สัญญา <a href="#contracts">(ตรวจทะเบียน)</a>');
    }
    if (D.merged) {
      html += note('info', 'ตารางนี้รวมยอดทุกหน่วย (โรงพยาบาลและศูนย์สาขา) เป็นยอดเดียวต่อแพทย์ ' +
        'ตามที่ผู้บริหารต้องการ · ไฟล์นำเข้า HRMi ยังแยกรหัสรายได้ R101 / R106 ตามหน่วย');
    }

    html += '<div class="grid c4">' +
      kpi('แพทย์ที่มียอดเบิก', N(s.doctors) + ' ราย', N(s.cases) + ' เคส · ' + N(s.items) + ' รายการ', 'accent') +
      kpi('ยอดรับรองรวม', B(s.base), 'ฐานคำนวณ 80/20') +
      kpi('ส่วนแพทย์ 80%', B(s.pay80), 'ยอดที่ต้องเบิก', 'good') +
      kpi('ส่วนโรงพยาบาล 20%', B(s.hos20), 'รายได้โรงพยาบาล') +
      '</div>';
    if (s.outstanding || s.writeoff) {
      html += '<div class="grid c2" style="margin-top:14px">' +
        kpi('ยอดค้างเรียกเก็บในรอบนี้', B(s.outstanding), 'ยังไม่จ่าย รอเรียกเก็บครบ', 'warn') +
        kpi('ตัดเป็นหนี้เสีย/หนี้ศูนย์', B(s.writeoff), 'ไม่นับเป็นรายได้', 'bad') +
        '</div>';
    }

    html += '<div class="card" style="margin-top:14px"><div class="card-head">' +
      '<h3>รายละเอียดรายแพทย์</h3><div class="spacer"></div>' +
      '<input id="fMonth" placeholder="ค้นหารหัสหรือชื่อ" style="width:200px" ' +
      'oninput="filterTable(\'tMonth\',this.value)"></div>' +
      '<div class="tw"><table id="tMonth"><thead><tr><th>ลำดับ</th><th>รหัส</th>' +
      '<th>ชื่อ - สกุล</th><th>ฝ่าย/สาขา</th><th>หน่วย</th><th class="num">เคส</th>' +
      '<th class="num">รายการ</th><th class="num">ยอดรับรอง</th><th class="num">80%</th>' +
      '<th class="num">20%</th><th class="num">ค้างเก็บ</th><th>สัญญา</th><th></th></tr></thead><tbody>';
    D.rows.forEach(function (r, ix) {
      html += '<tr' + (r.contractOk ? '' : ' class="flagged"') + '>' +
        '<td class="num">' + (ix + 1) + '</td><td class="mono">' + esc(r.dct) + '</td>' +
        '<td>' + esc(r.dctName || '—') + '</td><td class="small">' + esc(r.dept || '—') + '</td>' +
        '<td class="small">' + esc(r.grpNames) + '</td>' +
        '<td class="num">' + N(r.cases) + '</td><td class="num">' + N(r.items) + '</td>' +
        '<td class="num bold">' + B(r.base) + '</td><td class="num">' + B(r.pay80) + '</td>' +
        '<td class="num">' + B(r.hos20) + '</td>' +
        '<td class="num">' + (r.outstanding ? B(r.outstanding) : '—') + '</td>' +
        '<td>' + (r.contractOk ? tag('มีสัญญา', 'ok')
                  : '<span class="tag warn" title="' + esc(r.contractFlag) + '">ตรวจสอบ</span>') + '</td>' +
        '<td class="nowrap"><a href="#docs:' + esc(r.dct) + '" class="small">ใบแจ้งยอด</a></td></tr>';
    });
    html += '<tr class="sum"><td colspan="5">รวมทั้งสิ้น ' + N(s.doctors) + ' ราย</td>' +
      '<td class="num">' + N(s.cases) + '</td><td class="num">' + N(s.items) + '</td>' +
      '<td class="num">' + B(s.base) + '</td><td class="num">' + B(s.pay80) + '</td>' +
      '<td class="num">' + B(s.hos20) + '</td><td class="num">' + B(s.outstanding) + '</td>' +
      '<td colspan="2"></td></tr></tbody></table></div></div>';

    V(html);
  }).catch(showErr);
};

/** กรองตารางด้วยคำค้น (ทำงานฝั่งหน้าเว็บ ไม่เรียกหลังบ้านซ้ำ) */
function filterTable(id, q) {
  q = String(q || '').trim().toLowerCase();
  var rows = document.querySelectorAll('#' + id + ' tbody tr');
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].classList.contains('sum')) continue;
    rows[i].style.display = (!q || rows[i].textContent.toLowerCase().indexOf(q) >= 0) ? '' : 'none';
  }
}

/* ═══════════════════════════════════════════════════════
   ตรวจรายการรายวัน — ที่ที่แอดมินจัดกลุ่มและสั่งระงับจ่าย
   ═══════════════════════════════════════════════════════ */
ROUTES.day = function (date) {
  date = date || today();
  loading('กำลังโหลดรายการวันที่ ' + dTh(date));
  api('getDay', { date: date, grp: 'ALL' }).then(function (D) {
    var s = D.summary;
    var html = '<div class="toolbar no-print">' +
      '<label class="f"><span>วันที่</span><input type="date" id="dDate" value="' + date +
      '" onchange="go(\'day\',this.value)"></label>' +
      '<button onclick="go(\'day\',shiftDay(\'' + date + '\',-1))">◀ วันก่อน</button>' +
      '<button onclick="go(\'day\',shiftDay(\'' + date + '\',1))">วันถัดไป ▶</button>' +
      '<div style="flex:1"></div>' +
      (isHr() ? '<button class="btn-primary" onclick="doSync(\'' + date + '\')">' +
                'ดึงข้อมูลวันนี้ใหม่</button>' : '') +
      '</div>';

    html += '<div class="card-head"><h1 style="margin:0">รายการวันที่ ' + dTh(date) + '</h1>' +
      '<div class="spacer"></div>' +
      '<span class="small muted">' + (s.apiAt ? 'ดึงข้อมูลล่าสุด ' + esc(s.apiAt) : 'ยังไม่เคยดึงข้อมูลวันนี้') +
      '</span></div>';

    html += '<div class="grid c4">' +
      kpi('รายการ', N(s.items), N(s.flagged) + ' รายการมีข้อสังเกต') +
      kpi('ยอดเรียกเก็บ', B(s.total), 'ก่อนหักยอดที่เก็บไม่ได้') +
      kpi('ยอดรับรอง', B(s.base), 'นำไปคิด 80/20', 'accent') +
      kpi('รอจัดกลุ่ม', N(s.waitGroup), s.waitGroup ? 'ต้องจัดก่อนปิดรอบ' : 'เรียบร้อย',
          s.waitGroup ? 'bad' : 'good') +
      '</div>';

    if (s.waitGroup) {
      html += note('bad', 'มี <b>' + N(s.waitGroup) + '</b> รายการที่ระบบยังไม่ทราบว่าเป็นการเบิกของหน่วยใด ' +
        'ยอดเหล่านี้ไม่ถูกนับเข้ายอดเบิกของกลุ่มใดเลย เพื่อกันเงินเข้าผิดรหัสรายได้ · ' +
        'กดปุ่ม "จัดกลุ่ม" ท้ายแถว หรือตั้งกฎถาวรที่ <a href="#groups">กฎจัดกลุ่มการเบิก</a>');
    }

    html += '<div class="card"><div class="card-head"><h3>รายการทั้งหมด</h3>' +
      '<div class="spacer"></div>' +
      '<select id="fStat" onchange="filterTable(\'tDay\',this.value===\'ALL\'?\'\':this.value)" ' +
      'style="width:auto"><option value="ALL">ทุกสถานะ</option>' +
      '<option value="รอจัดกลุ่ม">รอจัดกลุ่ม</option><option value="ค้างจ่าย">ค้างจ่าย</option>' +
      '<option value="จ่ายบางส่วน">จ่ายบางส่วน</option><option value="ไม่เบิก">ไม่เบิก</option>' +
      '<option value="ระงับโดยผู้จัดการ">ระงับโดยผู้จัดการ</option></select>' +
      '<input placeholder="ค้นหา" style="width:170px" oninput="filterTable(\'tDay\',this.value)"></div>' +
      '<div class="tw"><table id="tDay" class="tight"><thead><tr><th>รหัสแพทย์</th><th>ชื่อ</th>' +
      '<th>HN</th><th>สิทธิการรักษา</th><th>รหัส</th><th>หน่วยที่คีย์</th>' +
      '<th class="num">เรียกเก็บ</th><th class="num">เก็บได้</th><th class="num">นับจ่าย</th>' +
      '<th>สถานะ</th>' + (isHr() ? '<th></th>' : '') + '</tr></thead><tbody>';
    D.rows.forEach(function (r) {
      html += '<tr' + (r.flags.length ? ' class="flagged"' : '') + '>' +
        '<td class="mono">' + esc(r.dct || '—') + '</td>' +
        '<td class="small">' + esc(r.dctName || '—') + '</td>' +
        '<td class="mono">' + esc(r.hn) + '</td>' +
        '<td class="small">' + esc(r.pttype || '—') + '</td>' +
        '<td class="mono">' + esc(r.code) + '</td>' +
        '<td class="small">' + esc(r.clinic || r.dept || '—') + '</td>' +
        '<td class="num">' + B(r.total) + '</td><td class="num">' + B(r.collected) + '</td>' +
        '<td class="num">' + (r.payable ? B(r.payable) : '—') + '</td>' +
        '<td>' + tag(r.status) +
        (r.flags.length ? '<div class="tiny muted">' + esc(r.flags.join(' · ')) + '</div>' : '') +
        '</td>' +
        (isHr() ? '<td class="nowrap"><button class="btn-sm" onclick="editCase(' +
                  JSON.stringify(JSON.stringify(r)).replace(/"/g, '&quot;') + ')">แก้</button></td>' : '') +
        '</tr>';
    });
    html += '</tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};

function shiftDay(d, n) {
  var p = String(d).split('-');
  var t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}

function doSync(date) {
  if (!confirm('ดึงข้อมูลวันที่ ' + dTh(date) + ' จากระบบโรงพยาบาลใหม่?\n' +
               'ระบบจะเขียนทับข้อมูลวันนี้ทั้งวัน แต่การตัดสินใจที่เจ้าหน้าที่บันทึกไว้จะยังอยู่')) return;
  toast('กำลังดึงข้อมูล อาจใช้เวลาสักครู่', 'info');
  api('syncRange', { from: date, to: date }, { write: true })
    .then(function (r) {
      toast('ดึงข้อมูลเรียบร้อย ' + N(r.rows) + ' รายการ', 'ok');
      go('day', date);
    }).catch(function (e) { toast(e.message, 'bad', 9000); });
}

/** แก้สถานะรายเคส — ใช้เมื่อต้องระงับจ่ายหรือจัดกลุ่มเฉพาะรายการ */
function editCase(json) {
  var r = JSON.parse(json);
  modal('แก้สถานะรายการ',
    '<div class="small muted" style="margin-bottom:10px">' +
    'แพทย์ ' + esc(r.dctName || r.dct) + ' · ' + dTh(r.date) + ' · HN ' + esc(r.hn) +
    ' · รหัส ' + esc(r.code) + ' · ยอดเรียกเก็บ ' + B(r.total) + ' บาท</div>' +
    (r.flags && r.flags.length ? note('warn', 'ข้อสังเกต: ' + esc(r.flags.join(' · '))) : '') +
    (isAdmin() ? '<div class="btn-row" style="margin-bottom:10px">' +
      '<button class="btn-sm" onclick="askHn(\'' + esc(r.id.split('|')[2] || '') +
      '\')">ขอดูเลข HN จริง</button></div>' : '') +
    '<label class="f"><span>สถานะใหม่</span><select id="ecStat">' +
    PAY_STATUS_LIST.map(function (x) {
      return '<option' + (x === r.status ? ' selected' : '') + '>' + x + '</option>';
    }).join('') + '</select></label>' +
    '<label class="f"><span>เหตุผล (บันทึกไว้ตรวจย้อนได้ อย่างน้อย 5 ตัวอักษร)</span>' +
    '<textarea id="ecWhy" placeholder="เช่น ประกันยกเลิกกรมธรรม์ · เจ้าหน้าที่คีย์รหัสแพทย์ผิด">' +
    esc(r.reason || '') + '</textarea></label>' +
    '<div id="ecErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="saveCase(\'' + esc(r.id) + '\')">บันทึก</button>');
}
function saveCase(id) {
  var st = mv('ecStat'), why = mv('ecWhy');
  if (why.length < 5) {
    document.getElementById('ecErr').innerHTML = note('bad', 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
    return;
  }
  api('setCaseStatus', { id: id, status: st, reason: why }, { write: true })
    .then(function () { closeModal(); toast('บันทึกแล้ว ระบบคำนวณยอดเดือนนี้ใหม่ให้เรียบร้อย', 'ok');
                        go(S.page, document.getElementById('dDate') ? mv('dDate') : null); })
    .catch(function (e) { document.getElementById('ecErr').innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════════════════════════════════════════════
   ติดตามยอดค้างจ่าย — หน้าหลักของฝ่ายบัญชี
   ═══════════════════════════════════════════════════════ */
ROUTES.pending = function () {
  loading('กำลังรวบรวมยอดค้างจ่าย');
  api('getPending', { filter: {} }).then(function (D) {
    if (D.writeoffReasons) S.cache.writeoffReasons = D.writeoffReasons;
    var html = '<div class="card-head"><h1 style="margin:0">ติดตามยอดค้างจ่าย</h1>' +
      '<div class="spacer"></div>' +
      tag(N(D.count) + ' รายการ · ' + B(D.amount) + ' บาท', D.count ? 'warn' : 'ok') + '</div>';

    html += note('info', 'รายการค้างจ่ายไม่หมดอายุเอง จะรอการจ่ายไปตลอดจนกว่าฝ่ายบัญชีจะเปลี่ยนสถานะ · ' +
      'เมื่อบันทึกว่า "รับเงินแล้ว" ระบบจะตั้งเป็นรายการตกเบิกของรอบถัดไปให้อัตโนมัติ');

    html += '<div class="grid c2">' +
      '<div class="card"><h3>แยกตามสิทธิการรักษา</h3><div class="tw"><table class="tight"><tbody>' +
      D.byRight.slice(0, 12).map(function (x) {
        return '<tr><td>' + esc(x.name) + '</td><td class="num bold">' + B(x.amount) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="card"><h3>แยกตามแพทย์ (10 อันดับแรก)</h3><div class="tw"><table class="tight"><tbody>' +
      D.byDoctor.slice(0, 10).map(function (x) {
        return '<tr><td class="mono">' + esc(x.dct) + '</td><td>' + esc(x.dctName || '—') + '</td>' +
               '<td class="num bold">' + B(x.amount) + '</td></tr>';
      }).join('') + '</tbody></table></div></div></div>';

    if (!D.count) {
      return V(html + '<div class="card">' + note('ok', 'ไม่มีรายการค้างจ่าย') + '</div>');
    }

    html += '<div class="card"><div class="card-head"><h3>รายการค้างจ่าย</h3>' +
      '<div class="spacer"></div>' +
      (D.canEdit ? '<button class="btn-sm" onclick="bulkPend()">บันทึกผลหลายรายการ</button>' : '') +
      '<input placeholder="ค้นหา" style="width:180px" oninput="filterTable(\'tPend\',this.value)"></div>' +
      '<div class="tw"><table id="tPend" class="tight"><thead><tr>' +
      (D.canEdit ? '<th><input type="checkbox" onclick="checkAll(this)"></th>' : '') +
      '<th>รอบที่ควรได้</th><th>วันที่</th><th>รหัส</th><th>ชื่อแพทย์</th><th>HN</th>' +
      '<th>สิทธิการรักษา</th><th class="num">เรียกเก็บ</th><th class="num">เก็บได้</th>' +
      '<th class="num">ค้างเก็บ</th><th class="num">ค้างกี่วัน</th><th>สถานะ</th>' +
      (D.canEdit ? '<th></th>' : '') + '</tr></thead><tbody>';
    D.rows.forEach(function (r) {
      var old = Number(r.ageDays || 0) > 180;
      html += '<tr' + (old ? ' class="flagged"' : '') + '>' +
        (D.canEdit ? '<td><input type="checkbox" class="pk" value="' + esc(r.id) + '"></td>' : '') +
        '<td class="nowrap small">' + esc(r.ymDueTh) + '</td>' +
        '<td class="nowrap">' + dTh(r.date) + '</td>' +
        '<td class="mono">' + esc(r.dct) + '</td><td class="small">' + esc(r.dctName || '—') + '</td>' +
        '<td class="mono">' + esc(r.hn) + '</td><td class="small">' + esc(r.pttype) + '</td>' +
        '<td class="num">' + B(r.total) + '</td><td class="num">' + B(r.collected) + '</td>' +
        '<td class="num bold">' + B(r.outstanding) + '</td>' +
        '<td class="num">' + N(r.ageDays) + '</td><td>' + tag(r.status) + '</td>' +
        (D.canEdit ? '<td><button class="btn-sm" onclick="editPend(' +
          JSON.stringify(JSON.stringify(r)).replace(/"/g, '&quot;') + ')">บันทึกผล</button></td>' : '') +
        '</tr>';
    });
    html += '<tr class="sum"><td colspan="' + (D.canEdit ? 9 : 8) + '">รวม</td>' +
      '<td class="num">' + B(D.amount) + '</td><td colspan="' + (D.canEdit ? 3 : 2) + '"></td></tr>' +
      '</tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};

function checkAll(cb) {
  var all = document.querySelectorAll('.pk');
  for (var i = 0; i < all.length; i++) {
    if (all[i].closest('tr').style.display !== 'none') all[i].checked = cb.checked;
  }
}

var WRITEOFF_FORM =
  '<label class="f"><span>ผลการเรียกเก็บ</span><select id="pdStat" onchange="pdToggle()">' +
  '<option value="จ่ายแล้ว">รับเงินครบแล้ว — นำเข้ารอบเบิกถัดไป</option>' +
  '<option value="จ่ายบางส่วน">รับเงินบางส่วน — นำเข้ารอบถัดไปเท่าที่รับ</option>' +
  '<option value="ค้างจ่าย">ยังเรียกเก็บไม่ได้ — ติดตามต่อ</option>' +
  '<option value="หนี้เสีย">หนี้เสีย — เรียกเก็บไม่ได้แน่นอน ไม่นับเป็นรายได้</option>' +
  '<option value="หนี้ศูนย์">หนี้ศูนย์ — ยกเลิกยอด ไม่ติดตามต่อ</option>' +
  '</select></label>' +
  '<div class="f-row"><label class="f"><span>ยอดที่รับจริง (บาท)</span>' +
  '<input id="pdAmt" type="number" step="0.01" inputmode="decimal"></label>' +
  '<label class="f"><span>วันที่รับเงิน</span><input id="pdDate" type="date"></label></div>' +
  '<label class="f"><span>เหตุผล / หมายเหตุ</span><select id="pdReason" onchange="pdPick()">' +
  '<option value="">— เลือกเหตุผลที่พบบ่อย —</option></select>' +
  '<textarea id="pdNote" style="margin-top:6px" placeholder="ระบุเหตุผล จำเป็นเมื่อตัดเป็นหนี้เสีย/หนี้ศูนย์"></textarea></label>';

function fillReasons() {
  var sel = document.getElementById('pdReason');
  if (!sel) return;
  var RS = (S.cache.writeoffReasons || [
    'ประกันยกเลิกกรมธรรม์', 'ผู้ป่วยไม่มาชำระส่วนต่าง', 'ต้นสังกัดปฏิเสธการเบิก',
    'เอกสารไม่ครบถ้วนตามเงื่อนไขสิทธิ', 'สิทธิหมดอายุก่อนวันรับบริการ',
    'ติดต่อผู้ป่วยไม่ได้', 'ผู้บริหารอนุมัติให้ยกเลิกยอด'
  ]);
  sel.innerHTML = '<option value="">— เลือกเหตุผลที่พบบ่อย —</option>' +
    RS.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('');
}
function pdPick() {
  var v = mv('pdReason');
  if (v) document.getElementById('pdNote').value = v;
}
function pdToggle() {
  var st = mv('pdStat');
  var paid = (st === 'จ่ายแล้ว' || st === 'จ่ายบางส่วน');
  document.getElementById('pdAmt').disabled = !paid;
  document.getElementById('pdDate').disabled = !paid;
}

function editPend(json) {
  var r = JSON.parse(json);
  modal('บันทึกผลการเรียกเก็บ',
    '<div class="card small" style="margin:0 0 12px;box-shadow:none;background:var(--bg)">' +
    '<b>' + esc(r.dctName || r.dct) + '</b> · รหัส ' + esc(r.dct) + '<br>' +
    'วันที่ ' + dTh(r.date) + ' · HN ' + esc(r.hn) + ' · สิทธิ ' + esc(r.pttype) +
    ' · รหัส ' + esc(r.code) + '<br>' +
    'เรียกเก็บ ' + B(r.total) + ' · เก็บได้ ' + B(r.collected) +
    ' · <b>ค้างเก็บ ' + B(r.outstanding) + ' บาท</b> · ค้างมา ' + N(r.ageDays) + ' วัน' +
    (r.acctBy ? '<br><span class="muted">บันทึกล่าสุดโดย ' + esc(r.acctBy) + ' ' + esc(r.acctAt) + '</span>' : '') +
    '</div>' + WRITEOFF_FORM + '<div id="pdErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="savePend(\'' + esc(r.id) + '\')">บันทึก</button>');
  fillReasons();
  document.getElementById('pdAmt').value = r.outstanding;
  document.getElementById('pdDate').value = today();
  pdToggle();
}
function savePend(id) {
  var st = mv('pdStat'), amt = mv('pdAmt'), dt = mv('pdDate'), why = mv('pdNote');
  var err = document.getElementById('pdErr');
  if ((st === 'หนี้เสีย' || st === 'หนี้ศูนย์') && why.length < 5) {
    err.innerHTML = note('bad', 'การตัดเป็นหนี้เสีย/หนี้ศูนย์ ต้องระบุเหตุผล');
    return;
  }
  api('setPendingResult', { id: id, status: st, amount: amt, recvDate: dt, reason: why },
      { write: true })
    .then(function () { closeModal(); toast('บันทึกผลเรียบร้อย', 'ok'); go('pending'); })
    .catch(function (e) { err.innerHTML = note('bad', esc(e.message)); });
}

function bulkPend() {
  var ids = [].map.call(document.querySelectorAll('.pk:checked'), function (x) { return x.value; });
  if (!ids.length) return toast('ยังไม่ได้เลือกรายการ', 'warn');
  modal('บันทึกผลหลายรายการ (' + ids.length + ' รายการ)',
    note('warn', 'ระบบจะบันทึกผลเดียวกันกับทุกรายการที่เลือก ' +
      'ถ้าเลือกสถานะที่ต้องใส่ยอดรับ ระบบจะใช้ยอดค้างเต็มจำนวนของแต่ละรายการ') +
    WRITEOFF_FORM + '<div id="pdErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="saveBulk(' +
    JSON.stringify(JSON.stringify(ids)).replace(/"/g, '&quot;') + ')">บันทึกทั้งหมด</button>');
  fillReasons();
  document.getElementById('pdAmt').value = '';
  document.getElementById('pdDate').value = today();
  pdToggle();
}
function saveBulk(json) {
  var ids = JSON.parse(json);
  var st = mv('pdStat'), dt = mv('pdDate'), why = mv('pdNote');
  var err = document.getElementById('pdErr');
  if ((st === 'หนี้เสีย' || st === 'หนี้ศูนย์') && why.length < 5) {
    err.innerHTML = note('bad', 'การตัดเป็นหนี้เสีย/หนี้ศูนย์ ต้องระบุเหตุผล');
    return;
  }
  api('bulkPendingResult', { ids: ids, status: st, recvDate: dt, reason: why }, { write: true })
    .then(function (r) {
      closeModal();
      toast('บันทึกสำเร็จ ' + N(r.done) + ' รายการ' +
            (r.errors.length ? ' · ผิดพลาด ' + r.errors.length : ''), r.errors.length ? 'warn' : 'ok', 8000);
      go('pending');
    })
    .catch(function (e) { err.innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════ หนี้เสีย / หนี้ศูนย์ ═══════════════ */
ROUTES.writeoff = function () {
  loading('กำลังรวบรวมรายการที่ตัดออก');
  api('getWriteoff', {}).then(function (D) {
    var html = '<div class="card-head"><h1 style="margin:0">หนี้เสีย / หนี้ศูนย์</h1>' +
      '<div class="spacer"></div>' + tag(N(D.count) + ' รายการ · ' + B(D.amount) + ' บาท', 'bad') + '</div>' +
      note('info', esc(D.note));

    if (!D.count) return V(html + '<div class="card">' + note('ok', 'ยังไม่มีรายการที่ถูกตัดออก') + '</div>');

    html += '<div class="card"><h3>แยกตามเหตุผล</h3><div class="tw"><table class="tight"><tbody>' +
      D.byReason.map(function (x) {
        return '<tr><td>' + esc(x.reason) + '</td><td class="num bold">' + B(x.amount) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    html += '<div class="card"><div class="card-head"><h3>รายการทั้งหมด</h3><div class="spacer"></div>' +
      '<input placeholder="ค้นหา" style="width:180px" oninput="filterTable(\'tWo\',this.value)"></div>' +
      '<div class="tw"><table id="tWo" class="tight"><thead><tr><th>วันที่</th><th>รอบที่ควรได้</th>' +
      '<th>รหัส</th><th>ชื่อแพทย์</th><th>HN</th><th>สิทธิ</th><th class="num">เรียกเก็บ</th>' +
      '<th class="num">ตัดออก</th><th>สถานะ</th><th>เหตุผล</th><th>ผู้บันทึก</th></tr></thead><tbody>';
    D.rows.forEach(function (r) {
      html += '<tr><td class="nowrap">' + dTh(r.date) + '</td><td class="small">' + esc(r.ymDue) + '</td>' +
        '<td class="mono">' + esc(r.dct) + '</td><td class="small">' + esc(r.dctName || '—') + '</td>' +
        '<td class="mono">' + esc(r.hn) + '</td><td class="small">' + esc(r.pttype) + '</td>' +
        '<td class="num">' + B(r.total) + '</td><td class="num bold">' + B(r.outstanding) + '</td>' +
        '<td>' + tag(r.status) + '</td><td class="small">' + esc(r.acctReason || '—') + '</td>' +
        '<td class="small">' + esc(r.acctBy || '—') + '<div class="tiny muted">' +
        esc(r.acctAt || '') + '</div></td></tr>';
    });
    html += '<tr class="sum"><td colspan="7">รวม</td><td class="num">' + B(D.amount) +
      '</td><td colspan="3"></td></tr></tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};

/* ═══════════════ ตกเบิก / เรียกคืน ═══════════════ */
ROUTES.backpay = function (ym) {
  loading('กำลังตรวจยอดที่เปลี่ยนหลังปิดรอบ');
  api('getBackpay', { ym: ym || '' }).then(function (D) {
    var html = '<div class="card-head"><h1 style="margin:0">ตกเบิก / เรียกคืน</h1>' +
      '<div class="spacer"></div>' +
      tag(N(D.openCount) + ' รายการรอดำเนินการ · ' + B(D.amount) + ' บาท',
          D.openCount ? 'warn' : 'ok') + '</div>' +
      note('info', esc(D.note));

    if (!D.count) return V(html + '<div class="card">' +
      note('ok', 'ยอดทุกรอบที่ปิดแล้วยังตรงกับระบบโรงพยาบาล ไม่มีรายการตกเบิก') + '</div>');

    html += '<div class="card"><div class="tw"><table class="tight"><thead><tr>' +
      '<th>รอบที่ปิดไว้</th><th>รหัส</th><th>ชื่อแพทย์</th><th>หน่วย</th>' +
      '<th class="num">ยอดตอนปิดรอบ</th><th class="num">ยอดปัจจุบัน</th>' +
      '<th class="num">ส่วนต่าง</th><th>ประเภท</th><th>สถานะ</th><th>ตรวจพบเมื่อ</th>' +
      '</tr></thead><tbody>';
    D.rows.forEach(function (r) {
      var up = Number(r.diff) > 0;
      html += '<tr><td class="nowrap">' + esc(r.ymClosedTh) + '</td>' +
        '<td class="mono">' + esc(r.dct) + '</td><td class="small">' + esc(r.dctName || '—') + '</td>' +
        '<td class="small">' + esc(r.grpName) + '</td>' +
        '<td class="num">' + B(r.closedBase) + '</td><td class="num">' + B(r.currentBase) + '</td>' +
        '<td class="num bold" style="color:' + (up ? 'var(--ok)' : 'var(--danger)') + '">' +
        (up ? '+' : '') + B(r.diff) + '</td>' +
        '<td>' + tag(r.kind, up ? 'ok' : 'bad') + '</td>' +
        '<td>' + tag(r.status === 'open' ? 'รอดำเนินการ' : r.status,
                     r.status === 'open' ? 'warn' : 'plain') + '</td>' +
        '<td class="small muted">' + esc(r.detectedAt) + '</td></tr>';
    });
    html += '</tbody></table></div>' +
      note('warn', 'รายการ "ตกเบิกเพิ่ม" ให้นำยอดส่วนต่างไปรวมในรอบเบิกเดือนถัดไป · ' +
        'รายการ "เรียกคืน" เกิดจากยอดในระบบโรงพยาบาลลดลงหลังปิดรอบ ' +
        'ต้องตรวจสาเหตุก่อนดำเนินการ เพราะอาจเกิดจากการยกเลิกรายการย้อนหลัง') +
      '</div>';
    V(html);
  }).catch(showErr);
};


/** คำนวณยอดของรอบใหม่ — ใช้หลังแก้เงื่อนไขที่กระทบเงิน */
function rebuildMonth(ym, btn) {
  if (!confirm('คำนวณยอดรอบ ' + ymTh(ym) + ' ใหม่ตามเงื่อนไขปัจจุบัน?\n\n' +
    'ระบบจะคิดยอดใหม่จากข้อมูลที่ดึงมาแล้ว โดยไม่ลบการตัดสินใจที่เจ้าหน้าที่บันทึกไว้\n' +
    'ถ้ารอบนี้ปิดแล้ว ยอดที่บันทึกตอนปิดรอบจะยังอยู่ และส่วนต่างจะขึ้นเป็นรายการตกเบิก')) return;
  var old = btn.textContent;
  btn.disabled = true; btn.textContent = 'กำลังคำนวณ...';
  api('rebuildMonth', { ym: ym }, { write: true })
    .then(function () { toast('คำนวณยอดรอบ ' + ymTh(ym) + ' ใหม่เรียบร้อย', 'ok'); go('month', ym); })
    .catch(function (e) {
      btn.disabled = false; btn.textContent = old;
      toast(e.message, 'bad', 9000);
    });
}

/** เปิดดูเลข HN จริง — เฉพาะผู้ดูแลระบบ ต้องยืนยันรหัสผ่าน และระบบบันทึกประวัติไว้ทุกครั้ง
 *  ระบบเก็บ HN เป็นค่าแฮช ไม่เก็บเลขจริงในตารางงาน เพื่อให้สอดคล้อง PDPA
 *  จึงต้องเปิดจากคลังที่แยกไว้ และการเปิดดูทุกครั้งถูกบันทึกว่าใครเปิดเมื่อใด */
function askHn(hash) {
  modal('ขอดูเลข HN จริง',
    note('warn', 'ระบบเก็บ HN เป็นค่าเข้ารหัสเพื่อคุ้มครองข้อมูลผู้ป่วย · ' +
      'การเปิดดูเลขจริงจะถูกบันทึกไว้ว่าท่านเปิดดูรายการใดเมื่อใด ' +
      'กรุณาเปิดดูเฉพาะเมื่อจำเป็นต่อการตรวจสอบยอดเท่านั้น') +
    '<label class="f"><span>ยืนยันรหัสผ่านของท่าน</span>' +
    '<input id="hnPass" type="password"></label><div id="hnOut"></div>',
    '<button onclick="closeModal()">ปิด</button>' +
    '<button class="btn-primary" onclick="doRevealHn(\'' + esc(hash) + '\')">เปิดดู</button>');
}
function doRevealHn(hash) {
  api('revealHn', { hnHash: hash, pass: mv('hnPass') }, { write: true })
    .then(function (r) {
      document.getElementById('hnOut').innerHTML =
        note('ok', 'HN: <b class="mono" style="font-size:1.1rem">' + esc(r.hn || '—') + '</b>');
    })
    .catch(function (e) { document.getElementById('hnOut').innerHTML = note('bad', esc(e.message)); });
}
