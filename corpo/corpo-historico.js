/* ===== CORPO HISTORICO — exames InBody/manuais, CRUD, gráficos ===== */
/* Depende de: corpo-core.js — expõe window.CorpoHistorico.
   Lê também rot-bio-hist (aba Bio) e funde na visão. */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  const KEY = 'historico';
  const BIO_KEY = 'rot-bio-hist';

  function load() {
    return C().storage.load(KEY, []) || [];
  }
  function save(arr) {
    arr.sort((a, b) => String(a.data).localeCompare(String(b.data)));
    return C().storage.save(KEY, arr);
  }

  // Funde exames da aba Bio (rot-bio-hist) sem duplicar datas
  function todos() {
    const base = load();
    let bio = [];
    try { bio = JSON.parse(localStorage.getItem(BIO_KEY) || '[]'); } catch (e) { bio = []; }
    const datas = new Set(base.map(r => r.data));
    const extra = bio
      .filter(r => r && r.data && !datas.has(r.data))
      .map(r => Object.assign({}, r, {source: 'bio'}));
    return base.concat(extra).sort((a, b) => String(a.data).localeCompare(String(b.data)));
  }

  function adicionar(rec) {
    if (!rec || !rec.data) return null;
    if (rec.peso == null && rec.gordura_pct == null) return null;
    rec.source = rec.source || 'manual';
    rec.ts = Date.now();
    const arr = load();
    const i = arr.findIndex(r => r.data === rec.data);
    if (i >= 0) arr[i] = Object.assign({}, arr[i], rec);
    else arr.push(rec);
    save(arr);
    return rec;
  }

  function removerPorData(data) {
    save(load().filter(r => r.data !== data));
  }

  function ultimo() {
    const t = todos();
    return t.length ? t[t.length - 1] : null;
  }

  // Série de uma métrica: [{x: data, y: valor}]
  function serie(campo) {
    return todos()
      .filter(r => r[campo] != null && !isNaN(Number(r[campo])))
      .map(r => ({x: r.data, y: Number(r[campo])}));
  }

  // Tendência kg/semana por regressão linear na janela (dias)
  function tendenciaPeso(janelaDias = 14) {
    const s = serie('peso').slice(-janelaDias);
    if (s.length < 2) return {slopeSemana: 0, n: s.length, confiavel: false};
    const xs = s.map((_, i) => i);
    const ys = s.map(p => p.y);
    // normaliza pelo span real de dias
    const d0 = new Date(s[0].x), d1 = new Date(s[s.length - 1].x);
    const spanDias = Math.max(1, Math.round((d1 - d0) / 86400000));
    const slopeDia = C().utils.linearSlope(xs, ys) * (s.length - 1) / spanDias;
    return {slopeSemana: C().utils.round1(slopeDia * 7 * 10) / 10, n: s.length, confiavel: s.length >= 4 && spanDias >= 6};
  }

  // Pontuação InBody 0-100 (heurística local: gordura + músculo + visceral)
  function pontuacao(rec, perfil) {
    if (!rec) return null;
    let pts = 70;
    if (rec.gordura_pct != null) {
      const alvo = (perfil && perfil.meta_gordura) || 15;
      pts -= Math.max(-10, Math.min(25, (rec.gordura_pct - alvo) * 1.5));
    }
    if (rec.massa_muscular != null && rec.peso != null && rec.peso > 0) {
      const ratio = rec.massa_muscular / rec.peso;
      pts += Math.max(-10, Math.min(15, (ratio - 0.42) * 200));
    }
    if (rec.visceral != null) pts -= Math.max(0, Math.min(15, (rec.visceral - 8) * 1.2));
    return Math.max(30, Math.min(100, Math.round(pts)));
  }

  window.CorpoHistorico = {load, save, todos, adicionar, removerPorData, ultimo, serie, tendenciaPeso, pontuacao};
  console.log('[CorpoHistorico] ok');
})();
