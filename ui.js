/* SMC MD — ui.js (รุ่น 2569-10-15.1)
 *  TBL — ตารางที่กรองได้: ค้นหา · ตัวกรองหลายช่อง · ปุ่มกรองลัด (พร้อมจำนวน) · เรียงคอลัมน์ · ยอดรวมตามที่กรอง
 *        · แบ่งหน้า · เลือกหลายแถว · ส่งออก Excel (CSV) · จำตัวกรองไว้เมื่อกลับมาหน้าเดิม
 *  CH  — กราฟ Chart.js 4.4.1 (โหลดเมื่อใช้) สีตามธีม · ชี้/แตะดูตัวเลข · คลิกกราฟเพื่อเจาะดู
 *  hbars — แถบแนวนอนแบบเบา ไม่ต้องโหลดไลบรารี
 */

/* ═══════════════════════════ ตาราง ═══════════════════════════ */
var TBL = (function () {
  var reg = {}, saved = {};

  function val(c, r) { return c.get ? c.get(r) : r[c.k]; }
  function fmt(c, r) {
    if (c.render) return c.render(r);
    var v = val(c, r);
    if (c.type === 'money') return v === null || v === undefined || v === '' ? '—' : B(v);
    if (c.type === 'money0') return Number(v) ? B(v) : '<span class="muted">—</span>';
    if (c.type === 'int') return N(v);
    if (c.type === 'date') return v ? '<span class="nowrap">' + dTh(v) + '</span>' : '—';
    if (c.type === 'hn') return hnCell(v);
    if (c.type === 'code') return '<span class="mono">' + esc(v) + '</span>';
    if (c.type === 'status') return tag(v);
    return esc(v === null || v === undefined || v === '' ? '—' : v);
  }
  function isNum(c) { return c.type === 'money' || c.type === 'money0' || c.type === 'int' || c.num; }

  function make(host, o) {
    var el = typeof host === 'string' ? document.getElementById(host) : host;
    var key = o.key || el.id;
    var st = saved[key] || { q: '', f: {}, chip: o.chip || '', sort: o.sort || null, page: 0 };
    if (o.reset) st = { q: '', f: {}, chip: o.chip || '', sort: o.sort || null, page: 0 };
    if (o.initial) { if (o.initial.chip !== undefined) st.chip = o.initial.chip; if (o.initial.f) for (var ik in o.initial.f) st.f[ik] = o.initial.f[ik]; if (o.initial.q !== undefined) st.q = o.initial.q; }
    saved[key] = st;
    var T = { o: o, el: el, st: st, key: key, rows: o.rows || [], view: [], sel: {} };
    reg[key] = T;
    o.pageSize = o.pageSize || 100;

    /* ── ตัวเลือกของตัวกรองแบบ select คำนวณจากข้อมูลจริง ── */
    (o.filters || []).forEach(function (f) {
      if (f.type === 'select' && (!f.options || f.options === 'auto')) {
        var seen = {}, list = [];
        T.rows.forEach(function (r) {
          var v = f.get ? f.get(r) : r[f.k];
          if (v === '' || v === null || v === undefined) v = '';
          var lb = f.labelOf ? f.labelOf(r) : v;
          if (!(v in seen)) { seen[v] = 0; list.push([v, lb || '(ไม่ระบุ)']); }
          seen[v]++;
        });
        list.sort(function (a, b) { return String(a[1]).localeCompare(String(b[1]), 'th'); });
        f._opts = list.map(function (x) { return [x[0], x[1] + ' (' + N(seen[x[0]]) + ')']; });
      } else f._opts = f.options || [];
    });

    var h = '';
    if (o.search || (o.filters && o.filters.length) || o.exportName) {
      h += '<div class="ftb">';
      if (o.search) h += '<label class="fld search"><span>ค้นหา</span>' + I('search', 'sm') +
        '<input type="search" data-q placeholder="' + esc(o.search.placeholder || 'พิมพ์คำค้น') + '" value="' + esc(st.q) + '"></label>';
      (o.filters || []).forEach(function (f, i) {
        var cur = st.f[f.k] || {};
        if (f.type === 'select') {
          h += '<label class="fld"><span>' + esc(f.label) + '</span><select data-f="' + i + '"><option value="">ทั้งหมด</option>' +
            f._opts.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(cur.v) === String(x[0]) && cur.v !== undefined ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') +
            '</select></label>';
        } else if (f.type === 'daterange') {
          h += '<label class="fld"><span>' + esc(f.label || 'ตั้งแต่วันที่') + '</span><input type="date" data-f="' + i + '" data-p="a" value="' + esc(cur.a || '') + '"></label>' +
               '<label class="fld"><span>ถึงวันที่</span><input type="date" data-f="' + i + '" data-p="b" value="' + esc(cur.b || '') + '"></label>';
        } else if (f.type === 'min') {
          h += '<label class="fld" style="max-width:150px"><span>' + esc(f.label) + '</span><input type="number" inputmode="decimal" data-f="' + i + '" placeholder="0" value="' + esc(cur.v || '') + '"></label>';
        }
      });
      h += '<div class="grow"></div><div class="btn-row">' +
        '<button class="btn sm ghost" data-clear title="ล้างตัวกรองทั้งหมด">' + I('x', 'sm') + 'ล้างตัวกรอง</button>' +
        (o.exportName ? '<button class="btn sm" data-export>' + I('download', 'sm') + 'Excel</button>' : '') +
        (o.actions || '') + '</div></div>';
    }
    if (o.chips && o.chips.length) h += '<div class="chips" data-chips></div>';
    h += '<div class="tw' + (o.tall ? ' tall' : '') + '"><table class="t' + (o.compact ? ' compact' : '') + '"><thead><tr>' +
      (o.select ? '<th style="width:34px"><input type="checkbox" data-all style="width:16px;height:16px;accent-color:var(--brand)"></th>' : '') +
      o.cols.map(function (c, i) {
        var s = c.sort !== false;
        return '<th data-c="' + i + '" class="' + (isNum(c) ? 'n ' : '') + (s ? 'sortable ' : '') + (c.first ? 'first' : '') + '"' +
          (c.w ? ' style="width:' + c.w + '"' : '') + '>' + esc(c.label) + (s ? '<span class="ar">▲▼</span>' : '') + '</th>';
      }).join('') + '</tr></thead><tbody></tbody><tfoot></tfoot></table></div>' +
      '<div class="tbl-info"><span data-info></span><span class="pager" data-pager></span></div>';
    el.innerHTML = h;

    /* ── เหตุการณ์ ── */
    var qi = el.querySelector('[data-q]'), tmr;
    if (qi) qi.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(function () { st.q = qi.value; st.page = 0; apply(T); }, 160); });
    [].forEach.call(el.querySelectorAll('[data-f]'), function (inp) {
      inp.addEventListener(inp.tagName === 'SELECT' ? 'change' : 'input', function () {
        var f = o.filters[Number(inp.getAttribute('data-f'))];
        var cur = st.f[f.k] || (st.f[f.k] = {});
        if (f.type === 'daterange') cur[inp.getAttribute('data-p')] = inp.value; else cur.v = inp.value;
        st.page = 0; apply(T);
      });
    });
    var cl = el.querySelector('[data-clear]');
    if (cl) cl.onclick = function () { st.q = ''; st.f = {}; st.chip = ''; st.page = 0; make(el, Object.assign({}, o, { reset: true, chip: '' })); };
    var ex = el.querySelector('[data-export]');
    if (ex) ex.onclick = function () { exportCsv(T); };
    [].forEach.call(el.querySelectorAll('th.sortable'), function (th) {
      th.onclick = function () {
        var i = Number(th.getAttribute('data-c'));
        st.sort = (st.sort && st.sort.i === i) ? { i: i, d: -st.sort.d } : { i: i, d: isNum(o.cols[i]) ? -1 : 1 };
        apply(T);
      };
    });
    var all = el.querySelector('[data-all]');
    if (all) all.onclick = function () {
      T.view.forEach(function (r) { T.sel[rowId(T, r)] = all.checked; });
      drawBody(T);
      if (o.onSelect) o.onSelect(selected(T));
    };
    el.querySelector('tbody').addEventListener('click', function (e) {
      var cb = e.target.closest('input[data-sel]');
      if (cb) { T.sel[cb.getAttribute('data-sel')] = cb.checked; cb.closest('tr').classList.toggle('sel', cb.checked); if (o.onSelect) o.onSelect(selected(T)); return; }
      if (e.target.closest('button,a,input,select')) return;
      var tr = e.target.closest('tr[data-i]');
      if (tr && o.onRow) o.onRow(T.pageRows[Number(tr.getAttribute('data-i'))]);
    });
    apply(T);
    return T;
  }

  function rowId(T, r) { return T.o.idOf ? T.o.idOf(r) : (r.id || JSON.stringify(r)); }
  function selected(T) { return T.rows.filter(function (r) { return T.sel[rowId(T, r)]; }); }

  function pass(T, r, skipChip) {
    var o = T.o, st = T.st;
    if (st.q) {
      var q = st.q.toLowerCase().trim(), keys = (o.search && o.search.keys) || o.cols.map(function (c) { return c.k; });
      var hay = keys.map(function (k) { return typeof k === 'function' ? k(r) : r[k]; }).join(' ').toLowerCase();
      var words = q.split(/\s+/);
      for (var w = 0; w < words.length; w++) if (hay.indexOf(words[w]) < 0) return false;
    }
    var fs = o.filters || [];
    for (var i = 0; i < fs.length; i++) {
      var f = fs[i], cur = st.f[f.k];
      if (!cur) continue;
      var v = f.get ? f.get(r) : r[f.k];
      if (f.type === 'select' && cur.v !== undefined && cur.v !== '' && String(v === undefined || v === null ? '' : v) !== String(cur.v)) return false;
      if (f.type === 'daterange') { var d = String(v || '').slice(0, 10); if (cur.a && d < cur.a) return false; if (cur.b && d > cur.b) return false; }
      if (f.type === 'min' && cur.v !== '' && cur.v !== undefined && Number(v || 0) < Number(cur.v)) return false;
    }
    if (!skipChip && st.chip) {
      var ch = (o.chips || []).filter(function (c) { return c.id === st.chip; })[0];
      if (ch && !ch.fn(r)) return false;
    }
    return true;
  }

  function apply(T) {
    var o = T.o, st = T.st;
    var base = T.rows.filter(function (r) { return pass(T, r, true); });
    T.view = st.chip ? base.filter(function (r) { var ch = o.chips.filter(function (c) { return c.id === st.chip; })[0]; return !ch || ch.fn(r); }) : base;
    if (st.sort) {
      var c = o.cols[st.sort.i], d = st.sort.d, num = isNum(c);
      T.view = T.view.slice().sort(function (a, b) {
        var x = c.sortVal ? c.sortVal(a) : val(c, a), y = c.sortVal ? c.sortVal(b) : val(c, b);
        if (num) return ((Number(x) || 0) - (Number(y) || 0)) * d;
        return String(x === undefined || x === null ? '' : x).localeCompare(String(y === undefined || y === null ? '' : y), 'th') * d;
      });
    }
    /* ปุ่มกรองลัด พร้อมจำนวนตามตัวกรองอื่นที่ใช้อยู่ */
    var chipsEl = T.el.querySelector('[data-chips]');
    if (chipsEl) {
      chipsEl.innerHTML = '<button class="chip' + (!st.chip ? ' on' : '') + '" data-chip="">ทั้งหมด <span class="c">' + N(base.length) + '</span></button>' +
        o.chips.map(function (c) {
          var n = base.filter(c.fn).length;
          if (!n && c.hideEmpty) return '';
          return '<button class="chip' + (st.chip === c.id ? ' on' : '') + (c.tone ? ' tone-' + c.tone : '') + '" data-chip="' + c.id + '" title="' + esc(c.hint || '') + '">' +
            esc(c.label) + ' <span class="c">' + N(n) + '</span></button>';
        }).join('');
      [].forEach.call(chipsEl.querySelectorAll('[data-chip]'), function (b) {
        b.onclick = function () { st.chip = b.getAttribute('data-chip'); st.page = 0; apply(T); };
      });
    }
    [].forEach.call(T.el.querySelectorAll('th.sortable'), function (th) {
      var on = st.sort && Number(th.getAttribute('data-c')) === st.sort.i;
      th.classList.toggle('sorted', !!on);
      var ar = th.querySelector('.ar'); if (ar) ar.textContent = on ? (st.sort.d > 0 ? '▲' : '▼') : '▲▼';
    });
    drawBody(T);
    if (o.onChange) o.onChange(T.view, T);
  }

  function drawBody(T) {
    var o = T.o, st = T.st, ps = o.pageSize;
    var pages = Math.max(1, Math.ceil(T.view.length / ps));
    if (st.page >= pages) st.page = pages - 1;
    T.pageRows = T.view.slice(st.page * ps, st.page * ps + ps);
    var html = T.pageRows.map(function (r, i) {
      var id = rowId(T, r), cls = (o.rowCls ? o.rowCls(r) : '') + (o.onRow ? ' click' : '') + (T.sel[id] ? ' sel' : '');
      return '<tr data-i="' + i + '" class="' + cls + '">' +
        (o.select ? '<td><input type="checkbox" data-sel="' + esc(id) + '"' + (T.sel[id] ? ' checked' : '') +
          (o.canSelect && !o.canSelect(r) ? ' disabled' : '') + ' style="width:16px;height:16px;accent-color:var(--brand)"></td>' : '') +
        o.cols.map(function (c) {
          return '<td class="' + (isNum(c) ? 'n ' : '') + (c.cls || '') + (c.first ? ' first' : '') + '">' + fmt(c, r) + '</td>';
        }).join('') + '</tr>';
    }).join('');
    var colspan = o.cols.length + (o.select ? 1 : 0);
    T.el.querySelector('tbody').innerHTML = html || '<tr><td colspan="' + colspan + '">' + emptyBox(o.empty || 'ไม่พบรายการตามเงื่อนไขที่เลือก', 'search') + '</td></tr>';

    /* ยอดรวมตามที่กรอง */
    var hasSum = o.cols.some(function (c) { return c.sum; });
    var tf = T.el.querySelector('tfoot');
    if (hasSum && T.view.length) {
      var firstDone = false;
      tf.innerHTML = '<tr>' + (o.select ? '<td></td>' : '') + o.cols.map(function (c) {
        if (c.sum) {
          var s = T.view.reduce(function (a, r) { return a + (Number(val(c, r)) || 0); }, 0);
          return '<td class="n">' + (c.type === 'int' ? N(s) : B(s)) + '</td>';
        }
        if (!firstDone) { firstDone = true; return '<td>รวม ' + N(T.view.length) + ' รายการ</td>'; }
        return '<td></td>';
      }).join('') + '</tr>';
    } else tf.innerHTML = '';

    var info = T.el.querySelector('[data-info]');
    var filtered = T.view.length !== T.rows.length;
    info.innerHTML = (filtered ? 'พบ <b>' + N(T.view.length) + '</b> จาก ' + N(T.rows.length) + ' รายการ' : 'ทั้งหมด <b>' + N(T.rows.length) + '</b> รายการ') +
      (pages > 1 ? ' · แสดง ' + N(st.page * ps + 1) + '–' + N(Math.min(T.view.length, st.page * ps + ps)) : '');
    var pg = T.el.querySelector('[data-pager]');
    pg.innerHTML = pages > 1 ? '<button class="btn sm icon" data-pg="-1"' + (st.page ? '' : ' disabled') + '>' + I('left', 'sm') + '</button>' +
      '<span>หน้า ' + (st.page + 1) + ' / ' + pages + '</span>' +
      '<button class="btn sm icon" data-pg="1"' + (st.page < pages - 1 ? '' : ' disabled') + '>' + I('right', 'sm') + '</button>' : '';
    [].forEach.call(pg.querySelectorAll('[data-pg]'), function (b) {
      b.onclick = function () { st.page += Number(b.getAttribute('data-pg')); drawBody(T); T.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    });
  }

  function exportCsv(T) {
    var o = T.o, cols = o.cols.filter(function (c) { return c.export !== false; });
    var q = function (v) { v = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [cols.map(function (c) { return q(c.label); }).join(',')];
    T.view.forEach(function (r) {
      lines.push(cols.map(function (c) {
        var v = c.exportVal ? c.exportVal(r) : val(c, r);
        if (c.type === 'hn' || c.type === 'code') return q(v ? '="' + v + '"' : '');   /* กัน Excel ตัดเลข 0 นำหน้า */
        return q(v);
      }).join(','));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (o.exportName || 'รายงาน') + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
    toast('ส่งออก ' + N(T.view.length) + ' รายการ (เปิดด้วย Excel ได้)', 'ok');
  }

  /** ตั้งปุ่มกรองลัดจากภายนอก (เช่น กดการ์ด "ทำไมไม่ขึ้น" แล้วกรองตาราง) */
  function setChip(key, chip) { var T = reg[key]; if (!T) return; T.st.chip = chip; T.st.page = 0; apply(T); T.el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function setFilter(key, k, v) {
    var T = reg[key]; if (!T) return;
    T.st.f[k] = { v: v }; T.st.page = 0;
    var i = (T.o.filters || []).map(function (f) { return f.k; }).indexOf(k);
    var sel = T.el.querySelector('[data-f="' + i + '"]'); if (sel) sel.value = v;
    apply(T); T.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function setRange(key, k, a, b) {
    var T = reg[key]; if (!T) return;
    T.st.f[k] = { a: a || '', b: b || '' }; T.st.page = 0;
    var i = (T.o.filters || []).map(function (f) { return f.k; }).indexOf(k);
    var ia = T.el.querySelector('[data-f="' + i + '"][data-p="a"]'), ib = T.el.querySelector('[data-f="' + i + '"][data-p="b"]');
    if (ia) ia.value = a || ''; if (ib) ib.value = b || '';
    apply(T); T.el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function get(key) { return reg[key]; }
  function clearSel(key) { var T = reg[key]; if (T) { T.sel = {}; drawBody(T); } }

  return { make: make, setChip: setChip, setFilter: setFilter, setRange: setRange, get: get, selected: function (k) { return reg[k] ? selected(reg[k]) : []; }, clearSel: clearSel };
})();

/* ═══════════════════════════ แถบแนวนอนแบบเบา ═══════════════════════════ */
function hbars(list, o) {
  o = o || {};
  if (!list || !list.length) return emptyBox('ไม่มีข้อมูล');
  var mx = Math.max.apply(null, list.map(function (x) { return Math.abs(Number(x.v) || 0); })) || 1;
  return '<div class="hbars">' + list.map(function (x, i) {
    var w = Math.max(1, Math.round(Math.abs(Number(x.v) || 0) / mx * 100));
    return '<div class="hbar' + (x.on ? ' click' : '') + '"' + (x.on ? ' onclick="' + x.on + '"' : '') + ' title="' + esc(x.label + ' · ' + (o.fmt ? o.fmt(x.v) : B(x.v))) + '">' +
      '<span class="lab">' + esc(x.label) + '</span>' +
      '<span class="meter"><i style="width:' + w + '%;background:' + (x.color || 'var(--c0)') + ';animation-delay:' + (i * 0.03) + 's"></i></span>' +
      '<span class="val">' + (o.fmt ? o.fmt(x.v) : B(x.v)) + (x.sub ? ' <span class="muted tiny">' + x.sub + '</span>' : '') + '</span></div>';
  }).join('') + '</div>';
}

/* ═══════════════════════════ กราฟ ═══════════════════════════ */
var CH = (function () {
  var live = {}, defs = {}, loading = null;
  var SRC = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';

  function need() {
    if (window.Chart) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = SRC; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { loading = null; rej(new Error('โหลดเครื่องมือวาดกราฟไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ต')); };
      document.head.appendChild(s);
    });
    return loading;
  }
  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888'; }
  function pal() { return ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'].map(css); }
  function base() { return { ink: css('--ink-2'), mute: css('--ink-3'), grid: css('--grid'), card: css('--card'), brand: css('--c0'), line: css('--line') }; }

  function make(host, build) {
    var el = typeof host === 'string' ? document.getElementById(host) : host;
    if (!el) return Promise.resolve(null);
    var id = el.id || (el.id = 'ch' + Math.random().toString(36).slice(2, 8));
    defs[id] = build;
    return need().then(function () {
      if (!document.body.contains(el)) return null;
      if (live[id]) { try { live[id].destroy(); } catch (e) { } }
      el.innerHTML = '<canvas role="img"></canvas>';
      var b = base();
      Chart.defaults.font.family = "'IBM Plex Sans Thai','Sarabun',sans-serif";
      Chart.defaults.font.size = 12.5;
      Chart.defaults.color = b.mute;
      var cfg = build(b, pal());
      cfg.options = cfg.options || {};
      cfg.options.responsive = true; cfg.options.maintainAspectRatio = false;
      live[id] = new Chart(el.querySelector('canvas'), cfg);
      return live[id];
    }).catch(function (e) {
      el.innerHTML = '<div class="empty" style="padding:24px">' + I('alert') + esc(e.message) + '</div>';
    });
  }
  function tip(b, fmt) {
    return {
      backgroundColor: b.card, titleColor: css('--ink'), bodyColor: b.ink, borderColor: b.line, borderWidth: 1,
      padding: 10, cornerRadius: 10, boxPadding: 4, usePointStyle: true,
      callbacks: { label: function (ctx) {
        var v = ctx.parsed && typeof ctx.parsed === 'object' ? (ctx.chart.options.indexAxis === 'y' ? ctx.parsed.x : ctx.parsed.y) : ctx.parsed;
        return ' ' + (ctx.dataset.label ? ctx.dataset.label + ': ' : (ctx.label ? ctx.label + ': ' : '')) + (fmt || B)(v);
      } }
    };
  }
  function axisV(b, fmt, stacked) {
    return { stacked: !!stacked, beginAtZero: true, grid: { color: b.grid, drawTicks: false }, border: { display: false },
             ticks: { padding: 8, callback: function (v) { return (fmt || K)(v); } } };
  }
  function axisC(b, stacked) { return { stacked: !!stacked, grid: { display: false }, border: { color: b.grid }, ticks: { padding: 6, autoSkip: true, maxRotation: 0 } }; }
  function clickOf(o) {
    if (!o.onClick) return undefined;
    return function (evt, els) { if (els && els.length) o.onClick(els[0].index, els[0].datasetIndex); };
  }
  function hoverCursor(o) { return o.onClick ? function (e, els) { e.native.target.style.cursor = els.length ? 'pointer' : 'default'; } : undefined; }

  /** แท่ง: { labels, series:[{label,data,color}], stacked, horizontal, fmt, onClick(i) } */
  function bar(host, o) {
    return make(host, function (b, p) {
      return {
        type: 'bar',
        data: { labels: o.labels, datasets: o.series.map(function (s, i) {
          return { label: s.label, data: s.data, backgroundColor: s.color || (o.series.length === 1 ? b.brand : p[i % p.length]),
                   borderRadius: 4, borderSkipped: 'start', maxBarThickness: o.thick || 34,
                   borderColor: b.card, borderWidth: o.stacked ? { top: 2 } : 0 };
        }) },
        options: {
          indexAxis: o.horizontal ? 'y' : 'x', animation: { duration: 550 },
          interaction: { mode: o.horizontal ? 'nearest' : 'index', intersect: !!o.horizontal, axis: o.horizontal ? 'y' : 'x' },
          onClick: clickOf(o), onHover: hoverCursor(o),
          plugins: { legend: { display: o.series.length > 1, position: 'top', align: 'start', labels: { boxWidth: 11, boxHeight: 11, useBorderRadius: true, borderRadius: 3, padding: 14 } },
                     tooltip: tip(b, o.fmt) },
          scales: o.horizontal ? { x: axisV(b, o.axisFmt, o.stacked), y: axisC(b, o.stacked) } : { x: axisC(b, o.stacked), y: axisV(b, o.axisFmt, o.stacked) }
        }
      };
    });
  }
  /** เส้น: { labels, series:[{label,data,color,fill}], fmt, onClick } */
  function line(host, o) {
    return make(host, function (b, p) {
      return {
        type: 'line',
        data: { labels: o.labels, datasets: o.series.map(function (s, i) {
          var c = s.color || (i === 0 ? b.brand : p[(i - 1) % p.length]);
          return { label: s.label, data: s.data, borderColor: c, backgroundColor: c + '22', fill: !!s.fill, tension: .32,
                   borderWidth: 2, pointRadius: o.labels.length > 40 ? 0 : 3, pointHoverRadius: 6, pointBackgroundColor: c, pointBorderColor: b.card, pointBorderWidth: 2 };
        }) },
        options: {
          animation: { duration: 600 }, interaction: { mode: 'index', intersect: false },
          onClick: clickOf(o), onHover: hoverCursor(o),
          plugins: { legend: { display: o.series.length > 1, position: 'top', align: 'start', labels: { boxWidth: 11, boxHeight: 11, useBorderRadius: true, borderRadius: 3, padding: 14 } },
                     tooltip: tip(b, o.fmt) },
          scales: { x: axisC(b), y: axisV(b, o.axisFmt) }
        }
      };
    });
  }
  /** วงแหวน (ใช้เฉพาะสัดส่วน ≤ 6 กลุ่ม): { labels, data, colors, fmt, onClick } */
  function donut(host, o) {
    return make(host, function (b, p) {
      return {
        type: 'doughnut',
        data: { labels: o.labels, datasets: [{ data: o.data, backgroundColor: o.colors || p, borderColor: b.card, borderWidth: 2, hoverOffset: 8 }] },
        options: {
          cutout: '62%', animation: { animateRotate: true, duration: 700 },
          onClick: clickOf(o), onHover: hoverCursor(o),
          plugins: { legend: { position: 'right', labels: { boxWidth: 11, boxHeight: 11, useBorderRadius: true, borderRadius: 3, padding: 10 } },
                     tooltip: tip(b, o.fmt) }
        }
      };
    });
  }
  function destroyAll() { for (var k in live) { try { live[k].destroy(); } catch (e) { } } live = {}; defs = {}; }
  function redrawAll() { var d = defs; for (var k in d) { var el = document.getElementById(k); if (el) make(el, d[k]); } }
  return { bar: bar, line: line, donut: donut, destroyAll: destroyAll, redrawAll: redrawAll, need: need };
})();
