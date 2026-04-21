// ═══════════════════════════════════════════════════════
// script.js — ReconSphere Frontend Logic
// ═══════════════════════════════════════════════════════
// CHANGES MADE vs original:
// 1. Removed duplicate/conflicting beginUpload() functions
// 2. Fixed stray code at bottom that caused syntax errors
// 3. beginUpload() now has TWO modes:
//    - DEMO MODE: called with no argument → uses hardcoded SAMPLE_ROWS
//    - REAL MODE: called with a File object → hits your Node.js API
// 4. renderFromAPI() maps real API response to the same format as SAMPLE_ROWS
// 5. goto('review') now checks window.validationResult first
// 6. Added file input handler for real file upload
// 7. ROWS is now a variable (let) not const so it can be replaced
// ═══════════════════════════════════════════════════════



function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="${type === 'success' ? 'M3 8l3 3 7-7' : type === 'error' ? 'M4 4l8 8M12 4l-8 8' : 'M8 4v5M8 12v.5'}"/></svg>${msg}`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── Subheading animation ──────────────────────────────
// ═══════════════════════════════════════════════════════
// script.js — ReconSphere Frontend Logic v2
// ═══════════════════════════════════════════════════════

// ── Subheading animation ──
/* (function () {
  const a = document.getElementById('sub-a'), b = document.getElementById('sub-b');
  if (!a || !b) return;
  let showA = true;
  function flip() {
    if (showA) {
      a.className = 'sub-line la hid-up';
      setTimeout(() => { b.className = 'sub-line lb vis' }, 380);
    } else {
      b.className = 'sub-line lb hid-up';
      setTimeout(() => { a.className = 'sub-line la vis' }, 380);
    }
    showA = !showA;
  }
  setInterval(flip, 3600);
})(); */
(function () {
  const lines = [
    document.getElementById('sub-a'),
    document.getElementById('sub-b'),
    document.getElementById('sub-c'),
  ];
  if (lines.some(l => !l)) return;

  // How long each line stays visible (ms)
  const durations = [3600, 2600, 2600];
  let current = 0;

  function showNext() {
    // Fade out current
    lines[current].classList.remove('vis');
    lines[current].classList.add('hid-up');

    const next = (current + 1) % lines.length;

    setTimeout(() => {
      // Hide all cleanly
      lines.forEach(l => {
        l.classList.remove('vis', 'hid-up');
        l.classList.add('hid');
      });
      // Fade in next
      lines[next].classList.remove('hid');
      lines[next].classList.add('vis');
      current = next;

      // Schedule the one after
      setTimeout(showNext, durations[current]);
    }, 420); // matches your CSS transition duration
  }

  // Start the cycle
  setTimeout(showNext, durations[0]);
})();

// ═══════════════════════════════════════════════════════
// SAMPLE DATA — intentionally broken for demo mode
// ═══════════════════════════════════════════════════════
const SAMPLE_ROWS = [
  { id: 5, name: 'Adity Kumar Singh', code: '1000234567', country: 'IN', pay: 'NET30', bank: 'SBIN0001234', tax: 'AABCS1234K', postal: '400001', cur: 'INR', status: 'warn', issues: [{ field: 'vendor_name', old: 'Adity Kumar Singh', ai: 'Aditya Kumar Singh', conf: 97, why: 'Typo detected — "Adity" → "Aditya" (edit-distance 1). Confidence 97% exceeds the 90% auto-fix threshold.', rule: 'Typo correction', auto: true }] },
  { id: 12, name: 'Reliance Industries Ltd Petrochemicals Div Mumbai', code: '1000298312', country: 'IN', pay: 'NET60', bank: 'HDFC0002345', tax: 'AAACR1234B', postal: '400079', cur: 'INR', status: 'err', issues: [{ field: 'vendor_name', old: 'Reliance Industries Ltd Petrochemicals Div Mumbai', ai: 'Reliance Industries Ltd', conf: 88, why: 'SAP field LFA1-NAME1 allows max 35 characters. Current: 49 chars.', rule: 'Name length ≤ 35 chars', auto: false }] },
  { id: 19, name: 'Tata Consultancy Services', code: '10002X4', country: 'IN', pay: 'NET30', bank: 'SBIN0003456', tax: 'AABCT1234C', postal: '400051', cur: 'INR', status: 'err', issues: [{ field: 'vendor_code', old: '10002X4', ai: null, conf: 0, why: 'Vendor code must be 10-digit numeric only. Non-numeric "X" found.', rule: 'Vendor code format', auto: false }] },
  { id: 23, name: 'wipro ltd', code: '1000301122', country: 'IN', pay: 'IMMEDIATE', bank: 'ICIC0001100', tax: 'AABCW1234D', postal: '560035', cur: 'INR', status: 'warn', issues: [{ field: 'vendor_name', old: 'wipro ltd', ai: 'Wipro Ltd', conf: 100, why: 'All-lowercase name. SAP convention enforces title case.', rule: 'Name casing (title case)', auto: true }] },
  { id: 31, name: 'Infosys BPM', code: '1000412200', country: 'IND', pay: 'NET30', bank: 'AXIS0001200', tax: 'AABCI1234E', postal: '560100', cur: 'INR', status: 'warn', issues: [{ field: 'country', old: 'IND', ai: 'IN', conf: 99, why: '"IND" is not a valid ISO 3166-1 alpha-2 code.', rule: 'Country code ISO 3166-1', auto: true }] },
  { id: 44, name: 'Mahindra & Mahindra Ltd', code: '1001066700', country: 'IN', pay: 'NET45', bank: 'PUNB0001500', tax: '', postal: '400018', cur: 'INR', status: 'err', issues: [{ field: 'tax_number', old: '', ai: null, conf: 0, why: 'GSTIN is mandatory for all Indian vendors under SAP MM.', rule: 'Tax number required (IN)', auto: false }] },
  { id: 67, name: 'HCL Technologies', code: '1000622100', country: 'IN', pay: 'NET90', bank: 'SBIN0002600', tax: 'AABCH1234F', postal: '201301', cur: 'INR', status: 'warn', issues: [{ field: 'payment_terms', old: 'NET90', ai: 'NET60', conf: 62, why: '"NET90" not in approved terms master.', rule: 'Payment terms whitelist', auto: false }] },
  { id: 82, name: 'Bajaj Auto Ltd', code: '1000733400', country: 'IN', pay: 'NET30', bank: 'BAJAJ001234', tax: 'AABCB1234G', postal: '411035', cur: 'INR', status: 'err', issues: [{ field: 'bank_key', old: 'BAJAJ001234', ai: 'BARB0001234', conf: 71, why: 'IFSC format invalid. "BAJAJ" is 5 chars.', rule: 'Bank key IFSC format', auto: false }] },
  { id: 101, name: 'Sun Pharmaceuticals', code: '1000844500', country: 'IN', pay: 'NET30', bank: 'SBIN0004500', tax: 'AABCS5678H', postal: '400063', cur: 'INR', status: 'ok', issues: [] },
  { id: 115, name: 'LARSEN AND TOUBRO', code: '1000955600', country: 'IN', pay: 'NET60', bank: 'HDFC0005600', tax: 'AABCL1234I', postal: '400051', cur: 'INR', status: 'warn', issues: [{ field: 'vendor_name', old: 'LARSEN AND TOUBRO', ai: 'Larsen And Toubro', conf: 100, why: 'All-caps detected.', rule: 'Name casing (title case)', auto: true }] },
  { id: 134, name: 'Godrej Consumer Products', code: '1001066701', country: 'IN', pay: 'NETT30', bank: 'ICIC0006700', tax: 'AABCG1234J', postal: '400079', cur: 'INR', status: 'err', issues: [{ field: 'payment_terms', old: 'NETT30', ai: 'NET30', conf: 96, why: '"NETT30" is a typo for "NET30".', rule: 'Typo + payment terms whitelist', auto: true }] },
  { id: 156, name: 'Dr Reddys Laboratories', code: '1001177800', country: 'IN', pay: 'NET30', bank: 'SBIN0007800', tax: 'AABCD1234K', postal: '5000034', cur: 'INR', status: 'err', issues: [{ field: 'postal_code', old: '5000034', ai: '500034', conf: 95, why: 'Indian postal codes must be exactly 6 digits.', rule: 'Postal code 6-digit (IN)', auto: false }] },
  { id: 178, name: 'Asian Paints Limited', code: '1001288900', country: 'IN', pay: 'NET30', bank: 'HDFC0008900', tax: 'AABCA1234L', postal: '400022', cur: 'INRR', status: 'err', issues: [{ field: 'currency', old: 'INRR', ai: 'INR', conf: 99, why: '"INRR" is not a valid ISO 4217 code.', rule: 'Currency ISO 4217', auto: true }] },
];

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════
let ROWS = [];           // active rows — empty until upload
let isDemoMode = false;
let filt = 'all';
let curIdx = 0;
let selId = null;
let reso = {};
let currentFileName = '—';    // FIX 2: track real file name
let dataLoaded = false;        // FIX 4: track if data exists

function getFlagged() { return ROWS.filter(r => r.issues && r.issues.length > 0); }
function getVisibleFlagged() {
  return getFlagged().filter(r => {
    const isResolved = reso[r.id] && !reso[r.id].skipped;
    if (filt === 'err') return r.status === 'err' && !isResolved;
    if (filt === 'ai') return (r.issues.length && r.issues[0].auto) && !isResolved;
    if (filt === 'pending') return (!reso[r.id] && r.issues.length > 0);
    return true;
  });
}

// ═══════════════════════════════════════════════════════
// STATS — FIX 1: always computed from current ROWS
// ═══════════════════════════════════════════════════════
function updStats() {
  if (!dataLoaded) {
    // Nothing uploaded yet — show dashes everywhere
    ['st-total', 'st-err', 'st-clean', 'st-ai',
      'ex-total', 'ex-clean', 'ex-ai', 'ex-skip', 'st-score'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '—';
      });
    const pillErr = document.getElementById('pill-err');
    const pillAuto = document.getElementById('pill-auto');
    const pillTotal = document.getElementById('pill-total');
    if (pillErr) pillErr.textContent = '— errors';
    if (pillAuto) pillAuto.textContent = '— AI-suggested';
    if (pillTotal) pillTotal.textContent = '— total';
    return;
  }

  const fixed = Object.values(reso).filter(x => !x.skipped).length;
  const skipped = Object.values(reso).filter(x => x.skipped).length;
  const total = ROWS.length;
  const errors = ROWS.filter(r => r.status === 'err').length;
  const warns = ROWS.filter(r => r.status === 'warn').length;
  const totalWithIssues = ROWS.filter(r => r.issues.length > 0).length;
  const fixable = totalWithIssues - fixed - skipped;
  const clean = total - totalWithIssues + fixed;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('st-total', total);
  set('st-err', errors);
  set('st-clean', clean);
  set('st-ai', fixable);
  set('ex-total', total);
  set('ex-clean', clean);
  set('ex-ai', fixable);
  set('ex-skip', skipped);


  const score = total > 0 ? Math.round((clean / total) * 100) : 0;

  // Data Quality Gauge
  const scoreEl = document.getElementById('st-score');
  if (scoreEl) {
    if (!document.getElementById('score-ring')) {
      scoreEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="position:relative; width:36px; height:36px;">
            <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform:rotate(-90deg);">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg3)" stroke-width="3"/>
              <path id="score-ring" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--accent)" stroke-width="3" stroke-dasharray="0, 100" style="transition: stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1);"/>
            </svg>
          </div>
          <div style="font-family:'Syne',sans-serif; font-size:20px; font-weight:700; color:var(--text);"><span id="score-text">0</span><span style="font-size:12px; color:var(--text3);">/100</span></div>
        </div>
      `;

      requestAnimationFrame(() => {
        setTimeout(() => {
          const ring = document.getElementById('score-ring');
          if (ring) ring.style.strokeDasharray = `${score}, 100`;
          const txt = document.getElementById('score-text');
          if (txt) {
            const duration = 1500;
            const startTime = performance.now();
            function updateNum(currentTime) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeOutProgress = 1 - Math.pow(1 - progress, 3);
              txt.textContent = Math.round(score * easeOutProgress);
              if (progress < 1) requestAnimationFrame(updateNum);
            }
            requestAnimationFrame(updateNum);
          }
        }, 50);
      });
    } else {
      const ring = document.getElementById('score-ring');
      if (ring) ring.style.strokeDasharray = `${score}, 100`;
      const txt = document.getElementById('score-text');
      if (txt) txt.textContent = score;
    }
  }

  // FIX 2: update review header with real file name and real counts
  const titleEl = document.querySelector('.review-title');
  if (titleEl) titleEl.textContent = currentFileName;

  const pillErr = document.getElementById('pill-err');
  const pillAuto = document.getElementById('pill-auto');
  const pillTotal = document.getElementById('pill-total');
  const aiSuggested = ROWS.filter(r => r.issues.length && r.issues[0].auto).length;
  if (pillErr) pillErr.textContent = errors + ' errors';
  if (pillAuto) pillAuto.textContent = aiSuggested + ' AI-suggested';
  if (pillTotal) pillTotal.textContent = totalWithIssues + ' total';
}

