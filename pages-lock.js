/* SMC MD — pages-lock.js (รุ่น 2569-10-28.1)
 * ล็อกชื่อแพทย์ผู้รับ DF ตามรหัส DF (หัตถการ) + ช่วงวันที่ — เช่น ค่าพยาธิแพทย์ DF504 / DF5041
 *   · ตั้งได้ทีละหลายหัตถการ · ค้นหาแพทย์จากทะเบียนที่มีสัญญา 40(6) · ช่วงวันที่ห้ามทับกัน
 *   · วันไหนยังไม่ได้ตั้ง → รายการเป็น "รอตั้งชื่อแพทย์" ไม่จ่าย (แสดงช่วงที่ขาดให้กดตั้งได้ทันที)
 *   · แก้หลังปิดรอบ → ระบบสร้างตกเบิก/เรียกคืนให้เอง (ดูที่เมนูตกเบิก / เรียกคืน)
 *   · HR/แอดมินตั้งได้ · ฝ่ายบัญชีดูได้อย่างเดียว · ใช้งานบนมือถือได้
 */
S.lock = { ym: '', D: null, pick: null, codes: [] };

ROUTES.locks = function (arg) {
  var ym = /^\d{4}-\d{2}$/.test(String(arg || '')) ? String(arg) : (S.lock.ym || thisYm());
  S.lock.ym = ym;
  header('ล็อกชื่อแพทย์ DF', 'กำหนดว่าหัตถการไหน วันที่เท่าไรถึงเท่าไร จ่ายให้แพทย์ท่านใด — ไม่ว่าระบบโรงพยาบาลจะลงชื่อใครมา',
    '<label class="fld" style="margin:0;min-width:150px"><select id="lkYm" aria-label="รอบเดือน"><option value="' + ymAdd(thisYm(), 1) + '"' + (ym === ymAdd(thisYm(), 1) ? ' selected' : '') + '>' + ymTh(ymAdd(thisYm(), 1)) + ' (ล่วงหน้า)</option>' + ymOptions(ym, 13) + '</select></label>' + refreshBtn());
  document.getElementById('lkYm').onchange = function () { go('locks', this.value); };
  V('<div id="lkOut"></div>');
  document.getElementById('lkOut').innerHTML = '<div class="sk-msg"><span class="spin"></span>กำลังโหลดข้อมูล</div><div class="sk-kpis"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div><div class="sk sk-card"></div>';
  load('getLocks', { ym: ym }, function (D, meta) { S.lock.D = D; lockDraw(D, meta); }, { quiet: true, errTo: 'lkOut' });
};

