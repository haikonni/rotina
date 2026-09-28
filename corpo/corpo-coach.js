/* ===== CORPO COACH — análise semanal determinística ===== */
/* Responde: para onde o peso vai, o que impulsionou, 1 ação prioritária. Sem IA, só regras. */
(() => {
  'use strict';
  function analiseSemanal() {
    const C = window.CorpoCore;
    const out = {data: new Date().toISOString().slice(0, 10), direcao: '—', impulsionou: '—', acao: '—', detalhes: ''};
    if (!C) { out.detalhes = 'CorpoCore não carregado'; return out; }
    const H = window.CorpoHistorico, T = window.CorpoTDEE;
    const tend = H ? H.tendenciaPeso(14) : {slopeSemana: 0, n: 0, confiavel: false};
    out.slopeSemana = tend.slopeSemana; out.n = tend.n;
    // 1. direção
    if (!tend.confiavel) out.direcao = `Sem dados suficientes (${tend.n} pesagens). Pese-se de manhã por 7 dias.`;
    else if (tend.slopeSemana < -0.15) out.direcao = `Perdendo ~${Math.abs(tend.slopeSemana)} kg/sem — ritmo bom para cut.`;
    else if (tend.slopeSemana > 0.15) out.direcao = `Ganhando ~${tend.slopeSemana} kg/sem — ok se for bulk, senão revise calorias.`;
    else out.direcao = `Estável (${tend.slopeSemana >= 0 ? '+' : ''}${tend.slopeSemana} kg/sem) — manutenção/recomp.`;
    // 2. o que impulsionou (kcal vs meta, jejum, água, treino)
    const pistas = [];
    try {
      const st = T ? T.state() : {};
      const meta = st.meta_kcal || (window.CorpoPerfil ? window.CorpoPerfil.macrosBase().kcal : 2200);
      let somaK = 0, nK = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const k = T ? T.kcalNoDia(iso) : null;
        if (k != null) { somaK += k; nK++; }
      }
      if (nK >= 3) {
        const media = Math.round(somaK / nK);
        pistas.push(`média ${media} kcal/dia em ${nK}/7 dias (meta ~${meta})`);
        out.kcalMedia = media; out.metaKcal = meta;
      } else pistas.push(`só ${nK}/7 dias com calorias registradas`);
    } catch (e) {}
    try {
      const A = window.CorpoAgua;
      if (A) {
        const m = A.media7d ? A.media7d() : 0;
        const meta = A.meta ? A.meta() : 2800;
        pistas.push(`água média ${m}ml (meta ${meta}ml)`);
        out.aguaMedia = m; out.metaAgua = meta;
      }
    } catch (e) {}
    try {
      const J = window.CorpoJejum;
      if (J) {
        const n = J.diasCompletos7d ? J.diasCompletos7d()
          : (J.diasCompletosUltimos7 ? J.diasCompletosUltimos7() : 0);
        pistas.push(`${n} dias de jejum completos`);
      }
    } catch (e) {}
    try {
      const D = window.CorpoDiario;
      if (D) {
        let tr = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date(); d.setDate(d.getDate() - i);
          if (D.dia(d.toISOString().slice(0, 10)).treino) tr++;
        }
        pistas.push(`${tr}/7 dias com treino`);
        out.treinos = tr;
        if (tr < 3) out._poucoTreino = true;
      }
    } catch (e) {}
    out.impulsionou = pistas.join(' • ') + '.';
    // 3. ação prioritária (ordem: registrar > água > treino > ajustar kcal)
    if (tend.n < 4) out.acao = 'Pese-se todo dia de manhã (em jejum) pelos próximos 7 dias — sem isso o TDEE não calibra.';
    else if (out.aguaMedia != null && out.aguaMedia < (out.metaAgua || 2800) * 0.6) out.acao = 'Beba mais água: você está abaixo de 60% da meta. Água segura jejum e controla fome no cut.';
    else if (out._poucoTreino) out.acao = 'Treine 3x nesta semana (seg/qua/sex calistenia + corrida). Músculo segura o metabolismo no déficit.';
    else if (out.kcalMedia != null && out.metaKcal != null && Math.abs(out.kcalMedia - out.metaKcal) > out.metaKcal * 0.15) out.acao = `Ajuste as calorias para perto de ${out.metaKcal} kcal/dia (média atual ${out.kcalMedia}). Faça check-in no TDEE.`;
    else out.acao = 'Mantenha o ritmo — faça o check-in semanal do TDEE para recalibrar a meta.';
    out.detalhes = `slope ${tend.slopeSemana} kg/sem, n=${tend.n}`;
    // salva no histórico de checkins
    try {
      const ck = C.storage.load('checkins', []);
      ck.push({data: out.data, direcao: out.direcao, impulsionou: out.impulsionou, acao: out.acao});
      C.storage.save('checkins', ck.slice(-52));
    } catch (e) {}
    return out;
  }
  window.CorpoCoach = {analiseSemanal};
  console.log('[CorpoCoach] ok');
})();