// ═══════════════════════════════════════════════════════
// TABLE RENDER
// ═══════════════════════════════════════════════════════
function renderTbl() {
  const body = document.getElementById('tbl-body');
  if (!body) return;
  body.innerHTML = '';

  if (!dataLoaded || ROWS.length === 0) {
    body.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--text3);font-size:12px">No data loaded — upload a file first</td></tr>';
    return;
  }

  ROWS.forEach(r => {
    if (filt === 'err' && r.status !== 'err') return;
    if (filt === 'ai' && !(r.issues.length && r.issues[0].auto)) return;
    if (filt === 'pending' && (reso[r.id] || !r.issues.length)) return;

    const res = reso[r.id];
    const tr = document.createElement('tr');
    if (r.id === selId) tr.classList.add('sel');
    if (res) tr.classList.add('done-row');

    const ni = r.issues.find(i => i.field === 'vendor_name');
    const ci = r.issues.find(i => i.field === 'country');
    const cui = r.issues.find(i => i.field === 'currency');
    const poi = r.issues.find(i => i.field === 'postal_code');

    const nv = (res && res.vendor_name) || ni?.ai || r.name || '—';
    const cv = (res && res.country) || ci?.ai || r.country || '—';
    const cuv = (res && res.currency) || cui?.ai || r.cur || '—';
    const pov = (res && res.postal_code) || poi?.ai || r.postal || '—';

    const isAutoFixable = r.issues.length && r.issues[0].auto;
    const stHtml = res && !res.skipped
      ? '<span class="tag t-ok">Fixed</span>'
      : res?.skipped ? '<span class="tag t-skip">Skipped</span>'
        : isAutoFixable ? '<span class="tag t-auto">AI-suggested</span>'
          : r.status === 'err' ? '<span class="tag t-err">Error</span>'
            : r.status === 'warn' ? '<span class="tag t-warn">Warning</span>'
              : '<span class="tag t-ok">Clean</span>';

    tr.innerHTML = `
      <td class="td-n">${r.id}</td>
      <td class="${ni && !res ? 'td-err' : res?.vendor_name ? 'td-ok' : ''}" style="max-width:155px;overflow:hidden;text-overflow:ellipsis" title="${r.name || ''}">${nv}</td>
      <td class="${r.issues.find(i => i.field === 'vendor_code') && !res ? 'td-err' : ''}">${r.code || '—'}</td>
      <td class="${ci && !res ? 'td-err' : res?.country ? 'td-ok' : ''}">${cv}</td>
      <td class="${r.issues.find(i => i.field === 'payment_terms') && !res ? 'td-err' : ''}">${r.pay || '—'}</td>
      <td class="${r.issues.find(i => i.field === 'bank_key') && !res ? 'td-err' : ''}">${r.bank || '—'}</td>
      <td class="${r.issues.find(i => i.field === 'tax_number') && !res ? 'td-err' : ''}">${r.tax || '—'}</td>
      <td class="${poi && !res ? 'td-err' : res?.postal_code ? 'td-ok' : ''}">${pov}</td>
      <td class="${cui && !res ? 'td-err' : res?.currency ? 'td-ok' : ''}">${cuv}</td>
      <td>${stHtml}</td>`;
    tr.onclick = () => selRow(r.id);
    body.appendChild(tr);
  });
}

