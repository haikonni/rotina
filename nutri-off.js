/* ===== NUTRI OFF — busca de alimentos + código de barras via OpenFoodFacts ===== */
/* 100% grátis, sem chave, sem conta. Complementa a aba Nutri (usa nutriLoad/nutriSave/nutriRenderHoje). */
(() => {
  'use strict';
  const API = 'https://world.openfoodfacts.org';
  let _offCache = [];
  let _offStream = null;

  function el(id) { return document.getElementById(id); }

  // Normaliza nutrimentos (/100g) para uma porção em gramas
  function porcao(n, grams) {
    const f = (grams || 100) / 100;
    const kcal100 = (n['energy-kcal_100g'] != null && !isNaN(+n['energy-kcal_100g']))
      ? +n['energy-kcal_100g']
      : ((+n['energy_100g'] || 0) / 4.184);
    const r1 = v => Math.round(v * 10) / 10;
    return {
      kcal: Math.max(0, Math.round(kcal100 * f)),
      p: r1((+n.proteins_100g || 0) * f),
      c: r1((+n.carbohydrates_100g || 0) * f),
      g: r1((+n.fat_100g || 0) * f)
    };
  }

  function nomeProduto(p) {
    return p.product_name_pt || p.product_name || 'Produto';
  }

  async function buscar(q) {
    const box = el('offResults');
    if (!q || q.trim().length < 2) { if (box) box.innerHTML = 'Digite ao menos 2 letras.'; return; }
    if (box) box.innerHTML = 'Buscando no OpenFoodFacts (grátis)...';
    try {
      const r = await fetch(API + '/cgi/search.pl?search_terms=' + encodeURIComponent(q.trim()) +
        '&search_simple=1&action=process&json=1&page_size=6&fields=code,product_name,product_name_pt,quantity,nutriments');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      _offCache = (j.products || []).filter(p => p && p.nutriments);
      render();
    } catch (e) {
      if (box) box.innerHTML = 'Sem internet ou busca falhou (' + e.message + '). Use + Manual na aba Nutri.';
    }
  }

  function render() {
    const box = el('offResults');
    if (!box) return;
    if (!_offCache.length) { box.innerHTML = 'Nada encontrado. Tente outro nome ou use + Manual.'; return; }
    box.innerHTML = _offCache.map((p, i) => {
      const m = porcao(p.nutriments, 100);
      const qtd = p.quantity ? ' <span style="color:var(--fg-sub)">' + p.quantity + '</span>' : '';
      return '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">' +
        '<span><strong>' + nomeProduto(p) + '</strong>' + qtd +
        '<div style="font-size:.62rem;color:var(--fg-sub)">/100g: ' + m.kcal + ' kcal • P ' + m.p + 'g • C ' + m.c + 'g • G ' + m.g + 'g</div></span>' +
        '<button class="btn btn-primary btn-sm" style="width:auto" onclick="nutriOFFAdd(' + i + ')">+ Add</button></div>';
    }).join('');
  }

  function adicionar(item) {
    try {
      const k = nutriTodayKey();
      const arr = nutriLoad(k);
      arr.push(Object.assign({fonte: 'openfoodfacts', ts: Date.now()}, item));
      nutriSave(k, arr);
      nutriRenderHoje();
      if (typeof showError === 'function') showError('Adicionado: ' + item.nome);
    } catch (e) {
      if (typeof showError === 'function') showError('Erro: ' + e.message);
    }
  }

  // Adiciona item do cache pedindo a porção (grátis, sem IA)
  window.nutriOFFAdd = function (i) {
    const p = _offCache[i];
    if (!p) return;
    const g = parseFloat(prompt('Porção em gramas? (ex: 200)', '100') || '100');
    const grams = (!isNaN(g) && g > 0) ? g : 100;
    const m = porcao(p.nutriments, grams);
    adicionar({nome: nomeProduto(p), qtd: grams + 'g', kcal: m.kcal, proteina: m.p, carbo: m.c, gordura: m.g});
  };

  window.nutriOFFSearch = function () {
    const inp = el('offSearch');
    buscar(inp ? inp.value : '');
  };

  // Código de barras: scan ao vivo (se o navegador suportar) ou digitação
  window.nutriOFFBarcode = async function () {
    const box = el('offResults');
    if ('BarcodeDetector' in window) {
      try {
        const det = new BarcodeDetector({formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']});
        const v = el('offVideo');
        _offStream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'environment'}, audio: false});
        v.srcObject = _offStream;
        v.style.display = 'block';
        if (box) box.innerHTML = 'Aponte para o código de barras... <button class="btn btn-ghost btn-sm" onclick="nutriOFFStop()">cancelar</button>';
        const tick = async () => {
          if (!_offStream) return;
          try {
            const codes = await det.detect(v);
            if (codes && codes.length) {
              const code = codes[0].rawValue;
              nutriOFFStop();
              nutriOFFLookup(code);
              return;
            }
          } catch (e) {}
          setTimeout(tick, 400);
        };
        v.onloadedmetadata = () => { v.play(); tick(); };
        return;
      } catch (e) { /* cai para digitação */ }
    }
    const code = prompt('Código de barras (números da embalagem):');
    if (code) nutriOFFLookup(code.replace(/\D/g, ''));
  };

  window.nutriOFFStop = function () {
    if (_offStream) { _offStream.getTracks().forEach(t => t.stop()); _offStream = null; }
    const v = el('offVideo');
    if (v) { v.style.display = 'none'; v.srcObject = null; }
  };

  window.nutriOFFLookup = async function (code) {
    const box = el('offResults');
    if (!code) return;
    if (box) box.innerHTML = 'Buscando código ' + code + '...';
    try {
      const r = await fetch(API + '/api/v0/product/' + encodeURIComponent(code) + '.json?fields=code,product_name,product_name_pt,quantity,nutriments,status');
      const j = await r.json();
      if (j.status !== 1 || !j.product) { if (box) box.innerHTML = 'Produto não cadastrado. Use a busca por nome ou + Manual.'; return; }
      _offCache = [j.product];
      render();
    } catch (e) {
      if (box) box.innerHTML = 'Falha na busca (' + e.message + ').';
    }
  };

  // Injeta UI na aba Nutri (sem mexer no HTML original)
  function inject() {
    if (el('offSearch') || typeof nutriLoad !== 'function') return;
    const actions = document.querySelector('#a-nutri .nutri-actions');
    if (!actions) { setTimeout(inject, 800); return; }
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px';
    div.innerHTML =
      '<input id="offSearch" placeholder="Buscar alimento grátis (ex: tapioca)" style="flex:1;min-width:160px;padding:10px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elev);color:var(--fg)">' +
      '<button class="btn btn-primary btn-sm" onclick="nutriOFFSearch()">🔍 Buscar</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="nutriOFFBarcode()">📊 Código de barras</button>';
    actions.parentNode.insertBefore(div, actions.nextSibling);
    const res = document.createElement('div');
    res.id = 'offResults';
    res.style.cssText = 'font-size:.72rem;margin-top:6px';
    div.parentNode.insertBefore(res, div.nextSibling);
    const vid = document.createElement('video');
    vid.id = 'offVideo';
    vid.setAttribute('playsinline', '');
    vid.style.cssText = 'display:none;width:100%;border-radius:12px;border:1px solid var(--border);margin-top:6px';
    res.parentNode.insertBefore(vid, res.nextSibling);
    const inp = el('offSearch');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') buscar(inp.value); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(inject, 900));
  else setTimeout(inject, 900);
  console.log('[NutriOFF] ok');
})();
