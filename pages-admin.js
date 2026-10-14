/* SMC MD — pages-admin.js
 * ตัดรอบและออกเอกสาร · ใบแจ้งยอดรายคน · ทะเบียนสัญญา 40(6) · สิทธิ · รหัส DF
 * กฎจัดกลุ่ม · ตั้งค่าระบบ · ผู้ใช้งาน · ประวัติการใช้งาน
 */

/* ═══════════════════════════════════════════════════════
   ตัดรอบและออกเอกสาร — ขั้นตอนทำงานจริงของแต่ละรอบ
   ═══════════════════════════════════════════════════════ */
ROUTES.close = function (ym) {
  ym = ym || ymAdd(thisYm(), -1);     /* ปกติทำรอบเดือนที่แล้ว */
  loading('กำลังตรวจความพร้อมของรอบ ' + ymTh(ym));
  api('getMonth', { ym: ym, grp: 'ALL' }).then(function (D) {
    var s = D.summary;
    var allClosed = D.groups.length && D.groups.every(function (g) { return g.status === 'closed'; });
    var blockers = [];
    if (D.waitGroup) blockers.push('มี ' + N(D.waitGroup) + ' รายการที่จับกลุ่มการเบิกไม่ได้ — ' +
      'ต้องจัดให้ครบก่อน <a href="#day">(ไปจัดกลุ่ม)</a>');

    var html = '<div class="toolbar no-print">' +
      '<label class="f"><span>รอบเดือนที่ต้องการทำ</span>' +
      '<select onchange="go(\'close\',this.value)">' + ymOptions(ym, 24) + '</select></label></div>';

    html += '<div class="card-head"><h1 style="margin:0">ตัดรอบและออกเอกสาร · ' + ymTh(ym) + '</h1>' +
      '<div class="spacer"></div>' +
      D.groups.map(function (g) {
        return tag(g.grpName + ': ' + g.statusTh, g.status === 'closed' ? 'ok' : 'warn');
      }).join(' ') + '</div>';

    if (!s.doctors) {
      return V(html + '<div class="card">' + note('warn',
        'รอบ ' + ymTh(ym) + ' ยังไม่มีข้อมูล · กรุณาดึงข้อมูลจากระบบโรงพยาบาลก่อน') +
        '<div class="btn-row"><button class="btn-primary" onclick="syncMonth(\'' + ym + '\')">' +
        'ดึงข้อมูลทั้งเดือนนี้</button></div></div>');
    }

    html += '<div class="grid c4">' +
      kpi('แพทย์ที่มียอด', N(s.doctors) + ' ราย', N(s.cases) + ' เคส', 'accent') +
      kpi('ยอดรับรองรวม', B(s.base), 'ฐานคำนวณ') +
      kpi('ส่วนแพทย์ 80%', B(s.pay80), 'ยอดที่ต้องเบิก', 'good') +
      kpi('ส่วนโรงพยาบาล 20%', B(s.hos20), '') +
      '</div>';

    if (blockers.length) {
      html += note('bad', '<b>ยังปิดรอบไม่ได้</b><ul style="margin:6px 0 0;padding-left:18px">' +
        blockers.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>');
    }
    if (s.contractIssues) {
      html += note('warn', 'มี ' + N(s.contractIssues) + ' แพทย์ที่ข้อมูลสัญญา 40(6) ยังไม่เรียบร้อย · ' +
        'ปิดรอบได้ แต่ควรตรวจก่อน เพราะการเบิกต้องมีสัญญาประกอบ <a href="#contracts">(ตรวจทะเบียน)</a>');
    }

    /* ขั้นตอนทำงาน */
    var steps = [
      { n: 1, t: 'ดึงข้อมูลทั้งเดือนให้เป็นปัจจุบัน',
        d: 'ยอดที่เรียกเก็บได้เปลี่ยนทุกวัน ควรดึงทับอีกครั้งก่อนปิดรอบ',
        btn: '<button onclick="syncMonth(\'' + ym + '\')">ดึงข้อมูลทั้งเดือน</button>' },
      { n: 2, t: 'ตรวจรายการที่มีข้อสังเกต',
        d: 'จัดกลุ่มรายการที่จับไม่ได้ · ระงับจ่ายรายการที่คีย์ผิดคน · ตรวจสัญญาที่ขึ้นธง',
        btn: '<a class="btn btn-sm" href="#day">ตรวจรายวัน</a> ' +
             '<a class="btn btn-sm" href="#month:' + ym + '">ดูสรุปรายเดือน</a>' },
      { n: 3, t: 'ปิดรอบ (ล็อกยอด)',
        d: 'ระบบจะบันทึกยอดของแต่ละแพทย์ไว้เป็นหลักฐาน ถ้าภายหลังยอดในระบบโรงพยาบาลเปลี่ยน ' +
           'ระบบจะแจ้งเป็นรายการตกเบิกให้เอง ไม่แก้ยอดที่ปิดแล้วเงียบ ๆ',
        btn: allClosed
          ? tag('ปิดรอบแล้ว', 'ok') + (isAdmin()
              ? ' <button class="btn-sm" onclick="reopenMonth(\'' + ym + '\')">เปิดรอบใหม่</button>' : '')
          : '<button class="btn-primary" onclick="closeMonth(\'' + ym + '\')"' +
            (blockers.length ? ' disabled' : '') + '>ปิดรอบ ' + ymTh(ym) + '</button>' },
      { n: 4, t: 'ออกรายงานขอเบิกส่งฝ่ายบริหารงานบุคคล',
        d: 'ไฟล์ Google Sheet พร้อมหัวรายงาน ยอดรวม และช่องลงนาม สั่งพิมพ์เป็น PDF ได้ทันที',
        btn: '<button onclick="mkDoc(\'buildHrReport\',{ym:\'' + ym + '\',grp:\'ALL\'},this)">' +
             'ออกรายงานขอเบิก</button>' },
      { n: 5, t: 'ออกไฟล์นำเข้า HRMi',
        d: 'ไฟล์ 7 คอลัมน์ตามรูปแบบที่ใช้อยู่ · แยกรหัสรายได้ R101 (โรงพยาบาล) และ ' +
           'R106 (ศูนย์สาขา) · มีทั้ง Google Sheet และไฟล์ CSV',
        btn: '<button onclick="mkDoc(\'buildHrmiFiles\',{ym:\'' + ym + '\',grp:\'ALL\'},this)">' +
             'ออกไฟล์นำเข้า HRMi</button>' },
      { n: 6, t: 'ส่งรายการที่จ่ายแล้วกลับฝ่ายไอที',
        d: 'ไฟล์ CSV บอกว่ารายการใดจ่ายในรอบใด เพื่อให้ระบบโรงพยาบาลกันการเบิกซ้ำ ' +
           '(HN ส่งเป็นค่าแฮช ไม่ใช่เลขจริง)',
        btn: '<button onclick="mkDoc(\'buildPaidExport\',{ym:\'' + ym + '\',grp:\'ALL\'},this)">' +
             'ออกไฟล์ส่งฝ่ายไอที</button>' },
      { n: 7, t: 'ออกใบแจ้งยอดรายคน',
        d: 'ออกเฉพาะรายที่ขอ ระบบบันทึกไว้ว่าใครสั่งพิมพ์เมื่อใด',
        btn: '<a class="btn btn-sm" href="#docs">ไปหน้าใบแจ้งยอด</a>' }
    ];

    html += '<div class="card"><h3>ขั้นตอนการทำรอบ</h3><div class="tw">' +
      '<table><tbody>';
    steps.forEach(function (st) {
      html += '<tr><td class="center bold" style="width:38px;font-size:1.1rem;color:var(--red)">' +
        st.n + '</td><td><b>' + esc(st.t) + '</b><div class="small muted">' + st.d + '</div></td>' +
        '<td class="right nowrap">' + st.btn + '</td></tr>';
    });
    html += '</tbody></table></div><div id="docOut"></div></div>';

    html += '<div class="card small muted">กำหนดส่งฝ่ายบริหารงานบุคคล: ไม่เกินวันที่ ' +
      esc((S.me.settings && S.me.settings.submitByDay) || 4) + ' ของเดือนถัดไป</div>';

    V(html);
  }).catch(showErr);
};

function syncMonth(ym) {
  var last = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0))
               .toISOString().slice(0, 10);
  if (!confirm('ดึงข้อมูลทั้งเดือน ' + ymTh(ym) + ' จากระบบโรงพยาบาลใหม่?\n' +
               'อาจใช้เวลา 1-3 นาที ขึ้นกับจำนวนรายการ')) return;
  toast('กำลังดึงข้อมูล กรุณารอ อย่าปิดหน้านี้', 'info', 12000);
  api('syncRange', { from: ym + '-01', to: last }, { write: true })
    .then(function (r) {
      toast('ดึงข้อมูลเรียบร้อย ' + N(r.rows) + ' รายการ ' + N(r.days) + ' วัน', 'ok', 8000);
      go('close', ym);
    })
    .catch(function (e) { toast(e.message, 'bad', 12000); });
}

