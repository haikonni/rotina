/* Rotina - service worker */
const VERSAO = "1.5.0";
const CACHE = "rotina-" + VERSAO;
const NUCLEO = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./corpo/corpo-core.js",
  "./corpo/corpo-perfil.js",
  "./corpo/corpo-historico.js",
  "./corpo/corpo-tdee.js",
  "./corpo/corpo-jejum.js",
  "./corpo/corpo-agua.js",
  "./corpo/corpo-diario.js",
  "./corpo/corpo-medidas.js",
  "./corpo/corpo-coach.js",
  "./corpo/corpo-export.js",
  "./nutri-off.js",
  "./bio-pdf.js"
];
const FONTES = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(NUCLEO)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n.startsWith("rotina-") && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
    if ("Notification" in self && Notification.permission === "granted") {
      scheduleNotifications();
    }
  })());
});

self.addEventListener("message", e => {
  if (e.data === "ATUALIZAR_AGORA") self.skipWaiting();
  if (e.data === "SCHEDULE_NOTIFICATIONS") scheduleNotifications();
  if (e.data?.type === "SCHEDULE_SINGLE") scheduleSingleNotification(e.data);
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try { return await fetch(req); }
      catch (err) { return (await caches.match("./index.html")) || Response.error(); }
    })());
    return;
  }

  const mesmaOrigem = new URL(req.url).origin === location.origin;
  if (!mesmaOrigem && !FONTES.test(req.url)) return;

  e.respondWith((async () => {
    const guardado = await caches.match(req, {ignoreSearch: mesmaOrigem});
    if (guardado) return guardado;
    try {
      const resp = await fetch(req);
      if (resp && (resp.ok || resp.type === "opaque")) {
        const c = await caches.open(CACHE);
        c.put(req, resp.clone());
      }
      return resp;
    } catch (err) {
      return guardado || Response.error();
    }
  })());
});

/* ===== NOTIFICAÇÕES ===== */
const HORARIOS_NOTIFICACAO = [
  { id: "agua-1", hora: "06:00", titulo: "💧 Água", corpo: "Hora do 1º copo d'água do dia!", tag: "agua" },
  { id: "treino", hora: null, titulo: "💪 Treino", corpo: "Hora do treino do dia!", tag: "treino", dinamic: true },
  { id: "estudo", hora: "10:00", titulo: "📚 Estudo", corpo: "Bloco de estudo protegido (50 min)", tag: "estudo" },
  { id: "agua-2", hora: "09:00", titulo: "💧 Água", corpo: "2º copo d'água da manhã", tag: "agua" },
  { id: "agua-3", hora: "12:30", titulo: "💧 Água", corpo: "3º copo d'água no almoço", tag: "agua" },
  { id: "agua-4", hora: "17:30", titulo: "💧 Água", corpo: "4º copo d'água à tarde", tag: "agua" },
  { id: "escola", hora: "18:40", titulo: "🏫 Escola", corpo: "Hora de sair para a escola", tag: "escola" },
  { id: "tela-off", hora: "23:00", titulo: "📵 Tela Off", corpo: "Hora de desligar as telas e preparar o sono", tag: "tela-off" }
];

function getTreinoHorario(dow) {
  const mapa = {
    1: "08:30", 2: "06:50", 3: "08:30",
    4: "06:50", 5: "08:30", 6: "08:30", 0: "10:00"
  };
  return mapa[dow];
}

async function scheduleNotifications() {
  if (!("Notification" in self) || Notification.permission !== "granted") return;

  const agora = new Date();
  const dow = agora.getDay();
  const treinoHora = getTreinoHorario(dow);

  for (const n of HORARIOS_NOTIFICACAO) {
    let hora = n.hora;
    if (n.dinamic) hora = treinoHora;
    if (!hora) continue;

    const [h, m] = hora.split(":").map(Number);
    const alvo = new Date();
    alvo.setHours(h, m, 0, 0);

    if (alvo <= agora) {
      alvo.setDate(alvo.getDate() + 1);
    }

    const delay = alvo.getTime() - agora.getTime();
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      setTimeout(() => showNotification(n), delay);
    }
  }
}

async function scheduleSingleNotification(data) {
  if (!("Notification" in self) || Notification.permission !== "granted") return;
  const delay = data.delay || 0;
  setTimeout(() => showNotification(data.notification), delay);
}

function showNotification(n) {
  const options = {
    body: n.corpo,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: n.tag,
    renotify: true,
    requireInteraction: n.tag === "escola" || n.tag === "treino",
    vibrate: [200, 100, 200],
    data: { url: "./index.html" }
  };
  self.registration.showNotification(n.titulo, options);
}

self.addEventListener("notificationclick", e => {
  e.notification.close();
  if (e.action === "dismiss") return;
  e.waitUntil(clients.matchAll({ type: "window" }).then(clis => {
    for (const c of clis) {
      if (c.url.includes(self.location.origin) && "focus" in c) return c.focus();
    }
    return clients.openWindow("./index.html");
  }));
});