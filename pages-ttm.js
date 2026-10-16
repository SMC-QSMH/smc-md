/* SMC MD — pages-ttm.js (รุ่น 2569-10-16.1)
 * หมวดแพทย์แผนไทย (รหัส DFM0081 · API smc_dr เดียวกัน)
 *   - คิดรายรอบเวร: DF 80% เทียบประกันรายได้ (อัตรา × ชั่วโมงเวร) · รอบที่ได้ประกัน DF 100% ของรอบนั้นเป็นรายได้คลินิก
 *   - ต้องมีเวรที่อนุมัติใน SMC Duty (P33 รพ. · P34 พัทยาเหนือ · P35 แหลมฉบัง · P36 ศูนย์บางพระ)
 *   - เจ้าหน้าที่แผนไทยเห็นเฉพาะหน่วยที่ดูแล ไม่เห็น DF แพทย์ทั่วไป/สูติ (กรองที่หลังบ้าน)
 */
S.ttm = { unit: '' };
var TTM_SLOT = { 'ช1': 'เช้า', 'ช2': 'บ่าย', 'บ1': 'เย็น' };

function ttmUnitTabs(D, page, ym) {
  if (!D.sheets.length) return '';
  if (!D.sheets.some(function (s) { return s.grp === S.ttm.unit; })) S.ttm.unit = D.sheets[0].grp;
  return '<div class="unit-tabs">' + D.sheets.map(function (s) {
    return '<button class="' + (s.grp === S.ttm.unit ? 'on' : '') + '" onclick="S.ttm.unit=\'' + s.grp + '\';go(\'' + page + '\',\'' + ym + '\')"><b>' + esc(s.name) + '</b>' +
      '<small>' + N(s.total.rounds) + ' รอบ · ' + B(s.total.comp80 + s.total.guar) + ' บาท · ' + esc(s.status === 'closed' ? 'ปิดรอบแล้ว' : 'ยังไม่ปิด') + '</small></button>';
  }).join('') + '</div>';
}