function lockDraw(D, meta) {
  var act = D.locks.filter(function (l) { return l.status === 'active'; });
  var inMonth = act.filter(function (l) { return l.from.slice(0, 7) <= D.ym && l.to.slice(0, 7) >= D.ym; });
  var html = '<div class="btn-row" style="justify-content:space-between;margin-bottom:10px"><span class="small muted">รอบ ' + ymTh(D.ym) + '</span>' + freshBadge(meta) + '</div>';
  html += '<div class="kpis">' +
    kpi('รอตั้งชื่อแพทย์', N(D.waitItems) + '<small>รายการ</small>', D.waitItems ? B(D.waitTotal) + ' บาท ยังไม่จ่าย' : 'ครบทุกวันแล้ว', D.waitItems ? 'bad' : 'ok', D.waitItems ? 'alert' : 'check') +
    kpi('ล็อกที่มีผลในรอบนี้', N(inMonth.length), 'ทั้งหมด ' + N(act.length) + ' ล็อก', 'hero', 'lock') +
    kpi('หัตถการที่ต้องล็อก', N(D.codes.length), esc(D.codes.join(' · ') || '—'), '', 'hash') + '</div>';

  /* ── วันที่ยังไม่ได้ตั้ง ── */
  if (D.gaps.length) {
    html += card('วันที่ยังไม่ได้ตั้งชื่อแพทย์', D.gaps.map(function (g) {
      return '<div class="lk-gap"><div><b class="mono">' + esc(g.code) + '</b> <span class="small muted">' + esc(D.codeNames[g.code] || '') + '</span>' +
        '<div class="small">' + N(g.items) + ' รายการ · ' + B(g.total) + ' บาท · วันที่ ' + g.dates.map(function (d) { return dTh(d); }).join(', ') + '</div></div>' +
        (D.canEdit ? '<button class="btn sm pri" onclick="lockForm({codes:[\'' + esc(g.code) + '\'],from:\'' + g.dates[0] + '\',to:\'' + g.dates[g.dates.length - 1] + '\'})">' + I('lock', 'sm') + 'ตั้งชื่อแพทย์ช่วงนี้</button>' : '') + '</div>';
    }).join(''), { icon: 'alert', cls: 'lk-alert', sub: 'รายการเหล่านี้ยังไม่จ่าย จนกว่าจะตั้งชื่อแพทย์ให้ครอบคลุมวันที่' });
  }

  /* ── ฟอร์มตั้งล็อก ── */
  if (D.canEdit) html += card('ตั้งล็อกใหม่', '<div id="lkForm"></div>', { icon: 'plus', sub: 'เลือกหัตถการ (เลือกได้หลายรหัส) → ค้นหาแพทย์ → ช่วงวันที่ → บันทึก' });
  else html += note('info', 'บัญชีของท่านดูได้อย่างเดียว · ผู้ตั้งล็อกได้คือ HR และผู้ดูแลระบบ');

  /* ── รายการล็อก ── */
  html += card('ล็อกทั้งหมด', '<div id="tLock"></div>', { icon: 'list', flush: true });

  /* ── ประวัติจ่ายจริง ── */
  if (D.history && D.history.length) {
    var by = {}, order = [];
    D.history.forEach(function (h) { var k = h[0] + '|' + h[2]; if (!by[k]) { by[k] = { ym: h[0], dct: h[2], name: h[3], codes: [] }; order.push(k); } by[k].codes.push(h[1]); });
    order.sort(function (a, b) { return a < b ? 1 : -1; });
    html += card('ประวัติผู้รับค่าพยาธิแพทย์ (จ่ายจริงปีงบ 2569)', '<div class="lk-hist">' + order.map(function (k) {
      var x = by[k];
      return '<div class="lk-h"><div><span class="tag">' + ymShort(x.ym) + '</span> <b>' + esc(x.name) + '</b><span class="sub mono">' + esc(x.dct) + ' · ' + esc(x.codes.join(', ')) + '</span></div>' +
        (D.canEdit ? '<button class="btn sm ghost" title="ใช้แพทย์ท่านนี้ในฟอร์ม" onclick="lockUseDoc(\'' + esc(x.dct) + '\')">' + I('copy', 'sm') + '<span class="lbl">ใช้ท่านนี้</span></button>' : '') + '</div>';
    }).join('') + '</div>', { icon: 'clock', fold: 'lkHist', sub: 'อ้างอิงจากไฟล์รวมการจ่ายจริง · ไม่ได้ตั้งล็อกให้เอง' });
  }

  /* ── รหัสที่ต้องล็อก ── */
  html += card('หัตถการที่ต้องล็อกชื่อแพทย์', '<p class="small muted" style="margin-top:0">รหัสในรายการนี้ ถ้าวันไหนไม่มีล็อก ระบบจะ "รอตั้งชื่อแพทย์" ไม่จ่ายให้ชื่อที่ระบบโรงพยาบาลส่งมา · เพิ่มรหัสได้ในอนาคต</p>' +
    '<div class="lk-codes" id="lkCodes"></div>' +
    (D.canEdit ? '<div class="frow" style="align-items:flex-end"><label class="fld" style="margin:0"><span>เพิ่มรหัส DF</span><input id="lkNewCode" placeholder="เช่น DF601" autocomplete="off" style="text-transform:uppercase"></label>' +
      '<button class="btn" onclick="lockCodeAdd()">' + I('plus', 'sm') + 'เพิ่ม</button><button class="btn pri" onclick="lockCodesSave()">' + I('check', 'sm') + 'บันทึกรายการรหัส</button></div>' : ''),
    { icon: 'hash', fold: 'lkCodesCard' });

  document.getElementById('lkOut').innerHTML = html;
  S.lock.codes = D.codes.slice();
  lockCodesDraw();
  if (D.canEdit) lockForm();
  TBL.make('tLock', { key: 'tLock', reset: true, rows: D.locks, exportName: 'ล็อกชื่อแพทย์DF', initial: { chip: 'act' },
    orders: [{ id: 'from', label: 'วันที่เริ่ม (ล่าสุดก่อน)', cmp: function (a, b) { return a.from < b.from ? 1 : a.from > b.from ? -1 : (a.code < b.code ? -1 : 1); } },
             { id: 'code', label: 'รหัส → วันที่', cmp: function (a, b) { return a.code < b.code ? -1 : a.code > b.code ? 1 : (a.from < b.from ? 1 : -1); } }],
    search: { placeholder: 'รหัส DF · ชื่อแพทย์ · หมายเหตุ', keys: ['code', 'dct', 'dctName', 'note'] },
    filters: [{ type: 'select', k: 'code', label: 'หัตถการ' }, { type: 'select', k: 'dctName', label: 'แพทย์' }],
    chips: [{ id: 'act', label: 'มีผล', fn: function (r) { return r.status === 'active'; } },
            { id: 'now', label: 'ครอบคลุมรอบ ' + ymShort(D.ym), fn: function (r) { return r.status === 'active' && r.from.slice(0, 7) <= D.ym && r.to.slice(0, 7) >= D.ym; } },
            { id: 'off', label: 'ยกเลิกแล้ว', fn: function (r) { return r.status !== 'active'; } }],
    rowCls: function (r) { return r.status === 'active' ? '' : 'dim'; },
    cols: [{ k: 'code', label: 'หัตถการ', render: function (r) { return '<b class="mono">' + esc(r.code) + '</b><span class="sub">' + esc(D.codeNames[r.code] || '') + '</span>'; } },
           { k: 'from', label: 'ช่วงวันที่', render: function (r) { return '<span class="nowrap">' + dTh(r.from) + ' – ' + dTh(r.to) + '</span><span class="sub">' + N(daysBetween(r.from, r.to) + 1) + ' วัน</span>'; } },
           { k: 'dctName', label: 'จ่ายให้แพทย์', render: function (r) { return esc(r.dctName) + '<span class="sub mono">' + esc(r.dct) + '</span>'; } },
           { k: 'note', label: 'หมายเหตุ', cls: 'small wrap' },
           { k: 'at', label: 'ตั้งโดย', cls: 'small nowrap', render: function (r) { return esc(r.by) + '<span class="sub">' + esc(r.at) + '</span>' + (r.updatedBy ? '<span class="sub">แก้ ' + esc(r.updatedBy) + ' · ' + esc(r.updatedAt) + '</span>' : ''); } },
           { k: 'x', label: '', sort: false, export: false, render: function (r) {
               if (r.status !== 'active') return tag('ยกเลิกแล้ว');
               return D.canEdit ? '<div class="btn-row nowrap"><button class="btn sm" onclick="event.stopPropagation();lockEdit(\'' + esc(r.id) + '\')">' + I('edit', 'sm') + '<span class="lbl">แก้</span></button>' +
                 '<button class="btn sm ghost" onclick="event.stopPropagation();lockDel(\'' + esc(r.id) + '\')">' + I('x', 'sm') + '<span class="lbl">ยกเลิก</span></button></div>' : tag('มีผล', 'ok'); } }] });
}

