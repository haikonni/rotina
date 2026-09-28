/* ===== CORPO AGUA — tracker diário + meta automática ===== */
/* Depende de: corpo-core.js (+ corpo-perfil.js p/ meta) — expõe window.CorpoAgua */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  const KEY = 'agua';

  function load() { return C().storage.load(KEY, {}) || {}; }
  function save(o) { return C().storage.save(KEY, o); }

  function hoje() { return C().utils.todayISO(); }

  function adicionar(ml, iso) {
    ml = Number(ml) || 0;
    if (ml <= 0) return null;
    const d = iso || hoje();
    const o = load();
    o[d] = (Number(o[d]) || 0) + ml;
    save(o);
    return o[d];
  }

  function total(iso) { return Number(load()[iso || hoje()]) || 0; }

  function meta() {
    if (window.CorpoPerfil) return window.CorpoPerfil.metaAgua();
    return 2800;
  }

  function progresso(iso) {
    const t = total(iso), m = meta();
    return {total_ml: t, meta_ml: m, pct: Math.min(100, Math.round(t / m * 100))};
  }

  function media7d() {
    const o = load();
    let soma = 0, n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      soma += Number(o[iso]) || 0; n++;
    }
    return Math.round(soma / n);
  }

  function remover(iso) {
    const o = load();
    delete o[iso || hoje()];
    save(o);
  }

  window.CorpoAgua = {adicionar, total, meta, progresso, media7d, remover, load};
  console.log('[CorpoAgua] ok');
})();
