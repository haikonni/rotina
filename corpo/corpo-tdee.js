/* ===== CORPO TDEE — algoritmo adaptativo estilo MacroFactor ===== */
/* TDEE = kcal_media - (Δpeso_kg/sem * 7700 / 7), suavizado com EMA alpha=0.2.
   Precisa de 7+ dias com peso+kcal; antes disso usa Mifflin do perfil. */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  const KEY = 'tdee';
  const KCAL_POR_KG = 7700, EMA_ALPHA = 0.2, MIN_DIAS = 7;

  function state() {
    return C().storage.load(KEY, {tdee_atual: null, history: [], meta_kcal: null, macro_alvos: null, ultimo_checkin: null});
  }
  function saveState(s) { return C().storage.save(KEY, s); }

  function isoDiasAtras(n) {
    const d = new Date(); d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  function kcalNoDia(iso) {
    let total = 0, achou = false;
    try {
      const arr = JSON.parse(localStorage.getItem('rot-nutri-' + iso) || '[]');
      if (Array.isArray(arr) && arr.length) {
        total += arr.reduce((a, it) => a + (Number(it.kcal) || 0), 0);
        achou = true;
      }
    } catch (e) {}
    try {
      const extra = C().storage.load('diario', {});
      const dia = extra[iso];
      if (dia && Array.isArray(dia.refeicoes) && dia.refeicoes.length) {
        total += dia.refeicoes.reduce((a, it) => a + (Number(it.kcal) || 0), 0);
        achou = true;
      }
    } catch (e) {}
    return achou ? Math.round(total) : null;
  }

  function pesoNoDia(iso) {
    const H = window.CorpoHistorico;
    if (!H) return null;
    const rec = H.todos().find(r => r.data === iso);
    if (rec && rec.peso != null) return Number(rec.peso);
    try {
      const dia = (C().storage.load('diario', {}) || {})[iso];
      if (dia && dia.peso_manha != null) return Number(dia.peso_manha);
    } catch (e) {}
    return null;
  }

  function janela(janelaDias = 14) {
    const out = [];
    for (let i = janelaDias - 1; i >= 0; i--) {
      const iso = isoDiasAtras(i);
      out.push({data: iso, peso: pesoNoDia(iso), kcal: kcalNoDia(iso)});
    }
    return out;
  }

  function calcular(janelaDias = 14) {
    const win = janela(janelaDias);
    const validos = win.filter(d => d.peso != null && d.kcal != null);
    const perfil = window.CorpoPerfil ? window.CorpoPerfil.load() : {};
    const base = window.CorpoPerfil ? window.CorpoPerfil.tdeeBase(perfil) : 2200;

    if (validos.length < MIN_DIAS) {
      return {tdee: base, fonte: 'mifflin', n: validos.length, minimo: MIN_DIAS,
              msg: `Faltam dados (${validos.length}/${MIN_DIAS} dias). Usando estimativa Mifflin até você registrar peso + calorias por 7 dias.`};
    }
    const xs = validos.map((_, i) => i);
    const ys = validos.map(d => d.peso);
    const slopeDia = C().utils.linearSlope(xs, ys);
    const slopeSemana = slopeDia * 7;
    const kcalMedia = validos.reduce((a, d) => a + d.kcal, 0) / validos.length;
    const tdeeRaw = Math.round(kcalMedia - slopeDia * KCAL_POR_KG / 7);
    const st = state();
    const tdee = st.tdee_atual != null
      ? Math.round(st.tdee_atual * (1 - EMA_ALPHA) + tdeeRaw * EMA_ALPHA)
      : tdeeRaw;
    return {
      tdee: Math.max(1200, Math.min(4500, tdee)), tdeeRaw,
      fonte: 'adaptativo', n: validos.length,
      slopeSemana: C().utils.round1(slopeSemana),
      kcalMedia: Math.round(kcalMedia),
      pesoMedio: C().utils.round1(ys.reduce((a, b) => a + b, 0) / ys.length),
      msg: `Baseado em ${validos.length} dias reais: média ${Math.round(kcalMedia)} kcal/dia, tendência ${slopeSemana >= 0 ? '+' : ''}${C().utils.round1(slopeSemana)} kg/sem.`
    };
  }

  const AJUSTE = {cut: -500, bulk: 300, recomp: -100, maintenance: 0};

  function checkin() {
    const calc = calcular(14);
    const perfil = window.CorpoPerfil ? window.CorpoPerfil.load() : {objetivo: 'cut', peso_kg: 83};
    const meta = calc.tdee + (AJUSTE[perfil.objetivo] ?? -500);
    const macros = C().macroAlvos({peso_kg: perfil.peso_kg, objetivo: perfil.objetivo, tdee: calc.tdee});
    macros.kcal = meta;
    const st = state();
    st.tdee_atual = calc.tdee;
    st.meta_kcal = meta;
    st.macro_alvos = macros;
    st.ultimo_checkin = new Date().toISOString().slice(0, 10);
    st.history.push({semana: st.ultimo_checkin, tdee: calc.tdee, peso_medio: calc.pesoMedio || null,
                     kcal_media: calc.kcalMedia || null, fonte: calc.fonte});
    saveState(st);
    return {calc, meta, macros, perfil};
  }

  window.CorpoTDEE = {calcular, checkin, janela, kcalNoDia, pesoNoDia, state};
  console.log('[CorpoTDEE] ok');
})();