/* ───────── ฟอร์ม ───────── */
function lockForm(pre) {
  var D = S.lock.D, host = document.getElementById('lkForm');
  if (!D || !host) return;
  pre = pre || {};
  var codes = D.codes.slice();
  (pre.codes || []).forEach(function (c) { if (codes.indexOf(c) < 0) codes.push(c); });
  var sel = pre.codes || (pre.id ? [pre.code] : codes);
  var ym = D.ym, mEnd = monthEnd(ym);
  /* ไม่ระบุช่วง → ใช้ช่วงวันที่ที่ยังขาดของรอบนี้ (ถ้ามี) ไม่งั้นทั้งเดือน */
  var gapD = [].concat.apply([], (D.gaps || []).map(function (g) { return g.dates; })).sort();
  var from = pre.from || gapD[0] || ym + '-01', to = pre.to || (gapD.length ? gapD[gapD.length - 1] : mEnd);
  S.lock.pick = pre.dct ? D.doctors.filter(function (d) { return d.code === pre.dct; })[0] || null : (S.lock.pick || null);
  S.lock.editId = pre.id || '';
  host.innerHTML =
    (pre.id ? note('info', 'กำลังแก้ล็อก <b class="mono">' + esc(pre.code) + '</b> · ถ้ารอบนั้นปิดแล้ว ระบบจะสร้างตกเบิก/เรียกคืนให้ตรวจที่เมนูตกเบิก') : '') +
    '<div class="fld"><span>หัตถการ (รหัส DF)</span><div class="lk-pick" id="lkPickCodes">' + codes.map(function (c) {
      return '<label class="lk-chk"><input type="checkbox" value="' + esc(c) + '"' + (sel.indexOf(c) >= 0 ? ' checked' : '') + (pre.id ? ' disabled' : '') + '><span><b class="mono">' + esc(c) + '</b>' +
        (D.codeNames[c] ? '<small>' + esc(D.codeNames[c]) + '</small>' : '') + '</span></label>'; }).join('') + '</div></div>' +
    '<div class="fld"><span>แพทย์ผู้รับเงิน (ค้นหาจากทะเบียนที่มีสัญญา 40(6))</span>' +
      '<div class="lk-doc" id="lkDocBox"><input id="lkDocQ" placeholder="พิมพ์ชื่อ นามสกุล รหัส หรือฝ่าย เช่น พยาธิ" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="lkDocList">' +
      '<div class="lk-doc-list" id="lkDocList" role="listbox"></div></div><div id="lkDocSel"></div></div>' +
    '<div class="frow"><label class="fld"><span>ตั้งแต่วันที่</span><input type="date" id="lkFrom" value="' + esc(from) + '"></label>' +
      '<label class="fld"><span>ถึงวันที่</span><input type="date" id="lkTo" value="' + esc(to) + '"></label></div>' +
    '<div class="btn-row" style="margin:-4px 0 12px">' +
      [['ทั้งเดือน ' + ymShort(ym), ym + '-01', mEnd], ['1–15 ' + ymShort(ym), ym + '-01', ym + '-15'], ['16–สิ้นเดือน', ym + '-16', mEnd],
       ['ทั้งเดือน ' + ymShort(ymAdd(ym, 1)), ymAdd(ym, 1) + '-01', monthEnd(ymAdd(ym, 1))]].map(function (x) {
        return '<button type="button" class="btn sm ghost" onclick="lockSetRange(\'' + x[1] + '\',\'' + x[2] + '\')">' + esc(x[0]) + '</button>'; }).join('') + '</div>' +
    '<label class="fld"><span>หมายเหตุ (ไม่บังคับ)</span><input id="lkNote" value="' + esc(pre.note || '') + '" placeholder="เช่น ตามตารางพยาธิแพทย์ที่ฝ่ายพยาธิส่งมา"></label>' +
    '<div class="lk-sum" id="lkSum"></div>' +
    '<div class="btn-row"><button class="btn pri" id="lkSave" onclick="lockSave()">' + I('check', 'sm') + (pre.id ? 'บันทึกการแก้ไข' : 'บันทึกล็อก') + '</button>' +
      (pre.id ? '<button class="btn ghost" onclick="lockForm()">ยกเลิกการแก้</button>' : '') + '</div>';
  var q = document.getElementById('lkDocQ');
  q.addEventListener('input', lockDocSearch);
  q.addEventListener('focus', lockDocSearch);
  q.addEventListener('keydown', function (e) {
    var list = document.getElementById('lkDocList'), items = list.querySelectorAll('[data-dct]'), on = list.querySelector('.on'), i = [].indexOf.call(items, on);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!items.length) return; if (on) on.classList.remove('on'); i = e.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1); items[i].classList.add('on'); items[i].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); if (on) lockPickDoc(on.getAttribute('data-dct')); else if (items.length === 1) lockPickDoc(items[0].getAttribute('data-dct')); }
    else if (e.key === 'Escape') lockDocClose();
  });
  document.addEventListener('click', lockDocOutside);
  ['lkFrom', 'lkTo'].forEach(function (id) { document.getElementById(id).addEventListener('change', lockSum); });
  [].forEach.call(document.querySelectorAll('#lkPickCodes input'), function (x) { x.addEventListener('change', lockSum); });
  lockDocSelDraw();
  lockSum();
  if (pre.id || pre.codes) host.closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function lockDocOutside(e) { var b = document.getElementById('lkDocBox'); if (!b) { document.removeEventListener('click', lockDocOutside); return; } if (!b.contains(e.target)) lockDocClose(); }