/* ═══════════════ รายงานแพทย์แผนไทย (แบบเดียวกับ Excel เดิม) ═══════════════ */
ROUTES.ttm = function (ym) {
  ym = ym || ymAdd(thisYm(), -1);
  header('รายงานแพทย์แผนไทย', ymTh(ym) + ' · คิดรายรอบเวร', monthPicker('ttm', ym) +
    '<button class="btn sm" onclick="ttmPrint(false)">' + I('printer', 'sm') + '<span class="lbl">พิมพ์หน่วยนี้</span></button>' +
    '<button class="btn sm" onclick="ttmPrint(true)">' + I('printer', 'sm') + '<span class="lbl">พิมพ์ทุกหน่วย</span></button>' + refreshBtn());
  load('getTtmMonth', { ym: ym }, function (D, meta) {
    S.cache.ttm = D;
    var html = '<div class="btn-row" style="justify-content:space-between;margin-bottom:10px"><span class="small muted">อัตราประกันรายได้ ' + B(D.rateNow) + ' บาท/ชั่วโมง · แหล่งตารางเวร: ' +
      ({ sheet: 'ชีท SMC Duty', api: 'คำสั่ง SMC Duty', none: 'ยังไม่ได้ตั้งค่า (เพิ่มเวรเอง/นำเข้า Excel)' })[D.dutySource] + '</span>' + freshBadge(meta) + '</div>';
    if (!D.sheets.length) return V(html + card('', note('warn', 'บัญชีนี้ยังไม่ได้รับมอบหมายหน่วยแพทย์แผนไทย — ติดต่อผู้ดูแลระบบ')));
    html += ttmUnitTabs(D, 'ttm', ym);
    var Sh = D.sheets.filter(function (s) { return s.grp === S.ttm.unit; })[0], t = Sh.total;
    var ns = D.noShift.filter(function (o) { return o.grp === Sh.grp; });
    var ps = D.pendingShifts.filter(function (o) { return o.grp === Sh.grp; });
    if (ns.length) html += note('bad', '<b>' + N(ns.length) + '</b> รายการ DF ไม่พบเวรของแพทย์ในวันนั้น — ยังไม่จ่าย จนกว่าจะมีเวรที่อนุมัติ <a href="#ttmItems:' + ym + '">ไปจัดการ</a>');
    if (ps.length) html += note('warn', 'มีเวรที่ยังไม่อนุมัติใน SMC Duty <b>' + N(ps.length) + '</b> เวร — ไม่นับเป็นรอบจนกว่าจะอนุมัติ แล้วกด "ดึงจาก SMC Duty" ที่หน้าตารางเวร');
    html += '<div class="kpis">' +
      kpi('แพทย์ได้รับรวม', B(t.comp80 + t.guar), N(t.rounds) + ' รอบเวร · ' + N(t.patients) + ' ผู้ป่วย', 'hero', 'baht') +
      kpi('DF 80% (' + esc(Sh.incomePay) + ')', B(t.comp80), 'รอบที่ DF 80% ถึงขั้นต่ำ', 'good', 'steth') +
      kpi('ประกันรายได้ (' + esc(Sh.incomeGuar) + ')', B(t.guar), N(t.guarRounds) + ' รอบ · ' + (Sh.guarOn ? 'เปิดใช้' : 'ปิดใช้ (หน่วยนี้ไม่มีประกัน)'), t.guar ? 'warn' : '', 'leaf') +
      kpi('ส่วนโรงพยาบาล 20% (' + esc(Sh.incomeHos) + ')', B(t.df20), 'จากรอบที่จ่ายแบบ DF', '', 'pie') +
      kpi('DF 100% ทั้งหมด', B(t.dfAll), 'รอบประกัน → รายได้คลินิก ' + B(t.clinicIncome), '', 'file') + '</div>';
    html += card(esc(Sh.name) + ' · รายรอบเวร', '<div id="tTtR"></div>', { icon: 'leaf', flush: true, fold: 'ttmRounds',
      sub: 'คิดแบบ = DF 80% ถ้า DF 80% ≥ อัตรา × ชั่วโมงเวร · ไม่ถึง = ประกันรายได้ (DF 100% ของรอบนั้นเข้ารายได้คลินิก)' });
    html += card('สรุปรายแพทย์', '<div id="tTtD"></div>', { icon: 'users', flush: true, fold: 'ttmDocs' });
    html += card('ผู้ลงนาม', '<div class="grid g2"><div><b>ผู้จัดทำ/ตรวจสอบ</b><br>' + esc(Sh.signer1Name || '—') + '<br><span class="muted small">' + esc(Sh.signer1Title || '') + '</span></div>' +
      '<div><b>ผู้รับรอง</b><br>' + esc(Sh.signer2Name || '—') + '<br><span class="muted small">' + esc(Sh.signer2Title || '') + '</span></div></div>' +
      (isHr() ? '<div class="hint" style="margin-top:8px">แก้ชื่อผู้ลงนามได้ที่ <a href="#ttmSettings">ตั้งค่าแพทย์แผนไทย</a></div>' : ''), { icon: 'edit', fold: 'ttmSign', open: false });
    V(html);
    TBL.make('tTtR', { key: 'tTtR_' + Sh.grp, reset: true, rows: Sh.rounds, exportName: 'แผนไทย_รายรอบ_' + Sh.grp + '_' + ym, pageSize: 300, compact: true,
      filters: [{ type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (o) { return o.dctName || o.dct; } }, { type: 'select', k: 'mode', label: 'คิดแบบ', labelOf: function (o) { return o.mode === 'guar' ? 'ประกันรายได้' : 'DF 80%'; } },
                { type: 'daterange', k: 'date', label: 'วันที่' }],
      chips: [{ id: 'g', label: 'ประกันรายได้', tone: 'warn', fn: function (o) { return o.mode === 'guar'; } }, { id: 'z', label: 'ไม่มีผู้ป่วย', fn: function (o) { return !o.patients; }, hideEmpty: true },
              { id: 'm', label: 'เวรเพิ่มเอง', fn: function (o) { return o.source === 'manual'; }, hideEmpty: true }],
      rowCls: function (o) { return o.mode === 'guar' ? 'flag' : ''; },
      cols: [{ k: 'date', label: 'วันที่', type: 'date' }, { k: 'slotLabel', label: 'รอบบริการ', cls: 'nowrap', render: function (o) { return esc(o.slotLabel) + (o.source === 'manual' ? '<span class="sub">เพิ่มเอง</span>' : ''); } },
             { k: 'dctName', label: 'แพทย์', render: function (o) { return esc(o.dctName || '—') + '<span class="sub mono">' + esc(o.dct) + '</span>'; } },
             { k: 'hours', label: 'ชม.', num: true }, { k: 'patients', label: 'ผู้ป่วย', type: 'int', sum: true },
             { k: 'base', label: 'DF 100%', type: 'money', sum: true }, { k: 'df80', label: 'DF 80%', type: 'money', sum: true },
             { k: 'guarAmt', label: 'ขั้นต่ำ (อัตรา×ชม.)', type: 'money' },
             { k: 'mode', label: 'คิดแบบ', render: function (o) { return o.mode === 'guar' ? tag('ประกันรายได้', 'warn') : tag('DF 80%', 'ok'); } },
             { k: 'pay80', label: 'ค่าตอบแทน 80%', type: 'money0', sum: true }, { k: 'guar', label: 'ประกันรายได้', type: 'money0', sum: true },
             { k: 'hos20', label: 'รพ. 20%', type: 'money0', sum: true }, { k: 'clinicIncome', label: 'รายได้คลินิก', type: 'money0', sum: true }] });
    TBL.make('tTtD', { key: 'tTtD_' + Sh.grp, reset: true, rows: Sh.doctors.map(function (d) { d.total = Math.round((d.df80 + d.guar) * 100) / 100; return d; }),
      exportName: 'แผนไทย_รายแพทย์_' + Sh.grp + '_' + ym, compact: true, orders: ordersFor({ amount: 'total' }),
      cols: [{ k: 'dct', label: 'รหัส', type: 'code' }, { k: 'dctName', label: 'ชื่อ - สกุล' }, { k: 'rounds', label: 'รอบ', type: 'int', sum: true },
             { k: 'guarRounds', label: 'รอบประกัน', type: 'int', sum: true }, { k: 'patients', label: 'ผู้ป่วย', type: 'int', sum: true },
             { k: 'df100', label: 'DF 100% (รอบ DF)', type: 'money', sum: true }, { k: 'df80', label: 'DF 80%', type: 'money', sum: true },
             { k: 'guar', label: 'ประกันรายได้', type: 'money0', sum: true }, { k: 'total', label: 'แพทย์ได้รับรวม', type: 'money', sum: true },
             { k: 'df20', label: 'รพ. 20%', type: 'money0', sum: true }] });
  }, { msg: 'กำลังคิดยอดแพทย์แผนไทยรายรอบเวร' });
};

