/* ===== CORPO DIARIO — refeições, peso da manhã, treino ===== */
/* Depende de: corpo-core.js — expõe window.CorpoDiario.
   Complementa rot-nutri-<data> (aba Nutri): lê os dois, escreve no próprio. */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  const KEY = 'diario';

  function load() { return C().storage.load(KEY, {}) || {}; }
  function save(o) { return C().storage.save(KEY, o); }
  function hoje() { return C().utils.todayISO(); }

  function dia(iso) {
    const o = load();
    return o[iso || hoje()] || {refeicoes: [], peso_manha: null, treino: false, passos: null, notas: ''};
  }

  function setDia(iso, patch) {
    const o = load();
    const d = iso || hoje();
    o[d] = Object.assign(dia(d), patch || {});
    save(o);
    return o[d];
  }

  function addRefeicao(item, iso) {
    const d = dia(iso);
    d.refeicoes.push({
      nome: item.nome || 'Item', qtd: item.qtd || '',
      kcal: Number(item.kcal) || 0, p: Number(item.p) || 0,
      c: Number(item.c) || 0, g: Number(item.g) || 0,
      ts: Date.now()
    });
    return setDia(iso, d);
  }

  function removeRefeicao(idx, iso) {
    const d = dia(iso);
    d.refeicoes.splice(idx, 1);
    return setDia(iso, d);
  }

  // Totais do dia somando corpo-diario + rot-nutri-<data> (sem duplicar se vazio)
  function totais(iso) {
    const d0 = iso || hoje();
    const t = {kcal: 0, p: 0, c: 0, g: 0, n_corpo: 0, n_nutri: 0};
    dia(d0).refeicoes.forEach(r => {
      t.kcal += r.kcal; t.p += r.p; t.c += r.c; t.g += r.g; t.n_corpo++;
    });
    try {
      const arr = JSON.parse(localStorage.getItem('rot-nutri-' + d0) || '[]');
      (Array.isArray(arr) ? arr : []).forEach(it => {
        t.kcal += Number(it.kcal) || 0; t.p += Number(it.proteina) || 0;
        t.c += Number(it.carbo) || 0; t.g += Number(it.gordura) || 0; t.n_nutri++;
      });
    } catch (e) {}
    t.kcal = Math.round(t.kcal);
    return t;
  }

  function aderencia(iso, metaKcal) {
    const t = totais(iso);
    if (!metaKcal || t.kcal === 0) return null;
    const diff = Math.abs(t.kcal - metaKcal) / metaKcal;
    return {kcal: t.kcal, meta: metaKcal, dentro: diff <= 0.1, pct: Math.round(t.kcal / metaKcal * 100)};
  }

  window.CorpoDiario = {dia, setDia, addRefeicao, removeRefeicao, totais, aderencia, load};
  console.log('[CorpoDiario] ok');
})();