function lockDocClose() { var l = document.getElementById('lkDocList'); if (l) { l.classList.remove('open'); document.getElementById('lkDocQ').setAttribute('aria-expanded', 'false'); } }
function lockDocSearch() {
  var D = S.lock.D, q = String(document.getElementById('lkDocQ').value || '').trim().toLowerCase(), list = document.getElementById('lkDocList');
  var pool = D.doctors.filter(function (d) { return d.contract; });
  var hits = !q ? pool.filter(function (d) { return /พยาธิ/.test(d.dept + d.specialty); })
                : pool.filter(function (d) { return (d.name + ' ' + d.code + ' ' + d.dept + ' ' + d.specialty).toLowerCase().indexOf(q) >= 0; });
  hits = hits.slice(0, 30);
  list.innerHTML = (!q ? '<div class="lk-doc-h">แนะนำ: แพทย์ฝ่ายพยาธิวิทยา · พิมพ์เพื่อค้นหาท่านอื่น</div>' : '') +
    (hits.length ? hits.map(function (d) {
      return '<button type="button" role="option" data-dct="' + esc(d.code) + '" onclick="lockPickDoc(\'' + esc(d.code) + '\')"><b>' + esc(d.name) + '</b><span class="mono">' + esc(d.code) + '</span><small>' + esc(d.dept || '') + (d.specialty ? ' · ' + esc(d.specialty) : '') + '</small></button>';
    }).join('') : '<div class="lk-doc-h">ไม่พบแพทย์ที่มีสัญญาตามคำค้น</div>');
  list.classList.add('open');
  document.getElementById('lkDocQ').setAttribute('aria-expanded', 'true');
}
function lockPickDoc(code) {
  S.lock.pick = S.lock.D.doctors.filter(function (d) { return d.code === code; })[0] || null;
  document.getElementById('lkDocQ').value = '';
  lockDocClose(); lockDocSelDraw(); lockSum();
}
function lockUseDoc(code) {
  var d = S.lock.D.doctors.filter(function (x) { return x.code === code; })[0];
  if (!d) return toast('ไม่พบรหัส ' + code + ' ในทะเบียน', 'warn');
  if (!d.contract) return toast(d.name + ' ยังไม่มีสัญญา 40(6) ในทะเบียน', 'warn');
  S.lock.pick = d; lockDocSelDraw(); lockSum();
  document.getElementById('lkForm').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  toast('เลือก ' + d.name + ' แล้ว · ตรวจช่วงวันที่ก่อนบันทึก', 'info');
}
function lockDocSelDraw() {
  var d = S.lock.pick, el = document.getElementById('lkDocSel');
  if (!el) return;
  el.innerHTML = d ? '<div class="lk-sel">' + I('user', 'sm') + '<div><b>' + esc(d.name) + '</b><span class="sub mono">' + esc(d.code) + ' · ' + esc(d.dept || '') + '</span>' +
    '<span class="sub">สัญญาเริ่ม ' + (d.contractStart ? dTh(d.contractStart) : '—') + (d.contractEnd ? ' · สิ้นสุด ' + dTh(d.contractEnd) : '') + '</span></div>' +
    '<button type="button" class="btn sm ghost" onclick="S.lock.pick=null;lockDocSelDraw();lockSum()" aria-label="ล้างแพทย์ที่เลือก">' + I('x', 'sm') + '</button></div>' : '<div class="hint">ยังไม่ได้เลือกแพทย์</div>';
}
function lockSetRange(f, t) { document.getElementById('lkFrom').value = f; document.getElementById('lkTo').value = t; lockSum(); }
function lockCodesPicked() { return [].map.call(document.querySelectorAll('#lkPickCodes input:checked'), function (x) { return x.value; }); }
/** สรุปก่อนบันทึก + เตือนช่วงทับ (ตรวจในเครื่องให้รู้ก่อน หลังบ้านตรวจซ้ำ) */
function lockSum() {
  var el = document.getElementById('lkSum'); if (!el) return;
  var cs = lockCodesPicked(), f = mv('lkFrom'), t = mv('lkTo'), d = S.lock.pick, msg = [];
  if (!cs.length) msg.push(note('warn', 'เลือกหัตถการอย่างน้อย 1 รหัส'));
  if (f && t && f > t) msg.push(note('bad', 'วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด'));
  var clash = [];
  S.lock.D.locks.forEach(function (l) {
    if (l.status !== 'active' || l.id === S.lock.editId || cs.indexOf(l.code) < 0) return;
    if (!(t < l.from || f > l.to)) clash.push(l);
  });
  if (clash.length) msg.push(note('bad', 'ช่วงวันที่ทับกับล็อกเดิม: ' + clash.map(function (l) { return '<b class="mono">' + esc(l.code) + '</b> ' + dTh(l.from) + '–' + dTh(l.to) + ' (' + esc(l.dctName) + ')'; }).join(' · ') + ' — แก้ช่วงเดิมก่อน หรือปรับวันที่'));
  if (d && cs.length && f && t && f <= t && !clash.length)
    msg.push(note('ok', 'จะจ่าย <b>' + esc(cs.join(', ')) + '</b> ระหว่าง <b>' + dTh(f) + ' – ' + dTh(t) + '</b> (' + N(daysBetween(f, t) + 1) + ' วัน) ให้ <b>' + esc(d.name) + '</b> ทุกรายการ ไม่ว่าระบบโรงพยาบาลจะลงชื่อใคร'));
  el.innerHTML = msg.join('');
  var b = document.getElementById('lkSave'); if (b) b.disabled = !(d && cs.length && f && t && f <= t && !clash.length);
}
function lockSave() {
  var cs = lockCodesPicked(), d = S.lock.pick, f = mv('lkFrom'), t = mv('lkTo');
  if (!d) return toast('ยังไม่ได้เลือกแพทย์', 'warn');
  var p = { codes: cs, from: f, to: t, dct: d.code, note: mv('lkNote') };
  if (S.lock.editId) { p.id = S.lock.editId; p.code = cs[0]; delete p.codes; }
  api('saveLock', p, { write: true, btnText: 'กำลังบันทึกและคำนวณใหม่' }).then(function (r) {
    toast(r.note || 'บันทึกแล้ว', (r.rebuilt || []).some(function (x) { return x.closed; }) ? 'warn' : 'ok', 9000);
    S.lock.pick = null; S.lock.editId = '';
    go('locks', S.lock.ym);
  }).catch(function (e) { toast(e.message, 'bad', 9000); });
}
function lockEdit(id) {
  var l = S.lock.D.locks.filter(function (x) { return x.id === id; })[0];
  if (l) lockForm({ id: l.id, code: l.code, from: l.from, to: l.to, dct: l.dct, note: l.note });
}
function lockDel(id) {
  var l = S.lock.D.locks.filter(function (x) { return x.id === id; })[0];
  if (!l) return;
  UI.dialog({ title: 'ยกเลิกล็อกนี้?', icon: 'alert', tone: 'warn', ok: 'ยกเลิกล็อก', okCls: 'danger',
    body: '<p><b class="mono">' + esc(l.code) + '</b> ' + dTh(l.from) + ' – ' + dTh(l.to) + ' → ' + esc(l.dctName) + '</p>' +
      note('warn', 'รายการในช่วงนี้จะกลับเป็น "รอตั้งชื่อแพทย์" (ไม่จ่าย) ถ้ารหัสนี้อยู่ในรายการที่ต้องล็อก · รอบที่ปิดแล้วจะเกิดเรียกคืน') +
      '<label class="fld"><span>เหตุผล</span><input id="lkDelWhy" placeholder="เช่น ตั้งผิดคน"></label><div class="dlg-err"></div>',
    onOk: function (el) {
      var why = mv('lkDelWhy'); if (why.length < 3) return dlgErr(el, 'กรุณาระบุเหตุผล');
      return api('deleteLock', { id: id, reason: why }, { write: true }).then(function (r) { toast(r.note || 'ยกเลิกแล้ว', 'ok', 8000); go('locks', S.lock.ym); })
        .catch(function (e) { return dlgErr(el, e.message); });
    } });
}
/* ───────── รายการรหัสที่ต้องล็อก ───────── */
function lockCodesDraw() {
  var el = document.getElementById('lkCodes'), D = S.lock.D; if (!el) return;
  el.innerHTML = S.lock.codes.length ? S.lock.codes.map(function (c) {
    return '<span class="lk-code"><b class="mono">' + esc(c) + '</b>' + (D.codeNames[c] ? '<small>' + esc(D.codeNames[c]) + '</small>' : '') +
      (D.canEdit ? '<button type="button" onclick="lockCodeDel(\'' + esc(c) + '\')" aria-label="เอา ' + esc(c) + ' ออก">' + I('x', 'sm') + '</button>' : '') + '</span>'; }).join('')
    : '<span class="small muted">ยังไม่มีรหัส — ทุกรหัสจ่ายตามชื่อที่ระบบโรงพยาบาลส่งมา</span>';
}
function lockCodeAdd() {
  var c = String(mv('lkNewCode') || '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9]+$/.test(c)) return toast('รหัสต้องเป็นตัวอักษรอังกฤษหรือตัวเลข เช่น DF601', 'warn');
  if (S.lock.codes.indexOf(c) < 0) S.lock.codes.push(c);
  document.getElementById('lkNewCode').value = '';
  lockCodesDraw();
  toast('เพิ่ม ' + c + ' แล้ว · กด "บันทึกรายการรหัส" เพื่อให้มีผล', 'info');
}
function lockCodeDel(c) { S.lock.codes = S.lock.codes.filter(function (x) { return x !== c; }); lockCodesDraw(); }
function lockCodesSave() {
  UI.confirm({ title: 'บันทึกรายการหัตถการที่ต้องล็อก?', body: '<p><b class="mono">' + esc(S.lock.codes.join(', ') || '(ไม่มี)') + '</b></p>' +
      note('warn', 'รหัสที่อยู่ในรายการ ถ้าวันไหนไม่มีล็อกจะไม่จ่าย · ระบบคำนวณรอบเดือนนี้และเดือนก่อนใหม่ให้'), ok: 'บันทึก' })
    .then(function (y) {
      if (!y) return;
      api('saveLockCodes', { codes: S.lock.codes }, { write: true }).then(function (r) { toast(r.note || 'บันทึกแล้ว', 'ok', 8000); go('locks', S.lock.ym); })
        .catch(function (e) { toast(e.message, 'bad', 9000); });
    });
}

/* ───────── จากหน้ารายงานที่ต้องตรวจสอบ: โอนตามแพทย์เจ้าของ visit ที่ระบบเสนอ ───────── */
function auditTransfer(caseId, toDct, toName, fromName) {
  UI.dialog({ title: 'โอน DF ให้แพทย์เจ้าของ visit?', icon: 'swap', ok: 'โอนรายการนี้',
    body: '<p>ระบบ รพ. ลงชื่อ <b>' + esc(fromName || '-') + '</b><br>โอนให้ <b>' + esc(toName || toDct) + '</b> <span class="mono">' + esc(toDct) + '</span></p>' +
      note('info', 'เป็นคำสั่งรายรายการ ยกเลิกได้ที่เมนู "DF ลงชื่อผิดคน"') +
      '<label class="fld"><span>เหตุผล</span><input id="atWhy" value="ผู้คีย์ไม่ใช่แพทย์ โอนให้แพทย์เจ้าของ visit"></label><div class="dlg-err"></div>',
    onOk: function (el) {
      var why = mv('atWhy'); if (why.length < 5) return dlgErr(el, 'กรุณาระบุเหตุผลอย่างน้อย 5 ตัวอักษร');
      return api('reassign', { action: 'transfer', scope: 'item', ids: [caseId], toDct: toDct, reason: why, category: 'ลงชื่อผิดคน' }, { write: true })
        .then(function () { toast('โอนแล้ว · ระบบคำนวณเดือนนั้นใหม่', 'ok'); go(S.page, S.arg); })
        .catch(function (e) { return dlgErr(el, e.message); });
    } });
}
