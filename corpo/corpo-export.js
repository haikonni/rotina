/* ===== CORPO EXPORT — backup/restore CSV/JSON ===== */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  function backupJSON() {
    const all = C().storage.loadAll();
    const extras = {};
    ['rot-bio-hist'].forEach(k => { try { extras[k] = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) {} });
    return {app: 'rotina-corpo', versao: '1.0.0', data: new Date().toISOString(), corpo: all, extras};
  }
  function downloadJSON() {
    const blob = new Blob([JSON.stringify(backupJSON(), null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'corpo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function historicoCSV() {
    const H = window.CorpoHistorico;
    const rows = H ? H.todos() : [];
    const cols = ['data', 'peso', 'gordura_pct', 'massa_muscular', 'agua_pct', 'visceral', 'metabolismo', 'imc', 'source'];
    const lines = [cols.join(',')];
    rows.forEach(r => lines.push(cols.map(c => r[c] == null ? '' : String(r[c])).join(',')));
    return lines.join('\n');
  }
  function downloadCSV() {
    const blob = new Blob([historicoCSV()], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'corpo-historico-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }
  function restoreJSON(obj) {
    if (!obj || obj.app !== 'rotina-corpo' || !obj.corpo) return false;
    Object.entries(obj.corpo).forEach(([k, v]) => C().storage.save(k, v));
    if (obj.extras && obj.extras['rot-bio-hist']) localStorage.setItem('rot-bio-hist', JSON.stringify(obj.extras['rot-bio-hist']));
    return true;
  }
  window.CorpoExport = {backupJSON, downloadJSON, historicoCSV, downloadCSV, restoreJSON};
  console.log('[CorpoExport] ok');
})();