// ═══════════════════════════════════════════════════════
// NEW FEATURE: Download Audit Report (PDF via Print)
// ═══════════════════════════════════════════════════════
window.downloadAuditReport = function () {
  if (!dataLoaded) return showToast('No data to export', 'error');

  const win = window.open('', '_blank');
  let html = `<html><head><title>ReconSphere Audit Report</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
    h1 { color: #5b9cf6; margin-bottom: 5px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
    th { background: #f8f9fa; color: #555; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
    tr:nth-child(even) { background-color: #fdfdfd; }
    .type-ai { color: #8b6ff5; font-weight: 600; }
    .type-manual { color: #5b9cf6; font-weight: 600; }
    .type-skip { color: #f5b042; font-weight: 600; }
    .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
  </style></head><body>
  <h1>ReconSphere Audit Report</h1>
  <div class="meta">Generated on: ${new Date().toLocaleString()}</div>
  <table>
    <thead><tr><th>Row ID</th><th>Vendor Name</th><th>Field</th><th>Original Value</th><th>Corrected Value</th><th>Action Type</th></tr></thead>
    <tbody>`;

  let hasChanges = false;
  ROWS.forEach(row => {
    const res = reso[row.id];
    if (res && res.status !== 'pending' && res.status !== 'clean') {
      let actionHtml = '';
      if (res.status === 'ai-fixed') actionHtml = '<span class="type-ai">AI Fix</span>';
      else if (res.status === 'manual-fixed') actionHtml = '<span class="type-manual">Manual Edit</span>';
      else actionHtml = '<span class="type-skip">Skipped</span>';

      let changes = [];
      if (res.status === 'skipped') {
        changes.push({ field: '-', old: '-', new: '-' });
      } else {
        (row.issues || []).forEach(iss => {
          const oldVal = row[iss.field] || '';
          const newVal = res.edits && res.edits[iss.field] !== undefined ? res.edits[iss.field] : oldVal;
          if (oldVal !== newVal) {
            changes.push({ field: iss.field, old: oldVal, new: newVal });
          }
        });
        if (changes.length === 0) changes.push({ field: 'Multiple', old: 'Various', new: 'Corrected' });
      }

      changes.forEach(c => {
        hasChanges = true;
        html += `<tr>
          <td>${row.id}</td>
          <td>${row.name || row.code || 'Unknown'}</td>
          <td>${c.field}</td>
          <td>${c.old}</td>
          <td>${c.new}</td>
          <td>${actionHtml}</td>
        </tr>`;
      });
    }
  });

  if (!hasChanges) {
    html += `<tr><td colspan="6" style="text-align:center; padding: 20px;">No changes were made during this session.</td></tr>`;
  }

  html += `</tbody></table>
  <div class="footer">ReconSphere Data Migration Toolkit — Confidential & Proprietary</div>
  </body></html>`;

  win.document.write(html);
  win.document.close();

  // Trigger print after styles render
  setTimeout(() => {
    win.print();
  }, 250);
}

