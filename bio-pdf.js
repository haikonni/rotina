/* ===== BIO PDF — lê PDF do exame direto via pdf.js (grátis, CDN) e joga no OCR ===== */
/* Envolve bioOnFile: imagem segue o fluxo original; PDF renderiza a pág. 1 em imagem. */
(() => {
  'use strict';
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js';
  const PDFWORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
  let _loading = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    if (_loading) return _loading;
    _loading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = PDFJS;
      s.onload = () => {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWORKER;
          res();
        } catch (e) { rej(e); }
      };
      s.onerror = () => rej(new Error('pdf.js não carregou (offline?)'));
      document.body.appendChild(s);
    });
    return _loading;
  }

  async function pdfFirstPage(file) {
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({data: buf}).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({scale: 2.0});
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
    try { await pdf.destroy(); } catch (e) {}
    return canvas.toDataURL('image/png');
  }

  function wrap() {
    if (typeof bioOnFile !== 'function' || typeof bioRunOcr !== 'function') { setTimeout(wrap, 600); return; }
    if (wrap._done) return;
    wrap._done = true;
    const orig = bioOnFile;
    bioOnFile = async function (inp) {
      const f = inp.files && inp.files[0];
      if (!f) return;
      if (f.type !== 'application/pdf') return orig(inp);
      const status = document.getElementById('bioOcrStatus');
      try {
        if (status) status.textContent = 'Lendo PDF (página 1)... baixa a lib uma vez, depois funciona offline.';
        await loadPdfJs();
        const url = await pdfFirstPage(f);
        const preview = document.getElementById('bioPreview');
        if (preview) { preview.src = url; preview.style.display = 'block'; }
        bioPending = url;
        bioRunOcr(url);
      } catch (e) {
        if (status) status.textContent = 'PDF não lido: ' + e.message + '. Tire print da página e envie como imagem.';
        if (typeof bioBuildForm === 'function') bioBuildForm({});
      }
    };
    console.log('[BioPDF] ok');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(wrap, 900));
  else setTimeout(wrap, 900);
})();
