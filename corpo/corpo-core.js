/* ===== CORPO CORE — Utilitários compartilhados, fórmulas, storage ===== */
/* Carregado primeiro — expõe window.CorpoCore */

(() => {
  'use strict';

  const STORAGE_PREFIX = 'rot-corpo-';
  const VERSION = '1.0.0';

  // ===== STORAGE =====
  function storageKey(name) { return STORAGE_PREFIX + name; }

  function load(name, fallback = null) {
    try {
      const raw = localStorage.getItem(storageKey(name));
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('[CorpoCore] load error', name, e);
      return fallback;
    }
  }

  function save(name, data) {
    try {
      localStorage.setItem(storageKey(name), JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('[CorpoCore] save error', name, e);
      return false;
    }
  }

  function remove(name) {
    localStorage.removeItem(storageKey(name));
  }

  function loadAll() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(STORAGE_PREFIX)) {
        try { out[k.slice(STORAGE_PREFIX.length)] = JSON.parse(localStorage.getItem(k)); } catch {}
      }
    }
    return out;
  }

  function clearAll() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // ===== UTILS =====
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function todayBR() { const d = new Date(); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; }
  function parseDateBR(s) { if (!s) return null; const m = s.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})/); return m ? `${m[3].length===2?'20'+m[3]:m[3]}-${m[2]}-${m[1]}` : null; }
  function num(v) { if (v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
  function round1(v) { return v == null ? null : Math.round(v * 10) / 10; }
  function round0(v) { return v == null ? null : Math.round(v); }
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  // EMA (Exponential Moving Average)
  function ema(prev, curr, alpha = 0.2) { return prev == null ? curr : prev * (1 - alpha) + curr * alpha; }

  // Regressão linear simples (retorna slope por dia)
  function linearSlope(xs, ys) {
    const n = xs.length;
    if (n < 2) return 0;
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
    const sumXX = xs.reduce((a, b) => a + b * b, 0);
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  // ===== FÓRMULAS % GORDURA (local, sem API) =====
  const BodyFatFormulas = {
    // US Navy Method — circunferências em cm
    // Homens: %BF = 495 / (1.0324 - 0.19077*log10(cintura - pescoco) + 0.15456*log10(altura)) - 450
    // Mulheres: %BF = 495 / (1.29579 - 0.35004*log10(cintura + quadril - pescoco) + 0.22100*log10(altura)) - 450
    usNavy({sexo, altura_cm, cintura_cm, pescoco_cm, quadril_cm}) {
      const h = Math.log10(altura_cm);
      if (sexo === 'M' || sexo === 'masculino' || sexo === 'male') {
        const v = Math.log10(cintura_cm - pescoco_cm);
        const bf = 495 / (1.0324 - 0.19077 * v + 0.15456 * h) - 450;
        return clamp(round1(bf), 2, 50);
      } else {
        const v = Math.log10(cintura_cm + quadril_cm - pescoco_cm);
        const bf = 495 / (1.29579 - 0.35004 * v + 0.22100 * h) - 450;
        return clamp(round1(bf), 10, 55);
      }
    },

    // RFM (Relative Fat Mass) — Woolcott & Bergman 2018
    // Homens: 64 - 20 * (altura / cintura)  [altura e cintura em metros]
    // Mulheres: 76 - 20 * (altura / cintura)
    rfm({sexo, altura_cm, cintura_cm}) {
      const h = altura_cm / 100;
      const w = cintura_cm / 100;
      const bf = (sexo === 'M' || sexo === 'masculino' || sexo === 'male')
        ? 64 - 20 * (h / w)
        : 76 - 20 * (h / w);
      return clamp(round1(bf), 2, 55);
    },

    // CUN-BAE — Clinica Universidad de Navarra Body Adiposity Estimator
    // -44.988 + (0.503 * idade) + (10.689 * sexo) + (3.172 * IMC) - (0.026 * IMC^2) + (0.181 * IMC * sexo) - (0.02 * IMC * idade) - (0.005 * IMC^2 * sexo) + (0.00021 * IMC^2 * idade)
    // sexo: 0=homem, 1=mulher
    cunBae({sexo, idade, imc}) {
      const s = (sexo === 'F' || sexo === 'feminino' || sexo === 'female') ? 1 : 0;
      const bf = -44.988
        + 0.503 * idade
        + 10.689 * s
        + 3.172 * imc
        - 0.026 * imc * imc
        + 0.181 * imc * s
        - 0.02 * imc * idade
        - 0.005 * imc * imc * s
        + 0.00021 * imc * imc * idade;
      return clamp(round1(bf), 2, 55);
    },

    // Deurenberg (1991) — baseado em IMC, idade, sexo
    // %BF = 1.20 * IMC + 0.23 * idade - 10.8 * sexo - 5.4
    // sexo: 1=homem, 0=mulher
    deurenberg({sexo, idade, imc}) {
      const s = (sexo === 'M' || sexo === 'masculino' || sexo === 'male') ? 1 : 0;
      const bf = 1.20 * imc + 0.23 * idade - 10.8 * s - 5.4;
      return clamp(round1(bf), 2, 55);
    },

    // Gallagher (2000) — mais preciso para idosos
    // Homens: %BF = -10.15 + 1.45*IMC + 0.12*idade
    // Mulheres: %BF = -8.94 + 1.47*IMC + 0.14*idade
    gallagher({sexo, idade, imc}) {
      const bf = (sexo === 'M' || sexo === 'masculino' || sexo === 'male')
        ? -10.15 + 1.45 * imc + 0.12 * idade
        : -8.94 + 1.47 * imc + 0.14 * idade;
      return clamp(round1(bf), 2, 55);
    },

    // Média ponderada das fórmulas (peso por confiabilidade geral)
    // Robusto: calcula IMC se tiver peso+altura; ignora fórmulas sem dados
    mediaPonderada(dados) {
      const d = Object.assign({}, dados);
      if ((d.imc == null || isNaN(d.imc)) && d.peso_kg != null && d.altura_cm != null && d.altura_cm > 0) {
        d.imc = round1(d.peso_kg / Math.pow(d.altura_cm / 100, 2));
      }
      const resultados = {};
      const partes = [];
      const tenta = (nome, peso, fn) => {
        try {
          const v = fn();
          if (v != null && !isNaN(v)) { resultados[nome] = v; partes.push({v, peso}); }
          else resultados[nome] = null;
        } catch (e) { resultados[nome] = null; }
      };
      tenta('usNavy', 0.30, () => this.usNavy(d));
      tenta('rfm', 0.25, () => this.rfm(d));
      tenta('cunBae', 0.20, () => this.cunBae(d));
      tenta('deurenberg', 0.15, () => this.deurenberg(d));
      tenta('gallagher', 0.10, () => this.gallagher(d));
      if (!partes.length) { resultados.media = null; return resultados; }
      const somaPesos = partes.reduce((a, p) => a + p.peso, 0);
      resultados.media = round1(partes.reduce((a, p) => a + p.v * p.peso, 0) / somaPesos);
      return resultados;
    },

    // Classifica categoria
    classificar(bf, sexo) {
      const masc = sexo === 'M' || sexo === 'masculino' || sexo === 'male';
      if (masc) {
        if (bf < 6) return {label: 'Gordura Essencial', cor: 'var(--warn)'};
        if (bf < 14) return {label: 'Atleta', cor: 'var(--ok)'};
        if (bf < 18) return {label: 'Fitness', cor: 'var(--ok)'};
        if (bf < 25) return {label: 'Média', cor: 'var(--warn)'};
        return {label: 'Obesidade', cor: 'var(--err)'};
      } else {
        if (bf < 14) return {label: 'Gordura Essencial', cor: 'var(--warn)'};
        if (bf < 21) return {label: 'Atleta', cor: 'var(--ok)'};
        if (bf < 25) return {label: 'Fitness', cor: 'var(--ok)'};
        if (bf < 32) return {label: 'Média', cor: 'var(--warn)'};
        return {label: 'Obesidade', cor: 'var(--err)'};
      }
    }
  };

  // ===== TDEE INICIAL (Mifflin-St Jeor) =====
  function tdeeInicial({sexo, idade, peso_kg, altura_cm, nivelAtividade = 'sedentario'}) {
    const s = (sexo === 'M' || sexo === 'masculino' || sexo === 'male') ? 5 : -161;
    const bmr = 10 * peso_kg + 6.25 * altura_cm - 5 * idade + s;
    const mult = {sedentario: 1.2, leve: 1.375, moderado: 1.55, intenso: 1.725, muito_intenso: 1.9};
    return Math.round(bmr * (mult[nivelAtividade] || 1.2));
  }

  // ===== MACRO ALVOS =====
  function macroAlvos({peso_kg, objetivo, tdee}) {
    // objetivo: 'cut' | 'bulk' | 'recomp' | 'maintenance'
    const protein_g_kg = {cut: 2.2, bulk: 1.8, recomp: 2.0, maintenance: 1.8};
    const fat_g_kg = {cut: 0.8, bulk: 1.0, recomp: 0.9, maintenance: 0.9};
    const deficit = {cut: -500, bulk: 300, recomp: -100, maintenance: 0};
    const targetKcal = Math.round(tdee + (deficit[objetivo] || 0));
    const pMin = Math.round(protein_g_kg[objetivo] * peso_kg * 0.9);
    const pMax = Math.round(protein_g_kg[objetivo] * peso_kg * 1.1);
    const fMin = Math.round(fat_g_kg[objetivo] * peso_kg * 0.9);
    const fMax = Math.round(fat_g_kg[objetivo] * peso_kg * 1.1);
    const pMid = (pMin + pMax) / 2;
    const fMid = (fMin + fMax) / 2;
    const cKcal = targetKcal - pMid * 4 - fMid * 9;
    const cMin = Math.max(0, Math.round((cKcal - 100) / 4));
    const cMax = Math.round((cKcal + 100) / 4);
    return {
      kcal: targetKcal,
      protein: {min: pMin, max: pMax, target: pMid},
      fat: {min: fMin, max: fMax, target: fMid},
      carb: {min: cMin, max: cMax, target: Math.round(cKcal / 4)},
      ranges: `P ${pMin}-${pMax}g | G ${fMin}-${fMax}g | C ${cMin}-${cMax}g`
    };
  }

  // ===== EXPORTA =====
  window.CorpoCore = {
    VERSION,
    STORAGE_PREFIX,
    storage: {load, save, remove, loadAll, clearAll},
    utils: {todayISO, todayBR, parseDateBR, num, round1, round0, clamp, ema, linearSlope},
    formulas: BodyFatFormulas,
    tdeeInicial,
    macroAlvos
  };

  console.log('[CorpoCore] Carregado v' + VERSION);
})();