// ═══════════════════════════════════════════════════════
// ROW SELECT + AI PANEL
// ═══════════════════════════════════════════════════════
function selRow(id) {
  selId = id;
  const flagged = getVisibleFlagged();
  const idx = flagged.findIndex(r => r.id === id);
  if (idx >= 0) curIdx = idx;
  renderTbl();
  renderPanel();
  // Auto-scroll to AI review panel
  const panel = document.querySelector('.ai-panel');
  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPanel() {
  const flagged = getVisibleFlagged();
  const row = flagged[curIdx];
  const navEl = document.getElementById('issue-nav');
  const barEl = document.getElementById('action-bar');
  const bodyEl = document.getElementById('issue-body');
  if (!bodyEl) return;

  if (!dataLoaded) {
    bodyEl.innerHTML = '<div class="empty-panel"><div class="empty-ring"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text3)" stroke-width="1.4" stroke-linecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5.5v3M8 10v.5"/></svg></div><div class="empty-ttl">No data loaded</div><div class="empty-sub">Upload a file to begin review</div></div>';
    if (navEl) navEl.style.display = 'none';
    if (barEl) barEl.style.display = 'none';
    return;
  }

  if (!row) {
    bodyEl.innerHTML = `<div style="padding:32px 16px;text-align:center"><div style="width:46px;height:46px;border-radius:50%;background:var(--green-bg);border:.5px solid var(--green-bd);margin:0 auto 14px;display:flex;align-items:center;justify-content:center"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#30d9a4" stroke-width="2" stroke-linecap="round"><path d="M4 10l5 5 7-8"/></svg></div><div style="font-family:Syne,sans-serif;font-size:15px;font-weight:700;color:var(--green);margin-bottom:6px">All issues reviewed</div><div style="font-size:12px;color:var(--text3);margin-bottom:18px">Your corrected file is ready for export</div><button class="btn success" onclick="goto('export')">Go to export →</button></div>`;
    if (navEl) navEl.style.display = 'none';
    if (barEl) barEl.style.display = 'none';
    return;
  }

  if (navEl) navEl.style.display = 'flex';
  if (barEl) barEl.style.display = 'flex';
  document.getElementById('i-ctr').textContent = `Issue ${curIdx + 1} of ${flagged.length}`;
  const tagEl = document.getElementById('ai-row-tag');
  if (tagEl) tagEl.innerHTML = `<span class="tag t-ai">Row ${row.id}</span>`;

  const res = reso[row.id];
  let html = `<div class="vnd-label">Vendor</div><div class="vnd-name">${row.name || '—'}</div>`;

  (row.issues || []).forEach(issue => {
    const cur = (res && res[issue.field]) || issue.ai || '';
    html += `<div class="fblock">
      <div class="fhead">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="${issue.ai ? 'var(--accent)' : 'var(--red)'}" stroke-width="1"/><path d="M5 2.5v3M5 6.5v.5" stroke="${issue.ai ? 'var(--accent)' : 'var(--red)'}" stroke-width="1.2" stroke-linecap="round"/></svg>
        ${(issue.field || '').replace(/_/g, ' ')}
        <span class="tag ${issue.auto ? 't-auto' : 't-ai'}" style="margin-left:auto">${issue.auto ? 'Auto-fix' : 'AI suggestion'}</span>
      </div>
      <div class="fold">${issue.old || '(empty)'}</div>
      ${issue.ai
        ? `<div class="fnew"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#30d9a4" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 6.5l4 4 5-6"/></svg>${cur || issue.ai}<span class="fconf ${issue.conf >= 90 ? 'fc-hi' : 'fc-mid'}">${issue.conf}%</span></div>
           <div class="fedit-row"><input class="fedit" id="ed-${issue.field}" value="${cur || issue.ai}" placeholder="Edit suggestion…"/></div>`
        : `<div style="font-size:12px;color:var(--red);margin:6px 0">Cannot auto-correct — manual input required</div>
           <div class="fedit-row"><input class="fedit" id="ed-${issue.field}" value="${cur}" placeholder="Enter correct value…"/></div>`}
      <div class="fwhy"><div class="fwhy-title">Why flagged</div><div class="fwhy-text">${issue.why || ''}</div><div class="fwhy-rule">Rule → ${issue.rule || ''}</div></div>
    </div>`;
  });

  // Real-time Chat
  html += `
  <div style="margin-top:16px; border-top:.5px solid var(--border); padding-top:16px;">
    <div style="font-family:'Syne',sans-serif; font-size:13px; font-weight:600; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> Ask AI
    </div>
    <div id="ai-chat-history-${row.id}" style="margin-bottom:10px;"></div>
    <div style="display:flex; gap:6px;">
      <input type="text" id="ai-chat-input-${row.id}" onkeydown="if(event.key === 'Enter') sendChatMessage(${row.id})" placeholder="Ask Gemini how to resolve this..." style="flex:1; background:var(--bg4); border:1px solid var(--border2); border-radius:6px; padding:6px 10px; font-size:12px; color:var(--text); outline:none;"/>
      <button class="btn sm" onclick="sendChatMessage(${row.id})" style="padding:4px 10px;">Send</button>
    </div>
  </div>`;

  if (res && !res.skipped) html += `<div class="resolved-notice"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#30d9a4" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 6.5l4 4 5-6"/></svg>Row resolved — you can still edit above and re-save</div>`;
  bodyEl.innerHTML = html;
}

window.sendChatMessage = async function (rowId) {
  const input = document.getElementById('ai-chat-input-' + rowId);
  const history = document.getElementById('ai-chat-history-' + rowId);
  if (!input || !input.value.trim()) return;

  const userText = input.value.trim();
  history.innerHTML += '<div style="background:var(--bg3); border-radius:var(--r); padding:8px 12px; font-size:12px; color:var(--text); margin-bottom:6px; margin-left:20px; border-bottom-right-radius:2px;"><b>You:</b> ' + userText + '</div>';
  input.value = '';

  const loadingId = 'loading-' + Date.now();
  history.innerHTML += '<div id="' + loadingId + '" style="background:rgba(91,156,246,0.1); border:1px solid rgba(91,156,246,0.2); border-radius:var(--r); padding:8px 12px; font-size:12px; color:var(--accent); margin-bottom:6px; margin-right:20px; border-bottom-left-radius:2px;"><i>Gemini is thinking...</i></div>';

  // Find the row data for context
  const rowData = ROWS.find(r => r.id === rowId) || {};
  const context = {
    name: rowData.name,
    code: rowData.code,
    country: rowData.country,
    pay: rowData.pay,
    bank: rowData.bank,
    tax: rowData.tax,
    postal: rowData.postal,
    cur: rowData.cur,
    issues: (rowData.issues || []).map(i => ({ field: i.field, old: i.old, reason: i.why, rule: i.rule }))
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: userText, context })
    });
    const result = await response.json();

    const el = document.getElementById(loadingId);
    if (el) el.remove();

    const replyText = result.reply || "No response received.";

    history.innerHTML += '<div style="background:rgba(91,156,246,0.1); border:1px solid rgba(91,156,246,0.2); border-radius:var(--r); padding:8px 12px; font-size:12px; color:var(--text); margin-bottom:6px; margin-right:20px; border-bottom-left-radius:2px;"><b>AI:</b> ' + replyText.replace(/\n/g, '<br>') + '</div>';
  } catch (err) {
    const el = document.getElementById(loadingId);
    if (el) el.remove();
    history.innerHTML += '<div style="background:var(--red-bg); border:1px solid var(--red-bd); border-radius:var(--r); padding:8px 12px; font-size:12px; color:var(--red); margin-bottom:6px; margin-right:20px; border-bottom-left-radius:2px;"><b>Error:</b> Failed to connect to AI server.</div>';
  }
}

