/* ===== CORPO MEDIDAS — circunferências + fotos de progresso ===== */
/* Depende de: corpo-core.js — expõe window.CorpoMedidas.
   Fotos: guarda só metadados (data/tipo); o arquivo fica com o usuário. */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  const KEY = 'medidas';

  const CAMPOS = ['pescoco', 'cintura', 'quadril', 'braco_e', 'braco_d', 'coxa_e', 'coxa_d', 'pant_e', 'pant_d'];
  const LABELS = {pescoco: 'Pescoço', cintura: 'Cintura', quadril: 'Quadril',
                  braco_e: 'Braço E', braco_d: 'Braço D', coxa_e: 'Coxa E',
                  coxa_d: 'Coxa D', pant_e: 'Panturrilha E', pant_d: 'Panturrilha D'};

  function load() { return C().storage.load(KEY, []) || []; }
  function save(arr) {
    arr.sort((a, b) => String(a.data).localeCompare(String(b.data)));
    return C().storage.save(KEY, arr);
  }

  function adicionar(m) {
    if (!m || !m.data) return null;
    const rec = {data: m.data, ts: Date.now(), fotos: m.fotos || []};
    CAMPOS.forEach(k => {
      const v = C().utils.num(m[k]);
      if (v != null) rec[k] = v;
    });
    const arr = load();
    const i = arr.findIndex(r => r.data === rec.data);
    if (i >= 0) arr[i] = Object.assign({}, arr[i], rec);
    else arr.push(rec);
    save(arr);
    return rec;
  }

  function removerPorData(data) { save(load().filter(r => r.data !== data)); }
  function ultima() { const a = load(); return a.length ? a[a.length - 1] : null; }

  // Delta vs primeira medida registrada
  function deltas() {
    const a = load();
    if (a.length < 2) return null;
    const p = a[0], u = a[a.length - 1];
    const out = {de: p.data, ate: u.data};
    CAMPOS.forEach(k => {
      if (p[k] != null && u[k] != null) out[k] = C().utils.round1(u[k] - p[k]);
    });
    return out;
  }

  window.CorpoMedidas = {CAMPOS, LABELS, load, save, adicionar, removerPorData, ultima, deltas};
  console.log('[CorpoMedidas] ok');
})();
