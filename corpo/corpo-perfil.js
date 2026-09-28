/* ===== CORPO PERFIL — dados pessoais, metas e base TDEE ===== */
/* Depende de: corpo-core.js — expõe window.CorpoPerfil */
(() => {
  'use strict';
  const C = () => window.CorpoCore;
  const KEY = 'perfil';

  const DEFAULTS = {
    altura_cm: 173, sexo: 'M', idade: 15,
    peso_kg: 83, objetivo: 'cut',           // cut | bulk | recomp | maintenance
    nivelAtividade: 'leve',                  // sedentario | leve | moderado | intenso | muito_intenso
    meta_peso: 75, meta_gordura: 15,
    plano_jejum: '16:8', meta_agua_ml: null  // null = auto (35ml/kg)
  };

  const OBJETIVOS = {cut: 'Cut (déficit)', bulk: 'Bulk (superávit)', recomp: 'Recomp', maintenance: 'Manutenção'};
  const ATIVIDADE = {sedentario: 'Sedentário', leve: 'Leve', moderado: 'Moderado', intenso: 'Intenso', muito_intenso: 'Muito intenso'};

  function load() {
    return Object.assign({}, DEFAULTS, C().storage.load(KEY, {}));
  }
  function save(p) {
    return C().storage.save(KEY, Object.assign({}, load(), p));
  }

  // TDEE estático inicial (Mifflin) — substituído pelo adaptativo após 7+ dias de dados
  function tdeeBase(p) {
    p = p || load();
    return C().tdeeInicial({sexo: p.sexo, idade: p.idade, peso_kg: p.peso_kg, altura_cm: p.altura_cm, nivelAtividade: p.nivelAtividade});
  }

  function macrosBase(p) {
    p = p || load();
    return C().macroAlvos({peso_kg: p.peso_kg, objetivo: p.objetivo, tdee: tdeeBase(p)});
  }

  function metaAgua(p) {
    p = p || load();
    if (p.meta_agua_ml) return p.meta_agua_ml;
    return Math.round((p.peso_kg || 80) * 35);
  }

  window.CorpoPerfil = {DEFAULTS, OBJETIVOS, ATIVIDADE, load, save, tdeeBase, macrosBase, metaAgua};
  console.log('[CorpoPerfil] ok');
})();