// ═══════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════
function collectEdits(row) {
  const obj = {};
  (row.issues || []).forEach(i => {
    const el = document.getElementById('ed-' + i.field);
    obj[i.field] = (el && el.value.trim()) || i.ai || '';
  });
  return obj;
}
function acceptCur() { const flagged = getVisibleFlagged(); const row = flagged[curIdx]; if (!row) return; reso[row.id] = collectEdits(row); checkConfetti(); updStats(); renderTbl(); nextI(); }
function saveEdit() { acceptCur(); }
function rejectCur() { const flagged = getVisibleFlagged(); const row = flagged[curIdx]; if (!row) return; reso[row.id] = { skipped: true }; checkConfetti(); updStats(); renderTbl(); nextI(); }
function nextI() { const flagged = getVisibleFlagged(); if (curIdx < flagged.length - 1) { curIdx++; selId = flagged[curIdx].id; renderTbl(); renderPanel(); } else renderPanel(); }
function prevI() { const flagged = getVisibleFlagged(); if (curIdx > 0) { curIdx--; selId = flagged[curIdx].id; renderTbl(); renderPanel(); } }

function acceptAllHighConf() {
  const flagged = getFlagged();
  let count = 0;
  flagged.forEach(r => {
    if (reso[r.id] && !reso[r.id].skipped) return;
    if (r.issues.some(i => i.conf >= 90)) {
      let edits = {};
      r.issues.forEach(i => { if (i.conf >= 90) edits[i.field] = i.ai; else edits[i.field] = i.old; });
      reso[r.id] = edits;
      count++;
    }
  });
  if (count > 0) {
    showToast(`Accepted high-confidence fixes for ${count} rows`, 'success');
    checkConfetti(); updStats(); renderTbl(); renderPanel();
  } else {
    showToast('No unreviewed high-confidence fixes found', 'info');
  }
}

function checkConfetti() {
  const totalWithIssues = ROWS.filter(r => r.issues.length > 0).length;
  const fixed = Object.values(reso).filter(x => !x.skipped).length;
  const skipped = Object.values(reso).filter(x => x.skipped).length;
  if (totalWithIssues > 0 && (fixed + skipped) === totalWithIssues && !window.confettiFired) {
    window.confettiFired = true;
    fireConfetti();
  }
}

