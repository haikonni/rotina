# PLANO: App "Corpo" — Integração InBody + MacroFactor + Yazio + SlimAI

## 🎯 Visão Geral
Transformar a aba **Bio** + criar nova aba **Corpo** que seja um hub completo de composição corporal, nutrição adaptativa e hábitos — offline-first, local-only, gratuito.

---

## 📋 Features Principais (por prioridade)

### 1️⃣ **Composição Corporal Completa** (baseado no seu InBody 120)
- **Campos do exame**: Peso, Gordura %, Massa Muscular, Água Total, Proteína, Minerais, Gordura Visceral, BMR, IMC, ICC, PGC, Segmentar (braços, tronco, pernas L/R), Impedância por segmento
- **Histórico com gráficos**: Tendência de peso, músculo, gordura %, água, visceral, BMR
- **Metas**: Peso alvo, % gordura alvo, massa muscular alvo
- **Pontuação InBody** (0-100) com interpretação automática

### 2️⃣ **TDEE Adaptativo Estilo MacroFactor** ⭐ *Diferencial*
- Algoritmo que **aprende seu gasto real** a partir de: peso diário + calorias consumidas
- Ajusta meta calórica **semanalmente** para manter taxa de perda/ganho alvo
- Não usa fórmulas estáticas (Mifflin, Harris-Benedict) — usa **SEUS dados**
- Após ~2-3 semanas: precisão ±50-100 kcal do TDEE real
- **Coaching**: metas como *intervalos* (ex: proteína 170-195g), não números fixos

### 3️⃣ **Jejum Intermitente Flexível** (estilo Yazio + SlimAI)
- Botão **Iniciar/Parar** (não só janela fixa) — para horários variáveis
- Planos: 16:8, 18:6, 20:4, OMAD, 5:2, 6:1, personalizado
- Símbolo ⏳ em refeições durante jejum
- Lembretes de hidratação durante jejum

### 4️⃣ **Rastreador de Água** (estilo Yazio)
- Toque em copos para adicionar (250ml, 500ml, personalizado)
- Meta diária automática (35ml/kg ou configurável)
- Lembretes configuráveis
- Integração no diário alimentar

### 5️⃣ **Estimativa % Gordura por Foto/Medidas** (estilo SlimAI)
- **Fórmulas implementadas localmente** (sem API):
  - US Navy Method (pescoço + cintura [+ quadril p/ mulheres])
  - RFM (Relative Fat Mass) — altura + cintura
  - CUN-BAE — idade + IMC + sexo
  - Deurenberg — IMC + idade + sexo
- Modo **fita métrica** (sem foto) e **foto guiada** (2 fotos: frente/perfil)
- Comparação com bioimpedância quando disponível

### 6️⃣ **IA Coach Semanal** (estilo SlimAI + MacroFactor)
- Toda 2ª feira: lê a semana (peso, calorias, aderência, jejum, água, treino)
- Responde 3 coisas: **para onde o peso vai**, **o que impulsionou**, **1 ação prioritária**
- Regras fixas sobre seus dados — determinístico, sem alucinação
- Mostra "como chegou nesse número" (transparência)

### 7️⃣ **Diário Alimentar Avançado** (Nutri existente + melhorias)
- **Scanner de código de barras** (offline DB local + fallback web)
- **Foto → IA** (OpenAI opcional, chave no navegador)
- **Entrada manual rápida** (favoritos, refeições salvas, receitas)
- Macros por refeição + orçamento por refeição (café/almoço/jantar/lanche)
- **Food Health Score** por refeição (densidade nutricional, processamento)

### 8️⃣ **Medidas Corporais + Fotos de Progresso**
- Circunferências: pescoço, cintura, quadril, braço, coxa, panturrilha (L/R)
- Fotos: frente, perfil, costas — padronizadas (pose, iluminação)
- Comparação lado a lado com slider temporal
- Overlay de medidas na foto

### 9️⃣ **Metas e Periodização**
- Tipos: **Cut** (déficit), **Bulk** (superávit), **Recomp** (manutenção + proteína alta), **Maintenance**
- Metas de macro por dia de treino vs descanso (carb cycling)
- Check-in semanal: peso médio, adesão, ajuste de metas
- Projeção: "em X semanas você atinge Y% gordura / Z kg músculo"

### 🔟 **Integrações e Export**
- Export CSV/JSON completo (dados seus, portáveis)
- Backup local (IndexedDB + localStorage sync)
- PWA: instala no celular, roda offline
- Sync opcional futuro (supabase/firebase — só se você quiser)

---

## 🏗️ Arquitetura Técnica

### Estrutura de Dados (localStorage/IndexedDB)
```js
// Chaves principais
rot-corpo-perfil      // {altura, sexo, idade, objetivo, nivelAtividade, metas...}
rot-corpo-historico   // [{data, peso, gordura_pct, massa_muscular, agua_pct, visceral, bmr, imc, medidas:{cintura, pescoco, quadril, ...}, fotos:[...], inbody:{segmentar, impedancia, pontuacao}, source:"inbody|manual|foto|formula"}]
rot-corpo-diario      // {data: {refeicoes:[{nome,qtd,kcal,p,c,g,fonte}], jejum:{inicio,fim,ativo}, agua_ml, passos, treino, peso_manha, notas}}
rot-corpo-tdee        // {tdee_atual, tdee_history:[{semana, tdee, peso_medio, kcal_media}], meta_kcal, macro_alvos:{p_min,p_max,c_min,c_max,g_min,g_max}, ultimo_checkin}
rot-corpo-jejum       // {plano:"16:8|custom", janela_inicio, janela_fim, historico:[{data,inicio,fim,completo}]}
rot-corpo-agua        // {meta_ml, historico:[{data, ml}], lembretes:[horarios]}
rot-corpo-fotos       // [{data, tipo:"frente|perfil|costas", blob_url, medidas_overlay:{...}}]
rot-corpo-checkins    // [{data, peso_medio, aderencia_kcal, aderencia_proteina, jejum_dias, agua_media, treino_dias, coach_resumo, acao_prioritaria}]
```