function closeMonth(ym) {
  modal('ยืนยันการปิดรอบ ' + ymTh(ym),
    note('warn', 'การปิดรอบจะบันทึกยอดของแพทย์ทุกรายไว้เป็นหลักฐาน ' +
      'และเป็นยอดที่ใช้อ้างอิงในการเบิกจ่าย · หากภายหลังยอดในระบบโรงพยาบาลเปลี่ยน ' +
      'ระบบจะไม่แก้ยอดที่ปิดแล้ว แต่จะแจ้งเป็นรายการตกเบิกให้ดำเนินการในรอบถัดไป') +
    '<label class="f"><span>ยืนยันรหัสผ่านของท่าน</span>' +
    '<input id="cmPass" type="password" autocomplete="current-password"></label><div id="cmErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="doCloseMonth(\'' + ym + '\')">ปิดรอบ</button>');
}
function doCloseMonth(ym) {
  var p = mv('cmPass');
  if (!p) { document.getElementById('cmErr').innerHTML = note('bad', 'กรุณากรอกรหัสผ่าน'); return; }
  api('closeMonth', { ym: ym, grp: 'ALL', pass: p }, { write: true })
    .then(function (r) {
      closeModal();
      toast('ปิดรอบ ' + ymTh(ym) + ' เรียบร้อย', 'ok');
      go('close', ym);
    })
    .catch(function (e) { document.getElementById('cmErr').innerHTML = note('bad', esc(e.message)); });
}

function reopenMonth(ym) {
  modal('เปิดรอบ ' + ymTh(ym) + ' ใหม่',
    note('bad', 'ใช้เฉพาะกรณีจำเป็น เช่น พบว่ายอดผิดก่อนส่งฝ่ายบริหารงานบุคคล · ' +
      'ยอดที่บันทึกไว้ตอนปิดรอบจะยังเก็บไว้สำหรับตรวจตกเบิก และระบบบันทึกประวัติผู้สั่งไว้') +
    '<label class="f"><span>ยืนยันรหัสผ่านของท่าน</span>' +
    '<input id="roPass" type="password"></label><div id="roErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-danger" onclick="doReopen(\'' + ym + '\')">เปิดรอบใหม่</button>');
}
function doReopen(ym) {
  api('reopenMonth', { ym: ym, grp: 'ALL', pass: mv('roPass') }, { write: true })
    .then(function () { closeModal(); toast('เปิดรอบใหม่แล้ว', 'ok'); go('close', ym); })
    .catch(function (e) { document.getElementById('roErr').innerHTML = note('bad', esc(e.message)); });
}

/** สร้างเอกสารแล้วแสดงลิงก์ */
function mkDoc(action, payload, btn) {
  var old = btn.textContent;
  btn.disabled = true; btn.textContent = 'กำลังสร้างไฟล์...';
  api(action, payload, { write: true }).then(function (r) {
    btn.disabled = false; btn.textContent = old;
    var out = document.getElementById('docOut');
    var h = '<div class="note ok" style="margin-top:12px"><span class="ic">✓</span><span>' +
      '<b>' + esc(r.name) + '</b><br>' +
      '<a href="' + esc(r.url) + '" target="_blank" rel="noopener">เปิดไฟล์</a>';

    if (r.blocks) {
      h += '<div class="tw" style="margin-top:8px"><table class="tight"><thead><tr>' +
        '<th>หน่วย</th><th>รหัสรายได้</th><th class="num">แพทย์</th><th class="num">บรรทัด</th>' +
        '<th class="num">ยอดรับรอง</th><th class="num">80%</th><th class="num">20%</th>' +
        '<th>ตรวจยอด</th></tr></thead><tbody>';
      r.blocks.forEach(function (b) {
        h += '<tr><td>' + esc(b.groupName) + '</td>' +
          '<td class="mono">' + esc(b.incomePay) + ' / ' + esc(b.incomeHos) + '</td>' +
          '<td class="num">' + N(b.doctors) + '</td><td class="num">' + N(b.lines) + '</td>' +
          '<td class="num">' + B(b.base) + '</td><td class="num">' + B(b.pay80) + '</td>' +
          '<td class="num">' + B(b.hos20) + '</td>' +
          '<td>' + (b.checkSum ? tag('80+20 = ยอดเต็ม', 'ok') : tag('ยอดไม่ตรง', 'bad')) + '</td></tr>';
      });
      h += '</tbody></table></div>';
      if (r.csv && r.csv.length) {
        h += '<div style="margin-top:8px">ไฟล์ CSV สำหรับนำเข้า HRMi: ' +
          r.csv.map(function (c) {
            return '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' +
                   esc(c.name) + '</a>';
          }).join(' · ') + '</div>';
      }
      if (r.warnings && r.warnings.length) {
        h += '<div style="margin-top:6px;color:var(--warn)">⚠ ' +
             r.warnings.map(esc).join(' · ') + '</div>';
      }
    }
    if (r.rows !== undefined && r.amount !== undefined) {
      h += '<div class="small" style="margin-top:6px">' + N(r.rows) + ' รายการ · ยอดรวม ' +
           B(r.amount) + ' บาท</div>';
    }
    if (r.note) h += '<div class="small muted" style="margin-top:6px">' + esc(r.note) + '</div>';
    h += '</span></div>';
    if (out) out.insertAdjacentHTML('afterbegin', h); else toast('สร้างไฟล์เรียบร้อย: ' + r.name, 'ok');
  }).catch(function (e) {
    btn.disabled = false; btn.textContent = old;
    var out = document.getElementById('docOut');
    if (out) out.insertAdjacentHTML('afterbegin', note('bad', esc(e.message)));
    else toast(e.message, 'bad', 9000);
  });
}

/* ═══════════════════════════════════════════════════════
   ใบแจ้งยอดรายคน
   ═══════════════════════════════════════════════════════ */
ROUTES.docs = function (arg) {
  var parts = String(arg || '').split('|');
  var dct = parts[0] || '';
  var ym = parts[1] || ymAdd(thisYm(), -1);

  var html = '<div class="card"><h1 style="margin:0 0 2px">ใบแจ้งยอดค่าตอบแทนรายคน</h1>' +
    '<div class="small muted">แทนไฟล์ Excel แยกรายคนที่เคยทำด้วย VBA · ' +
    'ระบบบันทึกไว้ว่าใครสั่งออกเอกสารเมื่อใด</div>' +
    '<div class="toolbar" style="margin-top:12px">' +
    '<label class="f"><span>รอบเดือน</span><select id="slipYm">' + ymOptions(ym, 24) + '</select></label>' +
    '<label class="f"><span>รหัสแพทย์</span>' +
    '<input id="slipDct" value="' + esc(dct) + '" placeholder="เช่น 2680247" style="width:150px"></label>' +
    '<button class="btn-primary" onclick="viewSlip()">ดูยอด</button>' +
    '</div><div class="hint">หรือเลือกจาก <a href="#month:' + ym + '">หน้าสรุปรายเดือน</a> ' +
    'เพื่อกดลิงก์ใบแจ้งยอดของแพทย์แต่ละราย</div></div><div id="slipOut"></div>';
  V(html);
  if (dct) viewSlip();
};