function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = [];
  for (let i = 0; i < 150; i++) particles.push({ x: Math.random() * canvas.width, y: -20, vx: (Math.random() - 0.5) * 10, vy: Math.random() * 5 + 2, color: `hsl(${Math.random() * 360}, 100%, 50%)` });
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 6, 6); });
    frame++;
    if (frame < 120) requestAnimationFrame(draw); else canvas.style.display = 'none';
  }
  draw();
}

// ═══════════════════════════════════════════════════════
// EXPORT DOWNLOADS
// ═══════════════════════════════════════════════════════
function triggerDownload(rows, suffix) {
  if (rows.length === 0) return showToast('No rows to export', 'error');
  showToast('Generating file...', 'info');
  fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows, fileName: currentFileName + '_' + suffix + '.csv' })
  }).then(res => res.text()).then(text => {
    // Add UTF-8 BOM so Excel opens the CSV correctly
    const blob = new Blob(["\uFEFF" + text], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFileName + '_' + suffix + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast('Download complete', 'success');
  }).catch(err => showToast('Download failed', 'error'));
}

function downloadCorrected() {
  if (!dataLoaded) return showToast('No data to download', 'error');
  // Combine original with reso (edits)
  const finalRows = ROWS.map(r => {
    const edits = reso[r.id] || {};
    if (edits.skipped) return null; // don't include skipped in main export
    return {
      VENDOR_CODE: r.code,
      VENDOR_NAME: edits.vendor_name || r.name,
      COUNTRY: edits.country || r.country,
      PAYMENT_TERMS: edits.payment_terms || r.pay,
      BANK_KEY: edits.bank_key || r.bank,
      TAX_NUMBER: edits.tax_number || r.tax,
      POSTAL_CODE: edits.postal_code || r.postal,
      CURRENCY: edits.currency || r.cur
    };
  }).filter(r => r !== null);
  triggerDownload(finalRows, 'corrected');
}

window.uploadToAzure = async function () {
  if (!dataLoaded) return showToast('No data to upload', 'error');
  showToast('Uploading to Azure Blob Storage...', 'info');

  const finalRows = ROWS.map(r => {
    const edits = reso[r.id] || {};
    if (edits.skipped) return null;
    return {
      VENDOR_CODE: r.code,
      VENDOR_NAME: edits.vendor_name || r.name,
      COUNTRY: edits.country || r.country,
      PAYMENT_TERMS: edits.payment_terms || r.pay,
      BANK_KEY: edits.bank_key || r.bank,
      TAX_NUMBER: edits.tax_number || r.tax,
      POSTAL_CODE: edits.postal_code || r.postal,
      CURRENCY: edits.currency || r.cur
    };
  }).filter(r => r !== null);

  if (finalRows.length === 0) return showToast('No rows to upload', 'error');

  const headers = Object.keys(finalRows[0]).join(",");
  const lines = finalRows.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = "\uFEFF" + [headers, ...lines].join("\n");

  const fileName = currentFileName + '_azure_export.csv';
  const file = new File([csv], fileName, { type: 'text/csv' });
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/azure/upload', {
      method: 'POST',
      body: formData
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Upload failed');

    showToast(`Successfully pushed to Azure!`, 'success');
    console.log("Azure SAS URL:", result.url);
  } catch (err) {
    showToast('Azure Upload Failed: ' + err.message, 'error');
  }
}

function downloadSkipped() {
  if (!dataLoaded) return showToast('No data to download', 'error');
  const skippedRows = ROWS.filter(r => reso[r.id] && reso[r.id].skipped).map(r => ({
    VENDOR_CODE: r.code,
    VENDOR_NAME: r.name,
    COUNTRY: r.country,
    PAYMENT_TERMS: r.pay,
    BANK_KEY: r.bank,
    TAX_NUMBER: r.tax,
    POSTAL_CODE: r.postal,
    CURRENCY: r.cur,
    STATUS: 'SKIPPED'
  }));
  triggerDownload(skippedRows, 'skipped');
}

// ═══════════════════════════════════════════════════════
// FILTER BUTTONS — FIX 3: style handled by CSS .fbtn.on
// ═══════════════════════════════════════════════════════
function setF(f, btn) {
  filt = f;
  document.querySelectorAll('.fbtn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  curIdx = 0; selId = null;
  renderTbl();
  renderPanel();
}

// ═══════════════════════════════════════════════════════
// TAB NAVIGATION — FIX 4+5: tabs always accessible after data loaded
// ═══════════════════════════════════════════════════════
function goto(s) {
  // Hide landing page if it exists
  const landing = document.getElementById('s-landing');
  if (landing) landing.style.display = 'none';

  // Show the main tab navigation wrapper that is hidden by default
  const tabWrap = document.getElementById('tab-nav-wrap');
  if (tabWrap) tabWrap.style.display = 'block';

  document.querySelectorAll('.screen').forEach(x => x.classList.remove('active'));
  const screen = document.getElementById('s-' + s);
  if (screen) screen.classList.add('active');

  // Show stats row if going to review or export
  const stats = document.getElementById('main-stats');
  if (stats) {
    stats.style.display = (s === 'review' || s === 'export') ? 'grid' : 'none';
  }

  const order = { upload: 0, review: 1, export: 2 };
  ['tb-upload', 'tb-review', 'tb-export'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('active', 'done');
    if (i < order[s]) el.classList.add('done');
    else if (i === order[s]) el.classList.add('active');
  });

  if (s === 'review') {
    updStats();
    renderTbl();
    const flagged = getFlagged();
    // FIX 4: don't reset selId — keep reviewing where user left off
    if (flagged.length && !selId) {
      curIdx = 0;
      selId = flagged[0].id;
    }
    renderPanel();
  }

  if (s === 'export') {
    updStats();
  }
}

