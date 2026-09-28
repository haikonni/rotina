/* ===== CORPO JEJUM — timer flexível start/stop + planos ===== */
/* Depende de: corpo-core.js — expõe window.CorpoJejum */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  const KEY = 'jejum';

  const PLANOS = {'12:12': 12, '16:8': 16, '18:6': 18, '20:4': 20, 'OMAD': 23, 'Jantar-livre': 16};

  function state() {
    return C().storage.load(KEY, {plano: '16:8', ativo: null, historico: []});
  }
  function saveState(s) { return C().storage.save(KEY, s); }

  function horasPlano(plano) { return PLANOS[plano] || 16; }

  function iniciar() {
    const s = state();
    if (s.ativo) return s;
    s.ativo = {inicio: Date.now()};
    saveState(s);
    return s;
  }

  function parar() {
    const s = state();
    if (!s.ativo) return null;
    const fim = Date.now();
    const h = (fim - s.ativo.inicio) / 3600000;
    const meta = horasPlano(s.plano);
    const reg = {
      data: new Date(s.ativo.inicio).toISOString().slice(0, 10),
      inicio: new Date(s.ativo.inicio).toISOString(),
      fim: new Date(fim).toISOString(),
      horas: Math.round(h * 10) / 10,
      completo: h >= meta - 0.25
    };
    s.historico.push(reg);
    s.ativo = null;
    saveState(s);
    return reg;
  }

  function status() {
    const s = state();
    if (!s.ativo) return {ativo: false, plano: s.plano, meta_h: horasPlano(s.plano)};
    const decorrido = (Date.now() - s.ativo.inicio) / 3600000;
    const meta = horasPlano(s.plano);
    return {ativo: true, plano: s.plano, meta_h: meta,
            decorrido_h: Math.round(decorrido * 10) / 10,
            restante_h: Math.round((meta - decorrido) * 10) / 10,
            progresso: Math.min(100, Math.round(decorrido / meta * 100)),
            inicio: new Date(s.ativo.inicio)};
  }

  function historico(semanas = 4) {
    const s = state();
    const corte = Date.now() - semanas * 7 * 86400000;
    return s.historico.filter(r => new Date(r.inicio).getTime() >= corte);
  }

  function diasCompletos7d() {
    const map = {};
    historico(2).forEach(r => { if (r.completo) map[r.data] = true; });
    return Object.keys(map).length;
  }

  function setPlano(p) {
    const s = state();
    if (PLANOS[p]) { s.plano = p; saveState(s); }
    return s;
  }

  window.CorpoJejum = {PLANOS, state, iniciar, parar, status, historico, diasCompletos7d, setPlano};
  console.log('[CorpoJejum] ok');
})();