/** พิมพ์รายงานแผนไทย — หน่วยเดียว หรือทุกหน่วย (หน่วยละหน้า) */
function ttmPrint(all) {
  var D = S.cache.ttm; if (!D) return toast('กรุณาเปิดรายงานก่อน', 'warn');
  var list = all ? D.sheets : D.sheets.filter(function (s) { return s.grp === S.ttm.unit; });
  var html = list.map(function (Sh) {
    var t = Sh.total;
    return '<div class="pr-page"><h2>' + esc(D.reportTitle) + '</h2><div class="pr-sub">' + esc(Sh.name) + ' · ประจำเดือน ' + esc(D.ymTh) + '<br>' + esc(D.orgName) + '</div>' +
      '<table><thead><tr><th>ลำดับ</th><th>วันที่</th><th>รอบบริการ</th><th>รหัส</th><th>ชื่อ - สกุล</th><th>ชม.</th><th>ผู้ป่วย</th><th>DF 100%</th><th>DF 80%</th><th>ขั้นต่ำ</th><th>ค่าตอบแทน 80%</th><th>ประกันรายได้</th><th>รพ. 20%</th></tr></thead><tbody>' +
      Sh.rounds.map(function (o, i) {
        return '<tr><td class="n">' + (i + 1) + '</td><td>' + dTh(o.date) + '</td><td>' + esc(o.slotLabel) + '</td><td>' + esc(o.dct) + '</td><td>' + esc(o.dctName) + '</td><td class="n">' + o.hours + '</td>' +
          '<td class="n">' + N(o.patients) + '</td><td class="n">' + B(o.base) + '</td><td class="n">' + B(o.df80) + '</td><td class="n">' + B(o.guarAmt) + '</td>' +
          '<td class="n">' + (o.pay80 ? B(o.pay80) : '-') + '</td><td class="n">' + (o.guar ? B(o.guar) : '-') + '</td><td class="n">' + (o.hos20 ? B(o.hos20) : '-') + '</td></tr>';
      }).join('') + '</tbody><tfoot><tr><td colspan="6">รวม ' + N(t.rounds) + ' รอบ (ประกันรายได้ ' + N(t.guarRounds) + ' รอบ)</td><td class="n">' + N(t.patients) + '</td><td class="n">' + B(t.dfAll) + '</td>' +
      '<td class="n">' + B(t.df80All) + '</td><td></td><td class="n">' + B(t.comp80) + '</td><td class="n">' + B(t.guar) + '</td><td class="n">' + B(t.df20) + '</td></tr></tfoot></table>' +
      '<table style="width:70%"><thead><tr><th>รหัส</th><th>ชื่อ - สกุล</th><th>รอบ</th><th>ค่าตอบแทน 80% (' + esc(Sh.incomePay) + ')</th><th>ประกันรายได้ (' + esc(Sh.incomeGuar) + ')</th><th>รวมจ่ายแพทย์</th><th>รพ. 20% (' + esc(Sh.incomeHos) + ')</th></tr></thead><tbody>' +
      Sh.doctors.map(function (d) { return '<tr><td>' + esc(d.dct) + '</td><td>' + esc(d.dctName) + '</td><td class="n">' + N(d.rounds) + '</td><td class="n">' + B(d.df80) + '</td><td class="n">' + B(d.guar) + '</td><td class="n">' + B(d.df80 + d.guar) + '</td><td class="n">' + B(d.df20) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr><td colspan="3">รวม</td><td class="n">' + B(t.comp80) + '</td><td class="n">' + B(t.guar) + '</td><td class="n">' + B(t.comp80 + t.guar) + '</td><td class="n">' + B(t.df20) + '</td></tr></tfoot></table>' +
      '<div class="small">อัตราประกันรายได้ ' + B(D.rateNow) + ' บาท/ชั่วโมง · รอบที่จ่ายประกันรายได้ ค่า DF 100% ของรอบนั้นเป็นรายได้คลินิก ' + B(t.clinicIncome) + ' บาท</div>' +
      '<div class="sign"><div>ลงชื่อ ...........................................<br>(' + esc(Sh.signer1Name || '...........................') + ')<br>' + esc(Sh.signer1Title || '') + '</div>' +
      '<div>ลงชื่อ ...........................................<br>(' + esc(Sh.signer2Name || '...........................') + ')<br>' + esc(Sh.signer2Title || '') + '</div></div></div>';
  }).join('');
  printSheet(html, true);
}

/* ═══════════════ รายการ DF แผนไทย และรอบเวร ═══════════════ */
ROUTES.ttmItems = function (ym) {
  ym = ym || ymAdd(thisYm(), -1);
  header('รายการ DF และรอบเวร', ymTh(ym) + ' · ระบบจัดเข้ารอบตามเวลาลงทะเบียน แก้รอบได้', monthPicker('ttmItems', ym) + refreshBtn());
  load('getTtmMonth', { ym: ym }, function (D, meta) {
    S.cache.ttm = D;
    var html = '<div class="btn-row" style="justify-content:flex-end;margin-bottom:10px">' + freshBadge(meta) + '</div>' + ttmUnitTabs(D, 'ttmItems', ym);
    if (!D.sheets.length) return V(html + card('', note('warn', 'บัญชีนี้ยังไม่ได้รับมอบหมายหน่วยแพทย์แผนไทย')));
    var g = S.ttm.unit, items = D.items.filter(function (r) { return r.grp === g || (r.grp === 'VTH'); });
    var vth = D.items.filter(function (r) { return r.grp === 'VTH'; }).length;
    html += note('info', 'ระบบเลือกรอบเวรจาก<b>เวลาลงทะเบียน</b> (visit) ของผู้ป่วย: รอบที่เริ่มก่อนหรือตรงเวลาที่ลงทะเบียน (ยืดหยุ่น 60 นาที) · ป้าย "ระบบเดา" = ไม่มีเวลาลงทะเบียน ' +
      '· ถ้าผิดรอบ ติ๊กเลือกแล้วกด <b>ย้ายรอบเวร</b>');
    if (vth) html += note('warn', 'มี ' + N(vth) + ' รายการแผนไทยที่ระบุหน่วยไม่ได้ (คลินิกไม่ตรงกับหน่วยที่ตั้งไว้) — ตั้งรหัสคลินิกที่ <a href="#ttmSettings">ตั้งค่าแพทย์แผนไทย</a>');
    html += card('รายการ DF แพทย์แผนไทย', '<div id="tTtI"></div>', { icon: 'list', flush: true });
    V(html);
    TBL.make('tTtI', { key: 'tTtI', reset: true, rows: items, exportName: 'แผนไทย_รายการ_' + ym, select: D.canEdit, pageSize: 200, initial: D.noShift.length ? { chip: 'ns' } : null,
      search: { placeholder: 'HN · แพทย์ · รหัส', keys: ['hn', 'dct', 'dctName', 'code', 'pttype', 'clinic'] },
      filters: [{ type: 'daterange', k: 'date', label: 'วันที่' }, { type: 'select', k: 'dct', label: 'แพทย์', labelOf: function (r) { return r.dctName || r.dct; } },
                { type: 'select', k: 'slotLabel', label: 'รอบ' }, { type: 'select', k: 'status', label: 'สถานะ' }],
      chips: [{ id: 'ns', label: 'ไม่พบเวร', tone: 'bad', fn: function (r) { return r.noShift; } },
              { id: 'gs', label: 'ระบบเดารอบ', tone: 'warn', fn: function (r) { return r.guess && !r.noShift; }, hideEmpty: true },
              { id: 'fx', label: 'แก้รอบแล้ว', fn: function (r) { return r.fixed; }, hideEmpty: true },
              { id: 'nc', label: 'ไม่นับจ่าย', fn: function (r) { return !r.counted && !r.noShift; }, hideEmpty: true }],
      actions: D.canEdit ? '<button class="btn sm pri" onclick="ttmMoveSlot()">' + I('swap', 'sm') + 'ย้ายรอบเวร</button>' +
                           '<button class="btn sm" onclick="ttmAutoSlot()">คืนให้ระบบเลือก</button>' +
                           '<button class="btn sm" onclick="ttmAddShiftFromSel()">' + I('plus', 'sm') + 'เพิ่มเวรให้รายการที่ไม่พบเวร</button>' +
                           '<button class="btn sm" onclick="reassignSel(\'tTtI\',\'suspend\')">' + I('slash', 'sm') + 'ระงับ · เข้าคลินิก</button>' : '',
      rowCls: function (r) { return r.noShift ? 'flag' : (r.counted ? '' : 'dim'); },
      cols: [{ k: 'date', label: 'วันที่', type: 'date' }, { k: 'time', label: 'ลงทะเบียน', render: function (r) { return esc(String(r.time || '').slice(0, 5) || '—'); } },
             { k: 'dctName', label: 'แพทย์', render: function (r) { return esc(r.dctName || '—') + '<span class="sub mono">' + esc(r.dct) + '</span>'; } },
             { k: 'hn', label: 'HN', type: 'hn' }, { k: 'pttype', label: 'สิทธิ', cls: 'small' }, { k: 'clinic', label: 'คลินิก', cls: 'small' },
             { k: 'slotLabel', label: 'รอบเวร', render: function (r) { return r.noShift ? tag('ไม่พบเวร', 'bad') : esc(r.slotLabel) + (r.fixed ? ' ' + tag('แก้แล้ว', 'info') : r.guess ? ' ' + tag('ระบบเดา', 'warn') : ''); } },
             { k: 'total', label: 'เรียกเก็บ', type: 'money', sum: true }, { k: 'collected', label: 'เก็บได้', type: 'money', sum: true },
             { k: 'status', label: 'สถานะ', render: function (r) { return tag(r.status) + (r.reason ? '<span class="sub">' + esc(r.reason) + '</span>' : ''); } }] });
  }, { msg: 'กำลังโหลดรายการแพทย์แผนไทย' });
};
function ttmMoveSlot() {
  var sel = TBL.selected('tTtI'), D = S.cache.ttm;
  if (!sel.length) return toast('ยังไม่ได้เลือกรายการ', 'warn');
  var dates = {}, docs = {};
  sel.forEach(function (r) { dates[r.date] = 1; docs[r.dct] = 1; });
  var cand = D.shifts.filter(function (s) { return dates[s.date] && s.status !== 'CANCELLED'; });
  if (Object.keys(docs).length === 1) cand = cand.filter(function (s) { return docs[s.empCode]; }).concat(cand.filter(function (s) { return !docs[s.empCode]; }));
  if (!cand.length) return UI.alert({ title: 'ไม่พบเวรในวันที่เลือก', icon: 'alert', tone: 'warn', body: '<p>เพิ่มเวรก่อนที่หน้า <a href="#ttmShifts">ตารางเวรแพทย์แผนไทย</a> หรือกด "เพิ่มเวรให้รายการที่ไม่พบเวร"</p>' });
  UI.dialog({ title: 'ย้าย ' + N(sel.length) + ' รายการไปรอบเวร', icon: 'swap',
    body: '<label class="fld"><span>รอบเวร</span><select id="msSh">' + cand.map(function (s) {
      return '<option value="' + esc(s.id) + '">' + dTh(s.date) + ' · ' + esc(s.start + ' - ' + s.end) + ' · ' + esc(s.empCode) + ' · ' + esc(s.pos) + (s.status === 'APPROVED' || s.status === 'MANUAL' ? '' : ' (' + esc(s.status) + ')') + '</option>'; }).join('') + '</select></label>' +
      '<label class="fld"><span>หมายเหตุ</span><input id="msNote" placeholder="เช่น ผู้ป่วยลงทะเบียนรอบบ่ายแต่ตรวจรอบเย็น"></label>', ok: 'ย้ายรอบ',
    onOk: function () {
      return api('ttmSetSlot', { ids: sel.map(function (r) { return r.id; }), shiftId: mv('msSh'), note: mv('msNote') }, { write: true })
        .then(function (r) { toast('ย้ายรอบแล้ว ' + N(r.done) + ' รายการ · คำนวณใหม่แล้ว', 'ok'); go('ttmItems', D.ym); });
    } });
}
function ttmAutoSlot() {
  var sel = TBL.selected('tTtI'); if (!sel.length) return toast('ยังไม่ได้เลือกรายการ', 'warn');
  api('ttmSetSlot', { ids: sel.map(function (r) { return r.id; }), shiftId: '' }, { write: true })
    .then(function () { toast('คืนให้ระบบเลือกรอบตามเวลาแล้ว', 'ok'); go('ttmItems', S.cache.ttm.ym); }).catch(function (e) { toast(e.message, 'bad', 9000); });
}
function ttmAddShiftFromSel() {
  var sel = TBL.selected('tTtI').filter(function (r) { return r.noShift; });
  var r0 = sel[0] || (S.cache.ttm.noShift || [])[0];
  if (!r0) return toast('เลือกรายการที่ "ไม่พบเวร" ก่อน', 'warn');
  ttmShiftDlg({ date: r0.date, empCode: r0.dct, grp: r0.grp });
}

/* ═══════════════ ตารางเวรแพทย์แผนไทย ═══════════════ */
ROUTES.ttmShifts = function (ym) {
  ym = ym || ymAdd(thisYm(), -1);
  header('ตารางเวรแพทย์แผนไทย', ymTh(ym) + ' · ดึงจาก SMC Duty (ตำแหน่ง P33–P36) · เพิ่มเอง/นำเข้า Excel ได้เมื่อจำเป็น', monthPicker('ttmShifts', ym) +
    (canTtm() ? '<button class="btn sm pri" onclick="ttmPull(\'' + ym + '\',this)">' + I('refresh', 'sm') + '<span class="lbl">ดึงจาก SMC Duty</span></button>' +
      '<button class="btn sm" onclick="ttmShiftDlg({date:\'' + ym + '-01\'})">' + I('plus', 'sm') + '<span class="lbl">เพิ่มเวร</span></button>' +
      '<button class="btn sm" onclick="ttmImportPick()">' + I('upload', 'sm') + '<span class="lbl">นำเข้า Excel</span></button>' : '') + refreshBtn());
  load('getTtmMonth', { ym: ym }, function (D, meta) {
    S.cache.ttm = D;
    var names = {}; D.items.forEach(function (r) { names[r.dct] = r.dctName; }); D.sheets.forEach(function (s) { s.rounds.forEach(function (o) { if (o.dctName) names[o.dct] = o.dctName; }); });
    var rows = D.shifts.map(function (s) { s.name = names[s.empCode] || ''; s.unit = (D.clinics.filter(function (c) { return c.pos === s.pos; })[0] || {}).name || s.pos; return s; });
    var html = '<div class="btn-row" style="justify-content:flex-end;margin-bottom:10px">' + freshBadge(meta) + '</div>' +
      note('info', 'เวรที่ใช้คิดเงินต้อง <b>อนุมัติแล้ว</b> ใน SMC Duty (หรือเจ้าหน้าที่เพิ่มเอง) · เวรที่อนุมัติแล้วนับเป็น 1 รอบเสมอ แม้ไม่มีผู้ป่วย · ' +
        'เวรที่เจ้าหน้าที่แก้เองจะไม่ถูกทับเมื่อดึงจาก SMC Duty อีกครั้ง · เดือนที่ SMC Duty เก็บเข้าคลังแล้ว ให้นำเข้า Excel แทน');
    if (D.dutySource === 'none') html += note('warn', 'ยังไม่ได้ตั้งค่าแหล่งตารางเวร SMC Duty' + (isHr() ? ' — <a href="#ttmSettings">ตั้งค่า</a>' : ' — แจ้ง HR'));
    html += card('เวร ' + ymTh(ym), '<div id="tTtS"></div>', { icon: 'clock', flush: true, sub: 'แตะแถวเพื่อแก้ไข/ยกเลิกเวร' });
    V(html);
    TBL.make('tTtS', { key: 'tTtS', reset: true, rows: rows, exportName: 'เวรแผนไทย_' + ym, pageSize: 300, compact: true,
      search: { placeholder: 'รหัส · ชื่อ', keys: ['empCode', 'name', 'note'] },
      filters: [{ type: 'select', k: 'unit', label: 'หน่วย' }, { type: 'select', k: 'empCode', label: 'แพทย์', labelOf: function (s) { return s.name || s.empCode; } },
                { type: 'select', k: 'status', label: 'สถานะ' }, { type: 'daterange', k: 'date', label: 'วันที่' }],
      chips: [{ id: 'ok', label: 'ใช้คิดเงิน', fn: function (s) { return s.status === 'APPROVED' || s.status === 'MANUAL'; } },
              { id: 'pend', label: 'รออนุมัติ', tone: 'warn', fn: function (s) { return s.status === 'PENDING'; }, hideEmpty: true },
              { id: 'cx', label: 'ยกเลิก', fn: function (s) { return s.status === 'CANCELLED'; }, hideEmpty: true }],
      rowCls: function (s) { return s.status === 'CANCELLED' ? 'dim' : s.status === 'PENDING' ? 'flag' : ''; },
      onRow: canTtm() ? function (s) { ttmShiftDlg(s); } : null,
      cols: [{ k: 'date', label: 'วันที่', type: 'date' }, { k: 'unit', label: 'หน่วย', cls: 'small', render: function (s) { return esc(s.unit) + '<span class="sub mono">' + esc(s.pos) + '</span>'; } },
             { k: 'slot', label: 'ช่วง', render: function (s) { return esc(TTM_SLOT[s.slot] || s.slot); } },
             { k: 'start', label: 'เวลา', render: function (s) { return esc(s.start + ' - ' + s.end); } }, { k: 'hours', label: 'ชม.', num: true, sum: true },
             { k: 'empCode', label: 'แพทย์', render: function (s) { return esc(s.name || '—') + '<span class="sub mono">' + esc(s.empCode) + '</span>'; } },
             { k: 'status', label: 'สถานะ', render: function (s) { return tag(({ APPROVED: 'อนุมัติแล้ว', MANUAL: 'เพิ่มเอง', PENDING: 'รออนุมัติ', CANCELLED: 'ยกเลิก' })[s.status] || s.status,
                 s.status === 'APPROVED' ? 'ok' : s.status === 'MANUAL' ? 'info' : s.status === 'PENDING' ? 'warn' : ''); } },
             { k: 'source', label: 'ที่มา', cls: 'small', render: function (s) { return s.source === 'duty' ? 'SMC Duty' : 'เจ้าหน้าที่'; } },
             { k: 'note', label: 'หมายเหตุ', cls: 'small wrap' }] });
  }, { msg: 'กำลังโหลดตารางเวร' });
};
function ttmPull(ym, btn) {
  var old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
  api('ttmDutyPull', { ym: ym }, { write: true }).then(function (r) {
    btn.disabled = false; btn.innerHTML = old;
    toast('ดึงเวรแล้ว · เพิ่ม ' + N(r.added) + ' · ปรับ ' + N(r.updated) + ' · ยกเลิก ' + N(r.cancelled) + (r.pendingApproval ? ' · รออนุมัติ ' + N(r.pendingApproval) : ''), r.pendingApproval ? 'warn' : 'ok', 9000);
    go('ttmShifts', ym);
  }).catch(function (e) { btn.disabled = false; btn.innerHTML = old; UI.alert({ title: 'ดึงเวรไม่สำเร็จ', icon: 'alert', tone: 'bad', body: note('bad', esc(e.message)) }); });
}
function ttmShiftDlg(s) {
  s = s || {};
  var D = S.cache.ttm || { clinics: [] }, cl = D.clinics || [];
  var pos = s.pos || ((cl.filter(function (c) { return c.grp === (s.grp || S.ttm.unit); })[0] || cl[0] || {}).pos || '');
  var edit = !!s.id;
  UI.dialog({ title: edit ? 'แก้ไขเวร' : 'เพิ่มเวรแพทย์แผนไทย', icon: 'clock',
    sub: edit ? 'ที่มา: ' + (s.source === 'duty' ? 'SMC Duty (แก้แล้วจะไม่ถูกทับเมื่อดึงใหม่)' : 'เจ้าหน้าที่') : 'ใช้เมื่อเวรไม่มีใน SMC Duty · ระบบบันทึกผู้เพิ่มไว้',
    body: '<div class="frow"><label class="fld"><span>วันที่</span><input type="date" id="shD" value="' + esc(s.date || '') + '"' + (edit ? ' readonly' : '') + '></label>' +
      '<label class="fld"><span>หน่วย (ตำแหน่ง SMC Duty)</span><select id="shP"' + (edit ? ' disabled' : '') + '>' + cl.filter(function (c) { return c.pos; }).map(function (c) {
        return '<option value="' + esc(c.pos) + '"' + (c.pos === pos ? ' selected' : '') + '>' + esc(c.pos + ' · ' + (c.name || c.grp)) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="frow"><label class="fld"><span>รหัสแพทย์</span><input id="shE" value="' + esc(s.empCode || '') + '"' + (edit ? ' readonly' : '') + '></label>' +
      '<label class="fld"><span>เวลาเริ่ม</span><input type="time" id="shS" value="' + esc(s.start || '16:00') + '"></label>' +
      '<label class="fld"><span>จำนวนชั่วโมง</span><input type="number" step="0.5" id="shH" value="' + esc(s.hours || 3.5) + '"></label></div>' +
      '<label class="fld"><span>หมายเหตุ</span><input id="shN" value="' + esc(edit ? '' : 'เพิ่มเองเพราะไม่มีใน SMC Duty') + '"></label>' +
      (edit && s.status !== 'CANCELLED' ? '<label class="chk"><input type="checkbox" id="shX"><div><b>ยกเลิกเวรนี้</b><small>รายการ DF ของเวรนี้จะกลายเป็น "ไม่พบเวร"</small></div></label>' : ''),
    ok: 'บันทึก',
    onOk: function (el) {
      if (document.getElementById('shX') && document.getElementById('shX').checked)
        return api('ttmDeleteShift', { id: s.id }, { write: true }).then(function () { toast('ยกเลิกเวรแล้ว', 'ok'); go(S.page, S.arg); });
      var d = { id: edit ? s.id : '', date: mv('shD'), pos: edit ? s.pos : mv('shP'), empCode: mv('shE'), start: mv('shS'), hours: mv('shH'), note: mv('shN'), slot: edit ? s.slot : '' };
      if (!d.date || !d.empCode) return dlgErr(el, 'กรุณากรอกวันที่และรหัสแพทย์');
      return api('ttmSaveShift', { data: d }, { write: true }).then(function () { toast('บันทึกเวรแล้ว · คำนวณเดือนใหม่แล้ว', 'ok'); go(S.page, S.arg); });
    } });
}
/* นำเข้าเวรจาก Excel รูปแบบเดิม: หน่วยงาน · วันที่เปิดบริการ · รอบบริการ (16:00 - 19:30) · รหัสเจ้าหน้าที่ */
function ttmImportPick() {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx,.xls';
  inp.onchange = function () { if (inp.files[0]) ttmImportRead(inp.files[0]); };
  inp.click();
}
function ttmImportRead(file) {
  toast('กำลังอ่าน ' + file.name, 'info', 3000);
  loadXlsxLib().then(function () { return file.arrayBuffer(); }).then(function (buf) {
    var wb = XLSX.read(buf, { type: 'array' }), rows = [], seen = {};
    wb.SheetNames.forEach(function (sn) {
      var aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
      for (var r = 0; r < Math.min(15, aoa.length); r++) {
        var h = aoa[r].map(function (x) { return String(x).trim(); });
        var ci = { unit: h.findIndex(function (x) { return /หน่วย/.test(x); }), date: h.findIndex(function (x) { return /วันที่/.test(x); }),
                   round: h.findIndex(function (x) { return /รอบ/.test(x); }), emp: h.findIndex(function (x) { return /รหัส/.test(x); }) };
        if (ci.date < 0 || ci.round < 0 || ci.emp < 0) continue;
        for (var i = r + 1; i < aoa.length; i++) {
          var a = aoa[i], date = impDate(a[ci.date]), round = String(a[ci.round] || ''), emp = String(a[ci.emp] || '').replace(/\.0+$/, '').trim();
          if (!date || !/\d[:.]\d{2}\s*-\s*\d/.test(round) || !emp) continue;
          var unit = ci.unit >= 0 ? String(a[ci.unit] || '') : sn;
          var k = [unit, date, round, emp].join('|'); if (seen[k]) continue; seen[k] = 1;
          rows.push({ unit: unit || sn, date: date, round: round, empCode: emp });
        }
        break;
      }
    });
    if (!rows.length) throw new Error('ไม่พบแถวเวรในไฟล์ — ต้องมีคอลัมน์ หน่วยงาน · วันที่ · รอบบริการ (เช่น 16:00 - 19:30) · รหัสเจ้าหน้าที่');
    /* ไฟล์เดิมมีชีท "รายงานรวม" ที่อาจมีเดือนอื่นปนมา → ให้เลือกเดือนที่จะนำเข้า (ค่าเริ่มต้น = เดือนที่มีเวรมากสุด) */
    var byYm = {}; rows.forEach(function (r) { var k = r.date.slice(0, 7); byYm[k] = (byYm[k] || 0) + 1; });
    var yms = Object.keys(byYm).sort(function (a, b) { return byYm[b] - byYm[a] || (a < b ? 1 : -1); });
    var tableOf = function (ym) {
      var l = rows.filter(function (r) { return r.date.slice(0, 7) === ym; }), u = {};
      l.forEach(function (r) { u[r.unit] = (u[r.unit] || 0) + 1; });
      return '<div class="small" style="margin-bottom:6px">' + Object.keys(u).map(function (k) { return esc(k) + ' ' + N(u[k]) + ' เวร'; }).join(' · ') + '</div>' +
        '<div class="tw" style="max-height:40vh"><table class="t compact"><thead><tr><th>หน่วย</th><th>วันที่</th><th>รอบ</th><th>รหัส</th></tr></thead><tbody>' +
        l.map(function (r) { return '<tr><td>' + esc(r.unit) + '</td><td>' + dTh(r.date) + '</td><td>' + esc(r.round) + '</td><td class="mono">' + esc(r.empCode) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    };
    UI.dialog({ title: 'นำเข้าเวรจาก Excel', icon: 'upload', wide: true, sub: esc(file.name),
      body: '<label class="fld"><span>เดือนที่จะนำเข้า</span><select id="tiYm">' + yms.map(function (y) { return '<option value="' + y + '">' + ymTh(y) + ' (' + N(byYm[y]) + ' เวร)</option>'; }).join('') + '</select></label>' +
        '<div id="tiTbl">' + tableOf(yms[0]) + '</div>' + note('info', 'เวรที่นำเข้าเป็นแบบ "เพิ่มเอง" (ไม่ถูกทับเมื่อดึงจาก SMC Duty) · ระบบจับหน่วยจากชื่อ: รพ. → P33 · พัทยา → P34 · แหลมฉบัง → P35 · บางพระ/ส่งเสริม → P36'),
      ok: 'นำเข้า',
      onOpen: function (el) { el.querySelector('#tiYm').onchange = function () { el.querySelector('#tiTbl').innerHTML = tableOf(this.value); }; },
      onOk: function () {
        var ym = mv('tiYm'), pick = rows.filter(function (r) { return r.date.slice(0, 7) === ym; });
        return api('ttmImportShifts', { rows: pick, fileName: file.name }, { write: true }).then(function (r) {
          toast('นำเข้าแล้ว ' + N(r.imported) + ' เวร' + (r.skipped.length ? ' · ข้าม ' + r.skipped.length + ' (' + r.skipped.slice(0, 3).join(', ') + ')' : ''), r.skipped.length ? 'warn' : 'ok', 10000);
          go(S.page, S.arg);
        });
      } });
  }).catch(function (e) { toast(e.message, 'bad', 10000); });
}

/* ═══════════════ ตั้งค่าแพทย์แผนไทย (HR) ═══════════════ */
ROUTES.ttmSettings = function () {
  header('ตั้งค่าแพทย์แผนไทย', 'อัตราประกันรายได้ (มีวันที่มีผล) · เปิด/ปิดประกันรายหน่วย · ตารางเวร · รหัสรายได้ · ผู้ลงนาม',
    '<button class="btn sm pri" onclick="ttmSaveSettings()">' + I('check', 'sm') + 'บันทึก</button>');
  Promise.all([api('getSettings', {}), api('getTtmMonth', { ym: thisYm() }).catch(function () { return null; })]).then(function (res) {
    var st = res[0].settings || {}, T = res[1];
    var rates = []; try { rates = JSON.parse(st.ttmRates || '[]'); } catch (e) { }
    if (!rates.length) rates = [{ from: '2025-10-01', rate: 175 }];
    var clinics = (T && T.clinics) || [];
    S.cache.ttmSet = { rates: rates, clinics: clinics };
    var onoff = function (k, lab, hint) {
      return '<label class="fld"><span>' + esc(lab) + '</span><select class="ts" data-k="' + k + '"><option value="on"' + (st[k] === 'on' ? ' selected' : '') + '>เปิด</option><option value="off"' + (st[k] !== 'on' ? ' selected' : '') + '>ปิด</option></select>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</label>';
    };
    var txt = function (k, lab, hint) { return '<label class="fld"><span>' + esc(lab) + '</span><input class="ts" data-k="' + k + '" value="' + esc(st[k] || '') + '">' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</label>'; };
    var html = note('warn', 'ค่าที่กระทบเงิน (อัตรา · สวิตช์ประกันรายได้ · รหัสรายได้ · คลินิก) ต้องยืนยันรหัสผ่าน · หลังบันทึกให้กด "คำนวณใหม่" ในเดือนที่ยังไม่ปิดก่อนออกไฟล์เบิก');
    html += '<div class="grid g2">' +
      card('อัตราประกันรายได้ (บาท/ชั่วโมง)', '<div id="rateRows"></div><button class="btn sm" onclick="ttmRateAdd()">' + I('plus', 'sm') + 'เพิ่มอัตราใหม่ (มีผลตั้งแต่วันที่)</button>' +
        '<div class="hint" style="margin-top:8px">ประกันรายได้ต่อรอบ = อัตรา ณ วันที่ของเวร × ชั่วโมงเวร (เช่น 175 × 3.5 = 612.50 บาท) · เก็บประวัติไว้ คิดย้อนหลังได้ถูกต้อง</div>', { icon: 'baht' }) +
      card('ประกันรายได้รายหน่วย', onoff('ttmGuarTTH', 'แผนไทย รพ. (P33)', 'ยกเลิกประกันรายได้ตั้งแต่ ธ.ค. 68') + onoff('ttmGuarTTB', 'แผนไทย ศูนย์สาขา (P34 พัทยาเหนือ · P35 แหลมฉบัง)') +
        onoff('ttmGuarTTP', 'แผนไทย ศูนย์บางพระ (P36)') + onoff('ttmApprovedOnly', 'นับเฉพาะเวรที่อนุมัติแล้วใน SMC Duty', 'แนะนำให้เปิดไว้'), { icon: 'leaf' }) + '</div>';
    html += '<div class="grid g2">' +
      card('แหล่งตารางเวร SMC Duty', txt('dutySheetId', 'ไอดีชีท SMC Duty (ทาง A — แนะนำ)', 'แชร์ชีท SMC Duty แบบ "ผู้มีสิทธิ์อ่าน" ให้บัญชี Google ที่ติดตั้ง SMC MD · ไม่ต้องแก้โค้ด SMC Duty') +
        txt('dutyApiUrl', 'ที่อยู่เว็บแอป SMC Duty (ทาง B)', 'ใช้เมื่อเพิ่มคำสั่ง mdShifts ใน SMC Duty แล้ว · ตั้ง Script Property DUTY_KEY ให้ตรงกันทั้งสองระบบ'), { icon: 'link' }) +
      card('รหัสรายได้ HRMi', '<div class="frow">' + txt('incomeTTHPay', 'รพ. · ส่วนแพทย์ 80%') + txt('incomeTTHHos', 'รพ. · ส่วน รพ. 20%') + '</div>' +
        '<div class="frow">' + txt('incomeTTBPay', 'ศูนย์สาขา · ส่วนแพทย์') + txt('incomeTTBHos', 'ศูนย์สาขา · ส่วน รพ.') + '</div>' +
        '<div class="frow">' + txt('incomeTTPPay', 'บางพระ · ส่วนแพทย์') + txt('incomeTTPHos', 'บางพระ · ส่วน รพ.') + '</div>' + txt('incomeTtmGuar', 'ประกันรายได้ (รหัสเดียว)'), { icon: 'hash' }) + '</div>';
    html += card('คลินิกแพทย์แผนไทย (รหัสคลินิกจากระบบ รพ. → หน่วย → ตำแหน่งเวร)', '<div class="tw"><table class="t compact"><thead><tr><th>รหัสคลินิก</th><th>หน่วยเบิก</th><th>ชื่อที่แสดง</th><th>ตำแหน่ง SMC Duty</th><th>คำในชื่อคลินิก (คั่นด้วย ,)</th><th></th></tr></thead><tbody id="clRows"></tbody></table></div>' +
      '<div style="padding:10px 18px"><button class="btn sm" onclick="ttmClinicAdd()">' + I('plus', 'sm') + 'เพิ่มคลินิก</button> <span class="hint">รหัสคลินิก ATOT = รพ. · ลำดับมีผล: รหัสที่เจาะจงกว่าควรอยู่ก่อน</span></div>', { icon: 'shuffle', raw: true });
    html += card('ผู้ลงนามในรายงานแพทย์แผนไทย', '<div class="grid g2"><div>' + txt('ttmSigner1HName', 'ผู้จัดทำ (รพ./ศูนย์สาขา) · ชื่อ') + txt('ttmSigner1HTitle', 'ตำแหน่ง') + '</div><div>' +
      txt('ttmSigner1PName', 'ผู้จัดทำ (ศูนย์บางพระ) · ชื่อ') + txt('ttmSigner1PTitle', 'ตำแหน่ง') + '</div></div>' + '<div class="grid g2"><div>' + txt('ttmSigner2Name', 'ผู้รับรอง · ชื่อ') + '</div><div>' + txt('ttmSigner2Title', 'ตำแหน่ง') + '</div></div>', { icon: 'edit' });
    V(html); ttmDrawRates(); ttmDrawClinics();
  }).catch(showErr);
};
function ttmDrawRates() {
  var R = S.cache.ttmSet.rates;
  document.getElementById('rateRows').innerHTML = R.map(function (r, i) {
    return '<div class="rate-row"><label class="fld"><span>มีผลตั้งแต่</span><input type="date" class="rtF" value="' + esc(r.from) + '"></label>' +
      '<label class="fld"><span>บาท/ชั่วโมง</span><input type="number" step="1" class="rtR" value="' + esc(r.rate) + '"></label>' +
      (R.length > 1 ? '<button class="btn sm icon ghost" title="ลบ" onclick="ttmRateDel(' + i + ')">' + I('x', 'sm') + '</button>' : '') + '</div>';
  }).join('');
}
function ttmReadRates() { var f = document.querySelectorAll('.rtF'), r = document.querySelectorAll('.rtR'), o = []; for (var i = 0; i < f.length; i++) o.push({ from: f[i].value, rate: Number(r[i].value) }); return o; }
function ttmRateAdd() { S.cache.ttmSet.rates = ttmReadRates(); S.cache.ttmSet.rates.push({ from: thisYm() + '-01', rate: 175 }); ttmDrawRates(); }
function ttmRateDel(i) { S.cache.ttmSet.rates = ttmReadRates(); S.cache.ttmSet.rates.splice(i, 1); ttmDrawRates(); }
var TTM_GRP = { TTH: 'แผนไทย รพ.', TTB: 'แผนไทย ศูนย์สาขา', TTP: 'แผนไทย ศูนย์บางพระ' };
function ttmDrawClinics() {
  document.getElementById('clRows').innerHTML = S.cache.ttmSet.clinics.map(function (c, i) {
    return '<tr><td><input class="inp sm clC" value="' + esc(c.code) + '"></td><td><select class="inp sm clG">' + Object.keys(TTM_GRP).map(function (g) { return '<option value="' + g + '"' + (c.grp === g ? ' selected' : '') + '>' + TTM_GRP[g] + '</option>'; }).join('') + '</select></td>' +
      '<td><input class="inp sm clN" value="' + esc(c.name || '') + '"></td><td><input class="inp sm clP" style="width:80px" value="' + esc(c.pos || '') + '"></td>' +
      '<td><input class="inp sm clW" value="' + esc((c.words || []).join(', ')) + '"></td><td><button class="btn sm icon ghost" onclick="ttmClinicDel(' + i + ')">' + I('x', 'sm') + '</button></td></tr>';
  }).join('');
}
function ttmReadClinics() {
  var q = function (c) { return document.querySelectorAll('.' + c); }, C = q('clC'), G = q('clG'), Nn = q('clN'), P = q('clP'), W = q('clW'), o = [];
  for (var i = 0; i < C.length; i++) if (C[i].value.trim()) o.push({ code: C[i].value.trim(), grp: G[i].value, name: Nn[i].value.trim(), pos: P[i].value.trim(), words: W[i].value });
  return o;
}
function ttmClinicAdd() { S.cache.ttmSet.clinics = ttmReadClinics().map(function (c) { c.words = String(c.words).split(','); return c; }); S.cache.ttmSet.clinics.push({ code: '', grp: 'TTB', name: '', pos: '', words: [] }); ttmDrawClinics(); }
function ttmClinicDel(i) { S.cache.ttmSet.clinics = ttmReadClinics().map(function (c) { c.words = String(c.words).split(','); return c; }); S.cache.ttmSet.clinics.splice(i, 1); ttmDrawClinics(); }
function ttmSaveSettings() {
  var p = { rates: ttmReadRates(), clinics: ttmReadClinics() };
  [].forEach.call(document.querySelectorAll('.ts'), function (x) { p[x.dataset.k] = x.value; });
  UI.dialog({ title: 'บันทึกตั้งค่าแพทย์แผนไทย', icon: 'settings',
    body: note('warn', 'ถ้าแก้อัตรา/สวิตช์ประกันรายได้/รหัสรายได้/คลินิก ต้องกรอกรหัสผ่าน และคำนวณเดือนที่ยังไม่ปิดใหม่') +
      '<label class="fld"><span>รหัสผ่านของท่าน</span><input id="tsPass" type="password" autocomplete="current-password"></label>', ok: 'บันทึก',
    onOk: function () {
      p.pass = document.getElementById('tsPass').value;
      return api('saveTtmSettings', p, { write: true }).then(function (r) { toast(r.note, r.moneyChanged && r.moneyChanged.length ? 'warn' : 'ok', 10000); go('ttmSettings'); });
    } });
}