// ═══════════════════════════════════════════════════════
// MAP API RESPONSE → ROWS
// ═══════════════════════════════════════════════════════
function renderFromAPI(apiResult) {
  isDemoMode = false;

  function getField(row, ...names) {
    for (const name of names) {
      const v = row[name] ?? row[name.toUpperCase()] ?? row[name.toLowerCase()];
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
    }
    return '—';
  }

  const issuesByRow = {};
  (apiResult.issues || []).forEach(issue => {
    const r = issue.row;
    if (!issuesByRow[r]) issuesByRow[r] = [];
    issuesByRow[r].push({
      field: (issue.field || '').toLowerCase(),
      old: issue.value || '',
      ai: issue.ai_suggestion || null,
      conf: issue.confidence || 0,
      why: issue.reason || '',
      rule: issue.rule || '',
      auto: issue.auto_fixed || false,
    });
  });

  ROWS = (apiResult.rows || []).map((rawRow, idx) => {
    const rowNum = idx + 2;
    const issues = issuesByRow[rowNum] || [];
    const hasUnfixable = issues.some(i => !i.ai && i.conf === 0);
    return {
      id: rowNum,
      name: getField(rawRow, 'VENDOR_NAME', 'vendor_name'),
      code: getField(rawRow, 'VENDOR_CODE', 'vendor_code'),
      country: getField(rawRow, 'COUNTRY', 'country'),
      pay: getField(rawRow, 'PAYMENT_TERMS', 'payment_terms'),
      bank: getField(rawRow, 'BANK_KEY', 'bank_key'),
      tax: getField(rawRow, 'TAX_NUMBER', 'tax_number'),
      postal: getField(rawRow, 'POSTAL_CODE', 'postal_code'),
      cur: getField(rawRow, 'CURRENCY', 'currency'),
      status: issues.length === 0 ? 'ok' : (hasUnfixable ? 'err' : 'warn'),
      issues: issues,
    };
  });

  reso = {}; curIdx = 0; selId = null;
  console.log(`[renderFromAPI] ${ROWS.length} rows, ${(apiResult.issues || []).length} issues`);
}

// ═══════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════
// ── Animated progress step runner ──
// steps: [{pct, msg, delay}]  — delay = ms BEFORE this step starts
function runProgressSteps(steps, onComplete) {
  let i = 0;
  function tick() {
    if (window.uploadCancelled) return;
    if (i >= steps.length) { if (onComplete) onComplete(); return; }
    const s = steps[i];
    updateProgress(s.pct, s.msg);
    i++;
    setTimeout(tick, s.delay || 400);
  }
  tick();
}

function beginUpload(file) {
  window.uploadCancelled = false;
  document.getElementById('prog-box').style.display = 'block';
  updateProgress(0, '');

  if (!file) {
    // DEMO MODE — detailed steps, ~3 seconds total
    currentFileName = 'vendor_master_demo';
    document.getElementById('prog-name').textContent = 'vendor_master_demo.xlsx';
    document.getElementById('prog-meta').textContent = '13 rows · 12 columns · demo file';
    document.getElementById('prog-badge').textContent = 'XLS';

    const steps = [
      { pct: 10, msg: 'Uploading file…', delay: 700 },
      { pct: 25, msg: 'Validating structure…', delay: 700 },
      { pct: 40, msg: 'Reviewing — 13 rows, 12 columns', delay: 800 },
      { pct: 60, msg: 'Running validation rules…', delay: 900 },
      { pct: 80, msg: 'AI generating suggestions…', delay: 900 },
      { pct: 100, msg: 'Complete ✓', delay: 600 },
    ];

    runProgressSteps(steps, () => {
      window.validationResult = null;
      isDemoMode = true;
      ROWS = SAMPLE_ROWS;
      dataLoaded = true;
      unlockTabs();
      setTimeout(() => goto('review'), 500);
    });
    return;
  }

  // REAL MODE — show detailed step-by-step progress with animation
  currentFileName = file.name.replace(/\.[^/.]+$/, ''); // FIX 2: strip extension
  const ext = file.name.split('.').pop().toUpperCase();
  const sizeKB = file.size / 1024;
  const sizeStr = sizeKB >= 1024 ? (sizeKB / 1024).toFixed(1) + ' MB' : Math.round(sizeKB) + ' KB';
  document.getElementById('prog-name').textContent = file.name;
  document.getElementById('prog-meta').textContent = sizeStr + ' · processing…';
  document.getElementById('prog-badge').textContent = ext;

  // Global abort controller for canceling
  if (window.uploadAbortController) {
    window.uploadAbortController.abort();
  }
  window.uploadAbortController = new AbortController();

  // Start animated progress while the API call runs in parallel
  updateProgress(5, 'Uploading file…');

  // Fake progress steps that animate while the real API call happens
  let apiDone = false;
  let apiResult = null;
  let apiError = null;
  let currentStep = 0;

  const fakeSteps = [
    { pct: 15, msg: 'Uploading file…', delay: 350 },
    { pct: 30, msg: 'Validating structure…', delay: 400 },
    { pct: 45, msg: 'Parsing file data…', delay: 400 },
    { pct: 55, msg: 'Running validation rules…', delay: 500 },
    { pct: 65, msg: 'AI generating suggestions…', delay: 600 },
    { pct: 72, msg: 'Analyzing results…', delay: 500 },
  ];

  function runFakeProgress() {
    if (window.uploadCancelled) return;
    if (currentStep >= fakeSteps.length) {
      // All fake steps done — hold at 72% until API finishes
      if (apiDone) {
        finishUpload();
      }
      return;
    }
    const s = fakeSteps[currentStep];
    updateProgress(s.pct, s.msg);
    currentStep++;

    // If API already done mid-animation, fast-forward remaining steps
    if (apiDone && currentStep < fakeSteps.length) {
      setTimeout(runFakeProgress, 150); // speed up remaining
    } else {
      setTimeout(runFakeProgress, s.delay);
    }
  }

  function finishUpload() {
    if (window.uploadCancelled) return;
    if (apiError && apiError !== 'Upload cancelled by user') {
      document.getElementById('prog-box').style.display = 'none';
      const uz = document.getElementById('uz');
      if (uz) {
        uz.innerHTML = `
          <div style="color:var(--red); padding: 20px;">
            <div style="width:48px; height:48px; border-radius:50%; background:var(--red-bg); border:1px solid var(--red-bd); display:flex; align-items:center; justify-content:center; margin: 0 auto 16px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h3 style="font-family:'Syne',sans-serif; font-size:18px; margin-bottom:8px;">Validation Failed</h3>
            <p style="font-size:13px; color:var(--text2); margin-bottom:20px;">${apiError}</p>
            <button class="btn primary" onclick="location.reload()">Try Again</button>
          </div>
        `;
      }
      return;
    }

    // Final animated steps after API responds
    const rowCount = (apiResult.rows || []).length;
    const issueCount = (apiResult.issues || []).length;
    const colCount = apiResult.rows && apiResult.rows.length > 0 ? Object.keys(apiResult.rows[0]).length : '—';

    // Update meta with real row/col info
    document.getElementById('prog-meta').textContent = sizeStr + ' · ' + rowCount + ' rows · ' + colCount + ' columns';

    const finishSteps = [
      { pct: 85, msg: 'Reviewing — ' + rowCount + ' rows, ' + colCount + ' columns', delay: 350 },
      { pct: 95, msg: issueCount + ' issues found · finalizing…', delay: 350 },
      { pct: 100, msg: 'Complete ✓', delay: 300 },
    ];

    runProgressSteps(finishSteps, () => {
      window.validationResult = apiResult;
      renderFromAPI(apiResult);
      dataLoaded = true;
      unlockTabs();
      setTimeout(() => goto('review'), 500);
    });
  }

  // Start the fake progress animation immediately
  setTimeout(runFakeProgress, 200);

  // Fire the actual API call in parallel
  const formData = new FormData();
  formData.append('file', file);
  const moduleSel = document.getElementById('module-select');
  formData.append('module', moduleSel ? moduleSel.value : 'vendor_master');

  fetch('/api/validate', {
    method: 'POST',
    body: formData,
    signal: window.uploadAbortController.signal
  })
    .then(response => {
      if (!response.ok) return response.json().then(e => { throw new Error(e.error || 'Server error'); });
      return response.json();
    })
    .then(result => {
      apiResult = result;
      apiDone = true;
      // If fake steps already finished, complete now
      if (currentStep >= fakeSteps.length) finishUpload();
    })
    .catch(err => {
      if (err.name === 'AbortError') {
        apiError = 'Upload cancelled by user';
      } else {
        apiError = err.message;
      }
      apiDone = true;
      if (currentStep >= fakeSteps.length) finishUpload();
    });
}