### Módulos JS (carregamento preguiçoso)
- `corpo-perfil.js` — perfil, metas, TDEE inicial
- `corpo-historico.js` — CRUD exames, gráficos Chart.js
- `corpo-tdee.js` — algoritmo adaptativo (core do MacroFactor)
- `corpo-jejum.js` — timer, planos, histórico
- `corpo-agua.js` — tracker, lembretes
- `corpo-gordura-formulas.js` — US Navy, RFM, CUN-BAE, Deurenberg (pure JS)
- `corpo-coach.js` — análise semanal determinística
- `corpo-diario.js` — diário alimentar, macros, barcode, foto-IA
- `corpo-medidas.js` — medidas, fotos, comparação
- `corpo-export.js` — CSV/JSON backup/restore

### UI/UX
- **Nova aba "Corpo"** (ícone 💪 ou 📊) — dashboard principal
- Sub-abas/tabs dentro: **Dashboard | Histórico | Diário | Jejum | Água | Coach | Medidas | Metas**
- Cards estilo existente (glassmorphism, dark/light auto)
- Gráficos Chart.js responsivos
- Modo "compacto" para mobile (bottom sheet style)

---

## 🧮 Algoritmo TDEE Adaptativo (resumo implementação)

```js
// Inputs: histórico de {data, peso, kcal_consumidas}
// Output: tdee_estimado, meta_kcal_semanal, macro_alvos

// 1. Suaviza peso (média móvel 7-14 dias, peso matinal)
// 2. Calcula Δpeso/semana (regressão linear janela 14d)
// 3. Déficit/superávit implícito = Δpeso_kg * 7700 kcal/kg / 7 dias
// 4. TDEE = kcal_media_diaria - deficit_implícito
// 5. Filtro Kalman / EMA (alpha=0.15-0.2) para estabilizar
// 6. Meta semanal = TDEE + ajuste_objetivo (ex: -500 cut, +300 bulk)
// 7. Proteína = 1.8-2.2g/kg peso_alvo | Gordura = 0.8-1g/kg | Carbo = resto
// 8. Apresenta como intervalos ±10%
```

---

## 📦 Entregáveis

1. **`corpo-dashboard.html`** — HTML modular (pode ser injetado no index.html ou standalone)
2. **`corpo-core.js`** — lógica compartilhada (storage, utils, formulas)
3. **`corpo-modulos/`** — 9 arquivos JS (um por módulo acima)
4. **`corpo-styles.css`** — estilos adicionais (reusa vars do index.html)
5. **Atualização `index.html`** — nova aba "Corpo", integração tabs, lazy-load módulos
6. **Teste manual** — abrir no navegador, simular 2 semanas de dados, ver TDEE convergir

---

## ✅ Checklist de Execução

- [ ] Criar estrutura de pastas `corpo/`
- [ ] Implementar `corpo-core.js` (storage, formulas gordura, TDEE base)
- [ ] Implementar `corpo-historico.js` + UI (gráficos InBody completos)
- [ ] Implementar `corpo-tdee.js` (algoritmo adaptativo + check-in semanal)
- [ ] Implementar `corpo-jejum.js` (timer start/stop + planos)
- [ ] Implementar `corpo-agua.js` (tracker + lembretes)
- [ ] Implementar `corpo-diario.js` (barcode, foto-IA, receitas, health score)
- [ ] Implementar `corpo-medidas.js` (medidas, fotos, overlay)
- [ ] Implementar `corpo-coach.js` (análise semanal determinística)
- [ ] Implementar `corpo-export.js` (backup/restore CSV/JSON)
- [ ] Integrar no `index.html` (aba Corpo, lazy-load, tabs internas)
- [ ] Testar fluxo completo: perfil → exame InBody → 14 dias logging → check-in → ajuste meta
- [ ] Documentar em `CORPO_README.md`

---

## 🎨 Referências Visuais (para UI)
- **MacroFactor**: Dashboard limpo, gráfico peso+gasto sobrepostos, coaching card semanal
- **Yazio**: Diário com água/jejum integrados, barra kcal colorida, receitas cards
- **SlimAI**: Coach card "Esta semana", body fat camera UI, meal photo breakdown
- **InBody App**: Segmental diagram, history trends, score gauge

---

## 💡 Próximos Passos Imediatos
1. Aprovar plano ou ajustar prioridades
2. Começar por `corpo-core.js` + `corpo-historico.js` (base de dados + seu exame real)
3. Depois TDEE adaptativo (coração do diferencial)
4. Jejum + Água (rápidos, alto valor percebido)
5. Coach semanal + Export (fecha o loop)

---

**Pronto para iniciar? Qual módulo começar primeiro?**