function viewSlip() {
  var dct = mv('slipDct'), ym = mv('slipYm');
  if (!dct) return toast('กรุณากรอกรหัสแพทย์', 'warn');
  var out = document.getElementById('slipOut');
  out.innerHTML = '<div class="loading"><span class="spin"></span>กำลังรวบรวมยอด</div>';
  history.replaceState(null, '', '#docs:' + dct + '|' + ym);
  api('getDoctorMonth', { ym: ym, dct: dct }).then(function (D) {
    out.innerHTML =
      '<div class="card no-print"><div class="btn-row">' +
      '<button class="btn-primary" onclick="mkDoc(\'buildDoctorSlip\',{ym:\'' + ym +
      '\',dct:\'' + esc(dct) + '\'},this)">ออกใบแจ้งยอด (Google Sheet)</button>' +
      '<button onclick="window.print()">พิมพ์หน้านี้</button>' +
      '</div><div id="docOut"></div></div>' +
      renderDoctorMonth(D, ym, false);
  }).catch(function (e) { out.innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════════════════════════════════════════════
   ทะเบียนสัญญา 40(6)
   ═══════════════════════════════════════════════════════ */
ROUTES.contracts = function () {
  loading('กำลังโหลดทะเบียนสัญญา');
  api('getRegistry', { kind: 'contracts' }).then(function (D) {
    S.cache.registry = D;
    var html = '<div class="card-head"><h1 style="margin:0">ทะเบียนสัญญาจ้างตามมาตรา 40(6)</h1>' +
      '<div class="spacer"></div>' +
      tag(N(D.doctors.length) + ' ราย', 'plain') + ' ' +
      (D.noContract ? tag('ไม่มีสัญญา ' + N(D.noContract), 'bad') : '') + ' ' +
      (D.contractFlags ? tag('ขึ้นธง ' + N(D.contractFlags), 'warn') : tag('เรียบร้อย', 'ok')) +
      '</div>';

    html += note('info', 'การเบิกค่าตอบแทนต้องมีสัญญา 40(6) ประกอบ · ' +
      'ระบบจะขึ้นธงเตือนแต่ไม่ระงับจ่ายเอง เพราะบางรายอยู่ระหว่างรอเอกสาร · ' +
      'หากต้องการระงับจ่ายให้แก้สถานะรายเคสที่หน้าตรวจรายการรายวัน');

    html += '<div class="card"><div class="card-head"><h3>รายชื่อ</h3><div class="spacer"></div>' +
      '<select onchange="filterContracts(this.value)" style="width:auto">' +
      '<option value="">ทั้งหมด</option><option value="flag">เฉพาะที่ขึ้นธง</option>' +
      '<option value="none">เฉพาะที่ไม่มีสัญญา</option>' +
      '<option value="nofile">เฉพาะที่ยังไม่แนบไฟล์</option>' +
      '<option value="paid">เฉพาะที่มียอดเบิกรอบล่าสุด</option></select>' +
      '<input id="cFind" placeholder="ค้นหารหัสหรือชื่อ" style="width:200px" ' +
      'oninput="filterTable(\'tCon\',this.value)"></div>' +
      '<div class="tw"><table id="tCon" class="tight"><thead><tr><th>รหัส</th><th>ชื่อ - สกุล</th>' +
      '<th>ฝ่าย/สาขา</th><th>เลขที่สัญญา</th><th>วันเริ่มสัญญา</th><th>ไฟล์</th>' +
      '<th class="num">ยอดรอบล่าสุด</th><th>สถานะ / ข้อสังเกต</th><th></th></tr></thead><tbody>';
    D.doctors.forEach(function (d) {
      var c = d.contract;
      var cls = c.flag ? 'flagged' : '';
      html += '<tr class="' + cls + '" data-flag="' + (c.flag ? '1' : '') + '" ' +
        'data-none="' + (c.startDate ? '' : '1') + '" data-nofile="' + (c.hasFile ? '' : '1') + '" ' +
        'data-paid="' + (d.lastBase > 0 ? '1' : '') + '">' +
        '<td class="mono">' + esc(d.code) + '</td><td>' + esc(d.fullName || '—') + '</td>' +
        '<td class="small">' + esc(d.dept || '—') + '</td>' +
        '<td class="small">' + esc(c.contractNo || '—') + '</td>' +
        '<td class="nowrap">' + (c.startDate ? dTh(c.startDate) : '—') + '</td>' +
        '<td>' + (c.hasFile ? tag('มีไฟล์', 'ok') : tag('ยังไม่แนบ', 'plain')) + '</td>' +
        '<td class="num">' + (d.lastBase ? B(d.lastBase) : '—') + '</td>' +
        '<td class="small">' + (c.flag ? '<span style="color:var(--warn)">⚠ ' + esc(c.flag) + '</span>'
                                       : esc(c.status || '—')) + '</td>' +
        '<td class="nowrap"><button class="btn-sm" onclick="editContract(\'' + esc(d.code) + '\')">' +
        'แก้ไข</button></td></tr>';
    });
    html += '</tbody></table></div></div>';

    if (isAdmin()) {
      html += '<div class="card"><h3>รหัสแพทย์ที่เปลี่ยนใหม่</h3>' +
        note('info', 'เมื่อแพทย์เปลี่ยนรหัส ระบบโรงพยาบาลอาจยังส่งรหัสเดิมมาอยู่ · ' +
          'ผูกรหัสเดิมกับรหัสใหม่ไว้ที่นี่ แล้วระบบจะรวมยอดให้ · ' +
          'ระบบไม่รวมยอดเองจนกว่าจะกดยืนยัน เพราะชื่อซ้ำกันได้') +
        '<div class="btn-row"><button class="btn-sm" onclick="editAlias()">เพิ่ม/แก้รหัสแทน</button></div>' +
        '</div>';
    }
    V(html);
  }).catch(showErr);
};

function filterContracts(mode) {
  var rows = document.querySelectorAll('#tCon tbody tr');
  for (var i = 0; i < rows.length; i++) {
    rows[i].style.display = (!mode || rows[i].getAttribute('data-' + mode) === '1') ? '' : 'none';
  }
}

function editContract(code) {
  var D = S.cache.registry;
  var d = D.doctors.filter(function (x) { return String(x.code) === String(code); })[0];
  if (!d) return toast('ไม่พบข้อมูล', 'bad');
  var c = d.contract;
  modal('สัญญา 40(6) · ' + (d.fullName || code),
    '<div class="small muted" style="margin-bottom:10px">รหัสแพทย์ ' + esc(code) +
    (d.dept ? ' · ' + esc(d.dept) : '') +
    (d.lastBase ? ' · ยอดรอบล่าสุด ' + B(d.lastBase) + ' บาท' : '') + '</div>' +
    (c.flag ? note('warn', 'ข้อสังเกตปัจจุบัน: ' + esc(c.flag)) : '') +
    '<div class="f-row">' +
    '<label class="f"><span>เลขที่สัญญา</span><input id="ctNo" value="' + esc(c.contractNo) + '"></label>' +
    '<label class="f"><span>วันเริ่มสัญญา</span><input id="ctStart" type="date" value="' +
    esc(c.startDate) + '"></label></div>' +
    '<div class="f-row">' +
    '<label class="f"><span>วันลงนาม</span><input id="ctSign" type="date" value="' +
    esc(c.signDate) + '"></label>' +
    '<label class="f"><span>วันสิ้นสุด (เว้นว่างได้)</span><input id="ctEnd" type="date" value="' +
    esc(c.endDate) + '"></label></div>' +
    '<label class="f"><span>สถานะ</span><select id="ctStat">' +
    ['มีสัญญา', 'ยังไม่มีสัญญา', 'รออนุมัติ', 'รอส่งเอกสาร', 'สิ้นสุดสัญญา'].map(function (x) {
      return '<option' + (x === c.status ? ' selected' : '') + '>' + x + '</option>';
    }).join('') + '</select></label>' +
    '<label class="f"><span>ไฟล์สัญญา (PDF หรือรูปภาพ)</span>' +
    '<input id="ctFile" type="file" accept=".pdf,image/*">' +
    '<div class="hint">' + (c.hasFile ? 'ไฟล์ปัจจุบัน: ' + esc(c.fileName) +
      ' · อัปโหลดใหม่จะเก็บไฟล์เดิมไว้ในโฟลเดอร์ประวัติ ไม่ลบทิ้ง' : 'ยังไม่มีไฟล์ในระบบ') +
    '</div></label>' +
    '<label class="f"><span>หมายเหตุ</span><textarea id="ctNote">' + esc(c.note) + '</textarea></label>' +
    (c.flag ? '<label class="f" style="display:flex;gap:8px;align-items:center">' +
      '<input type="checkbox" id="ctClear" style="width:auto">' +
      '<span style="margin:0">ตรวจแล้วเรียบร้อย — ลบข้อสังเกตนี้ออก</span></label>' : '') +
    '<div id="ctErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="saveContract(\'' + esc(code) + '\')">บันทึก</button>');
}

function saveContract(code) {
  var err = document.getElementById('ctErr');
  var p = {
    code: code, contractNo: mv('ctNo'), startDate: mv('ctStart'),
    signDate: mv('ctSign'), endDate: mv('ctEnd'), status: mv('ctStat'), note: mv('ctNote'),
    clearFlag: !!(document.getElementById('ctClear') && document.getElementById('ctClear').checked)
  };
  var f = document.getElementById('ctFile').files[0];
  var send = function () {
    api('saveContract', { data: p }, { write: true })
      .then(function () { closeModal(); toast('บันทึกสัญญาเรียบร้อย', 'ok'); go('contracts'); })
      .catch(function (e) { err.innerHTML = note('bad', esc(e.message)); });
  };
  if (!f) return send();
  if (f.size > 8 * 1024 * 1024) {
    err.innerHTML = note('bad', 'ไฟล์ใหญ่เกิน 8 MB กรุณาบีบอัดหรือสแกนที่ความละเอียดต่ำลง');
    return;
  }
  err.innerHTML = '<div class="small muted"><span class="spin"></span>กำลังอัปโหลดไฟล์</div>';
  var fr = new FileReader();
  fr.onload = function () {
    p.fileBase64 = String(fr.result).split(',')[1];
    p.fileName = f.name;
    p.fileMime = f.type || 'application/pdf';
    send();
  };
  fr.onerror = function () { err.innerHTML = note('bad', 'อ่านไฟล์ไม่สำเร็จ'); };
  fr.readAsDataURL(f);
}

function editAlias() {
  modal('ผูกรหัสแพทย์เดิมกับรหัสใหม่',
    note('warn', 'ใช้เมื่อแพทย์เปลี่ยนรหัสแต่ระบบโรงพยาบาลยังส่งรหัสเดิมมา · ' +
      'ตรวจชื่อ-สกุลให้ตรงกันก่อนกดยืนยัน เพราะถ้าผูกผิด เงินจะเข้าผิดคน') +
    '<div class="f-row">' +
    '<label class="f"><span>รหัสเดิม</span><input id="alOld" placeholder="2680247"></label>' +
    '<label class="f"><span>รหัสใหม่</span><input id="alNew" placeholder="2690049"></label></div>' +
    '<label class="f"><span>ชื่อ - สกุล (เพื่อยืนยันว่าเป็นคนเดียวกัน)</span><input id="alName"></label>' +
    '<label class="f"><span>หมายเหตุ</span><input id="alNote"></label>' +
    '<label class="f" style="display:flex;gap:8px;align-items:center">' +
    '<input type="checkbox" id="alOk" style="width:auto">' +
    '<span style="margin:0">ตรวจแล้วว่าเป็นบุคคลเดียวกัน — ยืนยันให้ระบบรวมยอด</span></label>' +
    '<div id="alErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="saveAlias()">บันทึก</button>');
}
function saveAlias() {
  api('saveAlias', {
    data: { oldCode: mv('alOld'), newCode: mv('alNew'), name: mv('alName'),
            note: mv('alNote'), confirmed: document.getElementById('alOk').checked }
  }, { write: true })
    .then(function (r) { closeModal(); toast(r.note || 'บันทึกแล้ว', 'ok', 8000); go('contracts'); })
    .catch(function (e) { document.getElementById('alErr').innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════════════════════════════════════════════
   สิทธิการรักษา — หน้าที่กระทบเงินมากที่สุด
   ═══════════════════════════════════════════════════════ */
ROUTES.rights = function () {
  loading('กำลังโหลดทะเบียนสิทธิ');
  api('getRegistry', { kind: 'rights' }).then(function (D) {
    S.cache.rights = D.rights;
    var html = '<div class="card-head"><h1 style="margin:0">เงื่อนไขการจ่ายตามสิทธิการรักษา</h1>' +
      '<div class="spacer"></div><span class="small muted">' + N(D.rights.length) + ' สิทธิ</span></div>';

    html += note('warn', '<b>หน้านี้กระทบยอดเงินโดยตรง</b><br>' +
      '<b>จ่ายได้เลย</b> — สิทธิที่แน่ใจว่าโรงพยาบาลเก็บเงินได้ (บริษัทคู่สัญญา · พ.ร.บ. · ประกันชีวิต) ' +
      'ระบบจ่ายบนยอดเรียกเก็บเต็ม ไม่ต้องรอเก็บเงินจบ แต่ยังขึ้นเป็นยอดค้างรับให้ฝ่ายบัญชีตามเก็บ<br>' +
      '<b>ค้างจ่ายก่อน</b> — จ่ายเท่าที่เก็บเงินได้ ส่วนที่เหลือรอเรียกเก็บครบ<br>' +
      '<b>ไม่รวมยอด</b> — ไม่นำมาคิดค่าตอบแทนเลย<br>' +
      'สิทธิที่ระบบพบใหม่จะตั้งเป็น "ค้างจ่ายก่อน" ไว้อัตโนมัติ เพราะจ่ายช้าแก้ได้ จ่ายเกินตามคืนยาก');

    var byGrp = {};
    D.rights.forEach(function (r) { (byGrp[r.grp] = byGrp[r.grp] || []).push(r); });

    html += '<div class="card"><div class="card-head"><h3>ทะเบียนสิทธิ</h3><div class="spacer"></div>' +
      '<button class="btn-primary btn-sm" onclick="saveRights()">บันทึกการเปลี่ยนแปลง</button></div>' +
      '<div class="tw"><table class="tight"><thead><tr><th>สิทธิการรักษา</th><th>หมวด</th>' +
      '<th style="width:190px">เงื่อนไขการจ่าย</th><th>พบครั้งแรก</th><th>แก้ล่าสุด</th>' +
      '</tr></thead><tbody>';
    Object.keys(byGrp).sort().forEach(function (g) {
      html += '<tr class="sum"><td colspan="5">' + esc(g) + ' (' + byGrp[g].length + ')</td></tr>';
      byGrp[g].forEach(function (r) {
        html += '<tr><td>' + esc(r.name) + '</td><td class="small muted">' + esc(r.grp) + '</td>' +
          '<td><select class="rPol" data-name="' + esc(r.name) + '" data-grp="' + esc(r.grp) + '" ' +
          'data-orig="' + esc(r.policy) + '" onchange="this.style.borderColor=' +
          '(this.value!==this.dataset.orig)?\'var(--warn)\':\'\'">' +
          '<option value="pay"' + (r.policy === 'pay' ? ' selected' : '') + '>จ่ายได้เลย</option>' +
          '<option value="hold"' + (r.policy === 'hold' ? ' selected' : '') + '>ค้างจ่ายก่อน</option>' +
          '<option value="skip"' + (r.policy === 'skip' ? ' selected' : '') + '>ไม่รวมยอด</option>' +
          '</select></td>' +
          '<td class="small muted nowrap">' + (r.firstSeen ? dTh(r.firstSeen) : '—') + '</td>' +
          '<td class="small muted">' + esc(r.updatedBy || '—') + '</td></tr>';
      });
    });
    html += '</tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};

function saveRights() {
  var sels = document.querySelectorAll('.rPol');
  var changed = [], all = [];
  for (var i = 0; i < sels.length; i++) {
    var s = sels[i];
    var row = { name: s.dataset.name, grp: s.dataset.grp, policy: s.value };
    all.push(row);
    if (s.value !== s.dataset.orig) changed.push(row.name + ' → ' + s.options[s.selectedIndex].text);
  }
  if (!changed.length) return toast('ไม่มีการเปลี่ยนแปลง', 'info');
  if (!confirm('ยืนยันเปลี่ยนเงื่อนไข ' + changed.length + ' สิทธิ?\n\n' +
               changed.join('\n') + '\n\nยอดของรอบที่ยังไม่ปิดจะเปลี่ยนตาม')) return;
  api('saveRights', { rows: all }, { write: true })
    .then(function (r) {
      toast(r.note || 'บันทึกแล้ว', 'ok', 10000);
      go('rights');
    })
    .catch(function (e) { toast(e.message, 'bad', 9000); });
}

/* ═══════════════════════════════════════════════════════
   รหัสค่าธรรมเนียมแพทย์
   ═══════════════════════════════════════════════════════ */
ROUTES.dfcodes = function () {
  loading('กำลังโหลดทะเบียนรหัส');
  api('getRegistry', { kind: 'dfcodes' }).then(function (D) {
    var html = '<div class="card-head"><h1 style="margin:0">ทะเบียนรหัสค่าธรรมเนียมแพทย์</h1>' +
      '<div class="spacer"></div>' + tag(N(D.dfCodes.length) + ' รหัส', 'plain') + ' ' +
      (D.dfPending ? tag('รอยืนยัน ' + N(D.dfPending), 'warn') : tag('ยืนยันครบ', 'ok')) + '</div>';

    html += note('info', 'รหัสที่สถานะ <b>รอยืนยัน</b> จะไม่ถูกนับจ่าย · ' +
      'เมื่อระบบโรงพยาบาลส่งรหัสใหม่ที่ไม่เคยเจอ ระบบจะบันทึกเป็นรอยืนยันและแจ้งเตือน ' +
      'เพื่อให้ตรวจก่อนว่ารหัสนั้นเป็นค่าธรรมเนียมแพทย์จริงและเป็นของหน่วยใด');

    if (D.dfPending) {
      html += note('warn', 'มีรหัสใหม่ ' + N(D.dfPending) + ' รหัสที่ยังไม่ได้ยืนยัน ' +
        'ยอดของรหัสเหล่านี้ยังไม่เข้ารายงานเบิก — กรุณาตรวจและเปลี่ยนสถานะเป็น "ใช้งาน"');
    }

    html += '<div class="card"><div class="card-head"><h3>รายการรหัส</h3><div class="spacer"></div>' +
      '<input placeholder="ค้นหา" style="width:180px" oninput="filterTable(\'tDf\',this.value)">' +
      '<button class="btn-primary btn-sm" onclick="saveDf()">บันทึกการเปลี่ยนแปลง</button></div>' +
      '<div class="tw"><table id="tDf" class="tight"><thead><tr><th>รหัส</th><th>ชื่อรายการ</th>' +
      '<th>ประเภท</th><th style="width:150px">หน่วยที่เบิก</th><th style="width:130px">สถานะ</th>' +
      '<th class="num">พบ (รายการ)</th><th>พบล่าสุด</th></tr></thead><tbody>';
    D.dfCodes.forEach(function (c) {
      var pend = c.status !== 'active';
      html += '<tr' + (pend ? ' class="flagged"' : '') + '>' +
        '<td class="mono bold">' + esc(c.code) + '</td>' +
        '<td><input class="dfLbl" data-code="' + esc(c.code) + '" value="' + esc(c.label) +
        '" style="min-width:200px"></td>' +
        '<td class="small muted">' + esc(c.typeTh || c.type) + '</td>' +
        '<td><select class="dfGrp" data-code="' + esc(c.code) + '">' +
        ['DR', 'ANC', 'DN', 'VTH', 'XRAY', 'WAIT'].map(function (g) {
          var nm = { DR: 'แพทย์ทั่วไป', ANC: 'ศูนย์สาขา/ฝากครรภ์', DN: 'ทันตกรรม',
                     VTH: 'แพทย์แผนไทย', XRAY: 'รังสีวิทยา', WAIT: 'รอจัดกลุ่ม' }[g];
          return '<option value="' + g + '"' + (c.grp === g ? ' selected' : '') + '>' + nm + '</option>';
        }).join('') + '</select></td>' +
        '<td><select class="dfStat" data-code="' + esc(c.code) + '">' +
        '<option value="active"' + (c.status === 'active' ? ' selected' : '') + '>ใช้งาน</option>' +
        '<option value="pending"' + (c.status === 'pending' ? ' selected' : '') + '>รอยืนยัน</option>' +
        '<option value="off"' + (c.status === 'off' ? ' selected' : '') + '>ปิดใช้</option>' +
        '</select></td>' +
        '<td class="num">' + N(c.items) + '</td>' +
        '<td class="small muted nowrap">' + (c.lastSeen ? dTh(c.lastSeen) : '—') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};

function saveDf() {
  var codes = {};
  [].forEach.call(document.querySelectorAll('.dfLbl'), function (x) {
    codes[x.dataset.code] = { code: x.dataset.code, label: x.value };
  });
  [].forEach.call(document.querySelectorAll('.dfGrp'), function (x) {
    codes[x.dataset.code].grp = x.value;
  });
  [].forEach.call(document.querySelectorAll('.dfStat'), function (x) {
    codes[x.dataset.code].status = x.value;
  });
  var rows = Object.keys(codes).map(function (k) { return codes[k]; });
  api('saveDfCodes', { rows: rows }, { write: true })
    .then(function (r) {
      toast('บันทึก ' + N(r.saved) + ' รหัส' + (r.note ? ' · ' + r.note : ''), 'ok', 9000);
      go('dfcodes');
    })
    .catch(function (e) { toast(e.message, 'bad', 9000); });
}

/* ═══════════════════════════════════════════════════════
   กฎจัดกลุ่มการเบิก
   ═══════════════════════════════════════════════════════ */
ROUTES.groups = function () {
  loading('กำลังโหลดกฎจัดกลุ่ม');
  api('getRegistry', { kind: 'grouprules' }).then(function (D) {
    S.cache.groupRules = D.groupRules;
    S.cache.groupList = D.groups;
    var html = '<div class="card-head"><h1 style="margin:0">กฎจัดกลุ่มการเบิก</h1>' +
      '<div class="spacer"></div><span class="small muted">' + N(D.groupRules.length) +
      ' กฎ</span></div>';

    html += note('info', '<b>ลำดับที่ระบบใช้ตัดสิน</b> (ข้อที่พบก่อนชนะ)<br>' +
      '1. กลุ่มที่ระบบโรงพยาบาลส่งมาตรง ๆ<br>' +
      '2. กฎรายแพทย์ — ใช้เมื่อแพทย์ท่านนั้นออกตรวจที่หน่วยเดียวตลอด<br>' +
      '3. <b>หน่วยที่คีย์รายการ (ref_location)</b> — ฟิลด์ที่ฝ่ายไอทีเพิ่มให้ ใช้บ่อยที่สุด<br>' +
      '4. กฎรายรหัสค่าธรรมเนียม<br>' +
      '5. กฎรายฝ่าย<br>' +
      'ถ้าไม่เข้าข้อใดเลย รายการจะเป็น "รอจัดกลุ่ม" และ<b>ไม่ถูกนับเข้ายอดเบิกของหน่วยใด</b> ' +
      'เพื่อกันเงินเข้าผิดรหัสรายได้');

    html += '<div class="card"><div class="card-head"><h3>กฎที่ใช้อยู่</h3><div class="spacer"></div>' +
      '<button class="btn-sm" onclick="addRule()">เพิ่มกฎ</button>' +
      '<button class="btn-primary btn-sm" onclick="saveRules()">บันทึก</button></div>' +
      '<div class="tw"><table class="tight" id="tRules"><thead><tr><th style="width:170px">ชนิดกฎ</th>' +
      '<th>ค่าที่ตรงกัน</th><th style="width:200px">จัดเข้าหน่วย</th><th>หมายเหตุ</th>' +
      '<th style="width:50px"></th></tr></thead><tbody id="rulesBody"></tbody></table></div>' +
      '<div class="hint">ค่าที่ตรงกันของชนิด "หน่วยที่คีย์" ใช้การเทียบแบบ <b>มีคำนี้อยู่ข้างใน</b> ' +
      'เช่น ใส่ "ศูนย์ฯแหลมฉบัง" จะจับ "ฝากครรภ์นอกเวลา (ศูนย์ฯแหลมฉบัง)" ได้</div></div>';

    if (isAdmin()) {
      html += '<div class="card"><h3>ตรวจค่าที่ระบบโรงพยาบาลส่งมา</h3>' +
        '<div class="small muted" style="margin-bottom:10px">ดูว่าฟิลด์ ref_location ' +
        'ส่งค่าอะไรมาจริง และค่าใดยังไม่มีกฎรองรับ</div>' +
        '<div class="toolbar"><label class="f"><span>วันที่</span>' +
        '<input type="date" id="tstDate" value="' + shiftDay(today(), -1) + '"></label>' +
        '<button class="btn-primary" onclick="testApiNow()">ตรวจ</button></div>' +
        '<div id="tstOut"></div></div>';
    }
    V(html);
    drawRules();
  }).catch(showErr);
};

var RULE_KINDS = { clinic: 'หน่วยที่คีย์ (ref_location)', doctor: 'รายแพทย์',
                   code: 'รายรหัสค่าธรรมเนียม', dept: 'รายฝ่าย' };

function drawRules() {
  var rows = S.cache.groupRules || [];
  var gl = S.cache.groupList || [];
  var html = '';
  rows.forEach(function (r, ix) {
    html += '<tr><td><select class="rK">' +
      Object.keys(RULE_KINDS).map(function (k) {
        return '<option value="' + k + '"' + (r.kind === k ? ' selected' : '') + '>' +
               RULE_KINDS[k] + '</option>';
      }).join('') + '</select></td>' +
      '<td><input class="rM" value="' + esc(r.match) + '"></td>' +
      '<td><select class="rG">' + gl.map(function (g) {
        return '<option value="' + g.code + '"' + (r.grp === g.code ? ' selected' : '') + '>' +
               esc(g.name) + '</option>';
      }).join('') + '</select></td>' +
      '<td><input class="rN" value="' + esc(r.note || '') + '"></td>' +
      '<td><button class="btn-sm" onclick="delRule(' + ix + ')">ลบ</button></td></tr>';
  });
  document.getElementById('rulesBody').innerHTML = html ||
    '<tr><td colspan="5" class="muted center">ยังไม่มีกฎ</td></tr>';
}
function addRule() {
  S.cache.groupRules = readRules();
  S.cache.groupRules.push({ kind: 'clinic', match: '', grp: 'ANC', note: '' });
  drawRules();
}
function delRule(ix) {
  S.cache.groupRules = readRules();
  S.cache.groupRules.splice(ix, 1);
  drawRules();
}
function readRules() {
  var ks = document.querySelectorAll('.rK'), ms = document.querySelectorAll('.rM');
  var gs = document.querySelectorAll('.rG'), ns = document.querySelectorAll('.rN');
  var out = [];
  for (var i = 0; i < ks.length; i++) {
    out.push({ kind: ks[i].value, match: ms[i].value.trim(), grp: gs[i].value, note: ns[i].value });
  }
  return out;
}
function saveRules() {
  var rows = readRules().filter(function (r) { return r.match; });
  api('saveGroupRules', { rows: rows }, { write: true })
    .then(function (r) { toast('บันทึก ' + N(r.saved) + ' กฎ · ' + r.note, 'ok', 9000); go('groups'); })
    .catch(function (e) { toast(e.message, 'bad', 9000); });
}

function testApiNow() {
  var out = document.getElementById('tstOut');
  out.innerHTML = '<div class="loading"><span class="spin"></span>กำลังเรียก API</div>';
  api('testApi', { date: mv('tstDate') }).then(function (r) {
    var h = '<div class="small"><b>' + N(r.rows) + ' รายการ</b> · ตอบใน ' + N(r.ms) +
      ' มิลลิวินาที<br><span class="mono tiny">' + esc(r.url) + '</span></div>';
    h += '<div style="margin-top:10px">' +
      (r.extraFieldsReady.length ? tag('ฟิลด์พร้อม: ' + r.extraFieldsReady.join(', '), 'ok') : '') + ' ' +
      (r.extraFieldsMissing.length ? tag('ยังไม่มา: ' + r.extraFieldsMissing.join(', '), 'warn') : '') +
      '</div>';
    h += note(r.refLocation.filled ? 'info' : 'warn', esc(r.locNote));
    if (r.refLocation.distinct && r.refLocation.distinct.length) {
      h += '<div class="tw"><table class="tight"><thead><tr><th>ค่าที่ส่งมา (ref_location)</th>' +
        '<th class="num">รายการ</th><th>จัดเข้าหน่วย</th><th></th></tr></thead><tbody>';
      r.refLocation.distinct.forEach(function (d) {
        var no = d.grp === 'ยังไม่มีกฎ';
        h += '<tr' + (no ? ' class="flagged"' : '') + '><td>' + esc(d.value) + '</td>' +
          '<td class="num">' + N(d.rows) + '</td>' +
          '<td>' + (no ? tag('ยังไม่มีกฎ', 'warn') : tag(d.grp, 'ok')) + '</td>' +
          '<td>' + (no ? '<button class="btn-sm" onclick="quickRule(' +
            JSON.stringify(JSON.stringify(d.value)).replace(/"/g, '&quot;') + ')">ตั้งกฎ</button>' : '') +
          '</td></tr>';
      });
      h += '</tbody></table></div>';
    }
    out.innerHTML = h;
  }).catch(function (e) { out.innerHTML = note('bad', esc(e.message)); });
}
function quickRule(json) {
  var v = JSON.parse(json);
  S.cache.groupRules = readRules();
  S.cache.groupRules.push({ kind: 'clinic', match: v, grp: 'ANC', note: 'เพิ่มจากหน้าตรวจ API' });
  drawRules();
  toast('เพิ่มกฎในตารางแล้ว — ตรวจหน่วยที่จัดเข้าให้ถูก แล้วกดบันทึก', 'info', 8000);
  window.scrollTo(0, 0);
}

/* ═══════════════════════════════════════════════════════
   ตั้งค่าระบบ
   ═══════════════════════════════════════════════════════ */
var SET_GROUPS = [
  { t: 'แหล่งข้อมูลจากระบบโรงพยาบาล', keys: [
    ['apiBase', 'ที่อยู่ API', 'text'], ['apiReport', 'ชื่อรายงาน', 'text'],
    ['apiToken', 'โทเคน (ถ้าฝ่ายไอทีล็อก API)', 'password'],
    ['nightlyBackDays', 'ดึงทับย้อนหลังทุกคืน (วัน)', 'number'] ] },
  { t: 'การเข้าใช้งานของแพทย์ผ่านระบบ HIS', keys: [
    ['hisVerifyUrl', 'ที่อยู่ API ตรวจรหัสผู้ใช้ HIS (ต้องเป็น https)', 'text'],
    ['hisAutoCreate', 'สร้างบัญชีแพทย์ให้เองเมื่อ HIS ยืนยันตัวตนแล้ว', 'onoff'] ] },
  { t: 'การคิดค่าตอบแทน ⚠ กระทบเงิน', keys: [
    ['sharePct', 'สัดส่วนส่วนแพทย์ (0.8 = 80%)', 'text'],
    ['baseField', 'ฐานคิดค่าตอบแทน', 'text'],
    ['ruleModeDR', 'กติกาตัด DF แพทย์ทั่วไป', 'rule'],
    ['ruleFromDR', 'เริ่มใช้กติกาตั้งแต่วันที่', 'date'],
    ['ruleModeANC', 'กติกาตัด DF ศูนย์สาขา', 'rule'],
    ['ruleFromANC', 'เริ่มใช้กติกาตั้งแต่วันที่', 'date'] ] },
  { t: 'รหัสรายได้สำหรับไฟล์นำเข้า HRMi ⚠ กระทบเงิน', keys: [
    ['splitIncomeByGroup', 'แยกรหัสรายได้ตามหน่วย', 'onoff'],
    ['incomeDRPay', 'แพทย์ทั่วไป · ส่วนแพทย์ 80%', 'text'],
    ['incomeDRHos', 'แพทย์ทั่วไป · ส่วนโรงพยาบาล 20%', 'text'],
    ['incomeANCPay', 'ศูนย์สาขา · ส่วนแพทย์ 80%', 'text'],
    ['incomeANCHos', 'ศูนย์สาขา · ส่วนโรงพยาบาล 20%', 'text'],
    ['jobCode', 'รหัสงาน', 'text'], ['idCardField', 'ช่องเลขบัตรประชาชน', 'text'] ] },
  { t: 'รอบเบิกและการตกเบิก', keys: [
    ['submitByDay', 'ส่งฝ่ายบริหารงานบุคคลไม่เกินวันที่', 'number'],
    ['recheckDays', 'ย้อนตรวจยอดที่เปลี่ยนหลังปิดรอบ (วัน)', 'number'],
    ['mergeViewAllGroups', 'หน้าจอรายงานรวมยอดทุกหน่วย', 'onoff'],
    ['notifyEmail', 'อีเมลรับแจ้งเตือนรอบเบิก', 'text'] ] },
  { t: 'สัญญา 40(6)', keys: [
    ['contractCheck', 'ตรวจสัญญาอัตโนมัติ', 'onoff'],
    ['contractAction', 'เมื่อไม่พบสัญญา', 'contract'],
    ['doctorCanDownloadContract', 'ให้แพทย์ดาวน์โหลดสัญญาเองได้', 'yn'] ] },
  { t: 'เอกสารและผู้ลงนาม', keys: [
    ['reportTitle', 'ชื่อรายงาน', 'text'],
    ['signer1Label', 'ตำแหน่งผู้ลงนามช่องที่ 1', 'text'],
    ['signer1Name', 'ชื่อผู้ลงนามช่องที่ 1', 'text'],
    ['signer1Title', 'ตำแหน่งใต้ชื่อช่องที่ 1', 'text'],
    ['signer2Label', 'ข้อความรับรองช่องที่ 2', 'text'],
    ['signer2Name', 'ชื่อผู้ลงนามช่องที่ 2', 'text'],
    ['signer2Title', 'ตำแหน่งใต้ชื่อช่องที่ 2', 'text'],
    ['printQc', 'บันทึกว่าใครสั่งพิมพ์ใบแจ้งยอด', 'onoff'],
    ['contactLine', 'ข้อความติดต่อท้ายเอกสาร', 'text'] ] }
];

ROUTES.settings = function () {
  loading('กำลังโหลดค่าตั้งค่า');
  api('getSettings').then(function (D) {
    var st = D.settings;
    var html = '<div class="card-head"><h1 style="margin:0">ตั้งค่าระบบ</h1>' +
      '<div class="spacer"></div><span class="small muted">รุ่น ' +
      esc(D.meta ? D.meta.buildTh : '') + '</span></div>';

    (D.warn || []).forEach(function (w) { html += note('warn', esc(w)); });

    SET_GROUPS.forEach(function (G) {
      html += '<div class="card"><h3>' + esc(G.t) + '</h3>';
      G.keys.forEach(function (k) {
        var key = k[0], lbl = k[1], type = k[2];
        var v = st[key] === undefined ? '' : String(st[key]);
        html += '<label class="f"><span>' + esc(lbl) + '</span>';
        if (type === 'onoff') {
          html += '<select class="sv" data-k="' + key + '">' +
            '<option value="on"' + (v === 'on' ? ' selected' : '') + '>เปิด</option>' +
            '<option value="off"' + (v === 'off' ? ' selected' : '') + '>ปิด</option></select>';
        } else if (type === 'yn') {
          html += '<select class="sv" data-k="' + key + '">' +
            '<option value="Y"' + (v === 'Y' ? ' selected' : '') + '>ได้</option>' +
            '<option value="N"' + (v === 'N' ? ' selected' : '') + '>ไม่ได้</option></select>';
        } else if (type === 'rule') {
          html += '<select class="sv" data-k="' + key + '">' +
            '<option value="off"' + (v === 'off' ? ' selected' : '') + '>จ่ายทุกรายการ (ใช้อยู่)</option>' +
            '<option value="A"' + (v === 'A' ? ' selected' : '') + '>จ่ายสูงสุดอันเดียวต่อผู้ป่วยต่อวัน</option>' +
            '<option value="B"' + (v === 'B' ? ' selected' : '') + '>จ่ายสูงสุดประเภทละ 1 ต่อผู้ป่วยต่อวัน</option>' +
            '</select>';
        } else if (type === 'contract') {
          html += '<select class="sv" data-k="' + key + '">' +
            '<option value="flag"' + (v === 'flag' ? ' selected' : '') + '>ขึ้นธงเตือน แต่ยังจ่าย</option>' +
            '<option value="hold"' + (v === 'hold' ? ' selected' : '') + '>ระงับจ่ายไว้ก่อน</option>' +
            '</select>';
        } else {
          html += '<input class="sv" data-k="' + key + '" type="' +
            (type === 'password' ? 'password' : type === 'number' ? 'number' : type === 'date' ? 'date' : 'text') +
            '" value="' + esc(v) + '">';
        }
        html += '</label>';
      });
      html += '</div>';
    });

    html += '<div class="card"><div class="card-head"><h3>ตรวจความพร้อมของระบบ</h3>' +
      '<div class="spacer"></div><button onclick="runHealth(this)">ตรวจเดี๋ยวนี้</button></div>' +
      '<div class="small muted">ตรวจตาราง ค่าตั้งค่า โฟลเดอร์ กุญแจเข้ารหัส ทริกเกอร์ ' +
      'และการเชื่อมต่อ API ของระบบโรงพยาบาล</div><div id="hcOut"></div></div>';

    html += '<div class="card"><h3>บันทึกการตั้งค่า</h3>' +
      note('warn', 'ค่าที่กระทบยอดเงิน (สัดส่วน 80/20 · ฐานคิด · กติกาตัด DF · รหัสรายได้) ' +
        'ต้องยืนยันรหัสผ่าน และต้องกดคำนวณรอบที่ยังไม่ปิดใหม่ก่อนออกไฟล์เบิก') +
      '<label class="f"><span>รหัสผ่านของท่าน (กรอกเมื่อแก้ค่าที่กระทบเงิน)</span>' +
      '<input id="setPass" type="password"></label>' +
      '<div class="btn-row"><button class="btn-primary" onclick="saveSettings()">บันทึกการตั้งค่า</button>' +
      '<button onclick="go(\'settings\')">ยกเลิกการแก้ไข</button></div><div id="setErr"></div></div>';
    V(html);
  }).catch(showErr);
};

function saveSettings() {
  var patch = {};
  [].forEach.call(document.querySelectorAll('.sv'), function (x) { patch[x.dataset.k] = x.value; });
  api('saveSettings', { settings: patch, pass: mv('setPass') }, { write: true })
    .then(function (r) {
      toast(r.note || 'บันทึกแล้ว', r.moneyChanged.length ? 'warn' : 'ok', 11000);
      go('settings');
    })
    .catch(function (e) { document.getElementById('setErr').innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════════════════════════════════════════════
   ผู้ใช้งาน
   ═══════════════════════════════════════════════════════ */
ROUTES.users = function () {
  loading('กำลังโหลดรายชื่อผู้ใช้');
  api('listUsers').then(function (D) {
    S.cache.users = D;
    var html = '<div class="card-head"><h1 style="margin:0">ผู้ใช้งานระบบ</h1>' +
      '<div class="spacer"></div>' +
      '<button class="btn-primary btn-sm" onclick="editUser()">เพิ่มผู้ใช้</button></div>';

    html += note('info', '<b>บทบาท</b> · ผู้ดูแลระบบ = ทำได้ทุกอย่าง · ' +
      'ฝ่ายบริหารงานบุคคล = ตัดรอบ ออกเอกสาร แก้ทะเบียน · ' +
      'ฝ่ายบัญชี = บันทึกผลการเรียกเก็บและตัดหนี้เสีย · ' +
      'หัวหน้าฝ่าย = ดูได้เฉพาะแพทย์ในฝ่ายของตน · ' +
      'แพทย์ = ดูได้เฉพาะยอดของตนเอง<br>' +
      'ระบบกรองข้อมูลที่หลังบ้านตามบทบาท ไม่ใช่เพียงซ่อนปุ่มในหน้าเว็บ');

    html += '<div class="card"><div class="tw"><table class="tight"><thead><tr><th>รหัสพนักงาน</th>' +
      '<th>ชื่อ - สกุล</th><th>บทบาท</th><th>ผูกรหัสแพทย์</th><th>ฝ่าย</th>' +
      '<th>สถานะ</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>';
    D.rows.forEach(function (u) {
      html += '<tr><td class="mono">' + esc(u.empCode) + '</td><td>' + esc(u.name || '—') + '</td>' +
        '<td class="small">' + esc(u.roleTh) + '</td>' +
        '<td class="mono">' + esc(u.dct || '—') + '</td>' +
        '<td class="small">' + esc(u.dept || '—') + '</td>' +
        '<td>' + (u.active === 'N' ? tag('ปิดใช้', 'bad')
                  : u.locked ? tag('ถูกล็อก', 'bad')
                  : u.mustChange ? tag('ต้องตั้งรหัสใหม่', 'warn') : tag('ใช้งานได้', 'ok')) +
        '</td><td class="small muted">' + esc(u.lastLogin || '—') + '</td>' +
        '<td class="nowrap"><button class="btn-sm" onclick="editUser(\'' + esc(u.empCode) + '\')">แก้</button> ' +
        '<button class="btn-sm" onclick="resetPass(\'' + esc(u.empCode) + '\')">ตั้งรหัสใหม่</button></td></tr>';
    });
    html += '</tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};

function editUser(code) {
  var D = S.cache.users;
  var u = code ? D.rows.filter(function (x) { return String(x.empCode) === String(code); })[0] : null;
  modal(u ? 'แก้ไขผู้ใช้ ' + code : 'เพิ่มผู้ใช้ใหม่',
    '<label class="f"><span>รหัสพนักงาน / รหัสผู้ใช้</span>' +
    '<input id="uCode" value="' + esc(u ? u.empCode : '') + '"' + (u ? ' readonly' : '') + '></label>' +
    '<label class="f"><span>ชื่อ - สกุล</span><input id="uName" value="' +
    esc(u ? u.name : '') + '"></label>' +
    '<label class="f"><span>ตำแหน่ง</span><input id="uTitle" value="' +
    esc(u ? u.title : '') + '"></label>' +
    '<label class="f"><span>บทบาท (เลือกได้มากกว่าหนึ่ง)</span>' +
    D.roles.map(function (r) {
      var on = u && u.roles.indexOf(r.code) >= 0;
      return '<label style="display:flex;gap:8px;align-items:center;margin:3px 0;font-weight:400">' +
        '<input type="checkbox" class="uRole" value="' + r.code + '"' + (on ? ' checked' : '') +
        ' style="width:auto"><span>' + esc(r.name) + '</span></label>';
    }).join('') + '</label>' +
    '<div class="f-row">' +
    '<label class="f"><span>ผูกรหัสแพทย์ (สำหรับบทบาทแพทย์)</span>' +
    '<input id="uDct" value="' + esc(u ? u.dct : '') + '"></label>' +
    '<label class="f"><span>ฝ่าย (สำหรับหัวหน้าฝ่าย)</span>' +
    '<input id="uDept" value="' + esc(u ? u.dept : '') + '"></label></div>' +
    (u ? '<label class="f"><span>สถานะ</span><select id="uActive">' +
         '<option value="Y"' + (u.active !== 'N' ? ' selected' : '') + '>ใช้งานได้</option>' +
         '<option value="N"' + (u.active === 'N' ? ' selected' : '') + '>ปิดใช้</option></select></label>'
       : '<label class="f"><span>รหัสผ่านเริ่มต้น (ผู้ใช้ต้องเปลี่ยนเมื่อเข้าครั้งแรก)</span>' +
         '<input id="uPass" value=""></label>') +
    '<div id="uErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="saveUser()">บันทึก</button>');
}
function saveUser() {
  var roles = [].map.call(document.querySelectorAll('.uRole:checked'), function (x) { return x.value; });
  var err = document.getElementById('uErr');
  if (!roles.length) { err.innerHTML = note('bad', 'กรุณาเลือกบทบาทอย่างน้อยหนึ่งอย่าง'); return; }
  var d = {
    empCode: mv('uCode'), name: mv('uName'), title: mv('uTitle'),
    roles: roles, dct: mv('uDct'), dept: mv('uDept')
  };
  if (document.getElementById('uActive')) d.active = mv('uActive');
  if (document.getElementById('uPass')) d.pass = mv('uPass');
  if (roles.indexOf('doctor') >= 0 && !d.dct) {
    err.innerHTML = note('bad', 'บทบาทแพทย์ต้องผูกรหัสแพทย์ ไม่งั้นระบบไม่รู้ว่าจะแสดงยอดของใคร');
    return;
  }
  api('saveUser', { data: d }, { write: true })
    .then(function (r) {
      closeModal();
      toast('บันทึกแล้ว' + (r && r.pass ? ' · รหัสผ่านเริ่มต้น: ' + r.pass : ''), 'ok', 12000);
      go('users');
    })
    .catch(function (e) { err.innerHTML = note('bad', esc(e.message)); });
}
function resetPass(code) {
  modal('ตั้งรหัสผ่านใหม่ให้ ' + code,
    note('warn', 'ผู้ใช้จะต้องเปลี่ยนรหัสผ่านเองเมื่อเข้าใช้งานครั้งถัดไป · ' +
      'ระบบบันทึกไว้ว่าใครสั่งตั้งรหัสใหม่') +
    '<label class="f"><span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</span>' +
    '<input id="rpNew" value=""></label><div id="rpErr"></div>',
    '<button onclick="closeModal()">ยกเลิก</button>' +
    '<button class="btn-primary" onclick="doResetPass(\'' + esc(code) + '\')">ตั้งรหัสใหม่</button>');
}
function doResetPass(code) {
  api('resetPass', { empCode: code, pass: mv('rpNew') }, { write: true })
    .then(function () { closeModal(); toast('ตั้งรหัสผ่านใหม่เรียบร้อย', 'ok'); go('users'); })
    .catch(function (e) { document.getElementById('rpErr').innerHTML = note('bad', esc(e.message)); });
}

/* ═══════════════════════════════════════════════════════
   ประวัติการใช้งาน
   ═══════════════════════════════════════════════════════ */
ROUTES.logs = function (kind) {
  kind = kind || 'audit';
  loading('กำลังโหลดประวัติ');
  api('getLogs', { kind: kind, limit: 300 }).then(function (D) {
    var tabs = [['audit', 'การแก้ไขข้อมูล'], ['print', 'การออกเอกสาร'], ['fetch', 'การดึงข้อมูล']];
    var html = '<div class="card-head"><h1 style="margin:0">ประวัติการใช้งาน</h1>' +
      '<div class="spacer"></div><span class="small muted">ทั้งหมด ' + N(D.total) + ' รายการ · ' +
      'แสดง ' + N(D.rows.length) + ' รายการล่าสุด</span></div>';
    html += '<div class="btn-row" style="margin-bottom:12px">' +
      tabs.map(function (t) {
        return '<button class="' + (t[0] === kind ? 'btn-primary' : '') +
               '" onclick="go(\'logs\',\'' + t[0] + '\')">' + t[1] + '</button>';
      }).join('') + '</div>';

    html += note('info', 'ระบบบันทึกทุกการเปลี่ยนแปลงที่กระทบยอดเงิน พร้อมผู้ทำและเวลา ' +
      'เพื่อให้ตรวจย้อนได้เมื่อมีข้อสงสัยเรื่องยอด');

    var cols = kind === 'print'
      ? [['at', 'เวลา'], ['by', 'ผู้ทำ'], ['kind', 'ประเภท'], ['target', 'เป้าหมาย'],
         ['ym', 'รอบ'], ['detail', 'รายละเอียด']]
      : kind === 'fetch'
      ? [['at', 'เวลา'], ['range', 'ช่วงวันที่'], ['rows', 'จำนวนแถว'], ['status', 'ผล'],
         ['detail', 'รายละเอียด']]
      : [['at', 'เวลา'], ['by', 'ผู้ทำ'], ['role', 'บทบาท'], ['action', 'การกระทำ'],
         ['target', 'เป้าหมาย'], ['detail', 'รายละเอียด']];

    html += '<div class="card"><div class="card-head"><div class="spacer"></div>' +
      '<input placeholder="ค้นหา" style="width:200px" oninput="filterTable(\'tLog\',this.value)"></div>' +
      '<div class="tw"><table id="tLog" class="tight"><thead><tr>' +
      cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + '</tr></thead><tbody>';
    D.rows.forEach(function (r) {
      html += '<tr>' + cols.map(function (c) {
        var v = r[c[0]];
        if (c[0] === 'status') {
          return '<td>' + tag(v === 'ok' ? 'สำเร็จ' : 'ผิดพลาด', v === 'ok' ? 'ok' : 'bad') + '</td>';
        }
        return '<td class="small' + (c[0] === 'at' ? ' nowrap muted' : '') + '">' + esc(v) + '</td>';
      }).join('') + '</tr>';
    });
    html += '</tbody></table></div></div>';
    V(html);
  }).catch(showErr);
};


/* ═══════════════ ตรวจความพร้อมของระบบ ═══════════════ */
function runHealth(btn) {
  var out = document.getElementById('hcOut');
  btn.disabled = true;
  out.innerHTML = '<div class="loading"><span class="spin"></span>กำลังตรวจ</div>';
  api('health').then(function (r) {
    btn.disabled = false;
    var h = note(r.ok ? 'ok' : 'bad',
      r.ok ? 'ระบบพร้อมใช้งาน · ตรวจผ่านทุกข้อ' : 'พบข้อที่ยังไม่พร้อม กรุณาแก้ตามรายการด้านล่าง');
    (r.warn || []).forEach(function (w) { h += note('warn', esc(w)); });
    h += '<div class="tw"><table class="tight"><tbody>';
    r.checks.forEach(function (c) {
      h += '<tr><td style="width:34px">' + (c.ok ? '<span style="color:var(--ok)">✓</span>'
                                                 : '<span style="color:var(--danger)">✕</span>') +
        '</td><td>' + esc(c.name) + '</td><td class="small muted">' + esc(c.detail) + '</td></tr>';
    });
    h += '</tbody></table></div>' +
      '<div class="tiny muted" style="margin-top:6px">ตรวจเมื่อ ' + esc(r.at) +
      ' · รุ่น ' + esc(r.build) + '</div>';
    out.innerHTML = h;
  }).catch(function (e) {
    btn.disabled = false;
    out.innerHTML = note('bad', esc(e.message));
  });
}