window.cancelUpload = function () {
  window.uploadCancelled = true;
  if (window.uploadAbortController) {
    window.uploadAbortController.abort();
    window.uploadAbortController = null;
  }
  const progBox = document.getElementById('prog-box');
  if (progBox) progBox.style.display = 'none';
  const fileInput = document.getElementById('file-input');
  if (fileInput) fileInput.value = '';
  showToast('Upload cancelled', 'info');
}

function updateProgress(pct, msg) {
  const bar = document.getElementById('pbar');
  const st = document.getElementById('prog-status');
  const sp = document.getElementById('pstep');
  if (bar) bar.style.width = pct + '%';
  if (st) st.textContent = msg;
  if (sp) {
    sp.textContent = msg;
    // Re-trigger fade animation on step text
    sp.style.animation = 'none';
    sp.offsetHeight; // force reflow
    sp.style.animation = '';
  }
}

// FIX 4+5: unlock review and export tabs once data is loaded
function unlockTabs() {
  ['tb-review', 'tb-export'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';
      el.style.cursor = 'pointer';
    }
  });
}

function handleFileSelect(input) {
  const file = input.files[0];
  console.log('[handleFileSelect] file:', file ? file.name : 'none');
  if (file) { input.value = ''; beginUpload(file); }
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Drag and drop
  const uz = document.getElementById('uz');
  if (uz) {
    uz.addEventListener('dragover', e => { e.preventDefault(); uz.style.borderColor = 'rgba(91,156,246,.6)'; });
    uz.addEventListener('dragleave', () => { uz.style.borderColor = ''; });
    uz.addEventListener('drop', e => {
      e.preventDefault(); uz.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file) beginUpload(file);
    });
  }

  // 3D Hero Carousel Auto-rotate
  const hcCards = document.querySelectorAll('.hc-card');
  if (hcCards.length > 0) {
    let currIdx = 0;

    function updateCards() {
      hcCards.forEach((c, i) => {
        c.className = 'hc-card'; // reset
        if (i === currIdx) c.classList.add('active');
        else if (i === (currIdx - 1 + hcCards.length) % hcCards.length) c.classList.add('prev');
        else if (i === (currIdx + 1) % hcCards.length) c.classList.add('next');
      });
    }
    updateCards();

    let carouselInt = setInterval(() => {
      currIdx = (currIdx + 1) % hcCards.length;
      updateCards();
    }, 4000);

    // Pause on interaction
    const pauseCarousel = () => clearInterval(carouselInt);
    const hcScene = document.querySelector('.carousel-scene');
    if (hcScene) {
      hcScene.addEventListener('touchstart', pauseCarousel, { passive: true });
      hcScene.addEventListener('mousedown', pauseCarousel);
    }
  }

  // FIX 4+5: lock review/export tabs until data loaded
  ['tb-review', 'tb-export'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.pointerEvents = 'none';
      el.style.opacity = '0.4';
      el.style.cursor = 'default';
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (document.getElementById('s-review').classList.contains('active')) {
      if (e.key === 'ArrowRight') nextI();
      if (e.key === 'ArrowLeft') prevI();
      if (e.key === 'a' || e.key === 'A') acceptCur();
      if (e.key === 's' || e.key === 'S') rejectCur();
    }
  });

  updStats();
  renderTbl();
});