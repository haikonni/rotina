
/* ===== ERROR HANDLER ===== */
window.addEventListener("error",e=>{console.error("[Rotina] Error:",e.message,e.filename,e.lineno);showError(e.message)});
window.addEventListener("unhandledrejection",e=>{console.error("[Rotina] Promise rejection:",e.reason);showError(e.reason?.message||String(e.reason))});
function showError(msg){const b=document.getElementById("errorBanner");b.textContent="Erro: "+msg;b.style.display="block";setTimeout(()=>b.style.display="none",10000)}

/* ===== PWA INSTALL / UPDATE ===== */
let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;setTimeout(()=>document.getElementById("installBanner").classList.add("show"),3000)});
window.addEventListener("appinstalled",()=>{deferredPrompt=null;document.getElementById("installBanner").classList.remove("show")});
async function installApp(){
  if(deferredPrompt){deferredPrompt.prompt();const r=await deferredPrompt.userChoice;if(r.outcome==="accepted")console.log("[PWA] Instalado");deferredPrompt=null}
  document.getElementById("installBanner").classList.remove("show");
}
function dismissInstall(){document.getElementById("installBanner").classList.remove("show");localStorage.setItem("rot-install-dismissed",Date.now())}
async function updateApp(){
  if("serviceWorker" in navigator){
    const reg=await navigator.serviceWorker.ready;
    reg.update();document.getElementById("updateBanner").classList.remove("show");
  }
}
navigator.serviceWorker?.addEventListener("controllerchange",()=>{document.getElementById("updateBanner").classList.add("show")});
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("./sw.js").then(reg=>{
    reg.addEventListener("updatefound",()=>{document.getElementById("updateBanner").classList.add("show")});
    setInterval(()=>reg.update(),1000*60*30);
  }).catch(()=>{});
}

/* ===== DADOS ===== */
const APP_VERSION="1.1.0";
console.log("[Rotina] Iniciando v"+APP_VERSION);
const AULAS={
  1:["ED. Digital — Gleisson","Química — Giordana","Português — Gabriela","Matemática — Bruna"],
  2:["Biologia — Nadia","Geografia — Brunno","Matemática — Bruna","Inglês — Cida"],
  3:["Português — Gabriela","Sociologia — Andre Lara","Arte — Adilson","Lit./Prot. — Cida"],
  4:["Con. Matemática — Cristiane","Português — Gabriela","Matemática — Bruna","Filosofia — Osmar"],
  5:["História — Rodrigo","Matemática — Bruna","Português — Gabriela","Física — Lauro"]
};
const DIAS=["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
const BASE=[
  ["06:00–08:00","Tempo com os pais + acordar + 1 copo d'água"],
  ["07:30–08:00","Café (come o que tiver)"],
  ["08:20","Banho manhã"],
  ["10:00–10:50","Bloco estudo protegido"],
  ["12:30","Almoço"],
  ["17:00","Banho tarde + se arrumar"],
  ["17:30","Comer (o que tiver)"],
  ["18:40","Sai pra escola"],
  ["19:00–22:20","Escola"],
  ["22:50","Chega em casa"],
  ["00:00","Dormir (seg–sex)"]
];
const DIA_TREINO={
  1:["08:30–09:00","🏃 CORRIDA 30 min"],
  2:["06:50–07:20","💪 CALISTENIA 20 min"],
  3:["08:30–09:00","🏃 CORRIDA 30 min"],
  4:["06:50–07:20","💪 CALISTENIA 20 min"],
  5:["08:30–09:00","🏃 CORRIDA 30 min"],
  6:["08:30–09:10","💪 CALISTENIA 20 min"],
  0:["10:00","💪 CALISTENIA 20 min + revisão semanal 30 min"]
};
const TREINO_LABELS={
  1:"Corrida 08:30",2:"Calistenia 06:50",3:"Corrida 08:30",
  4:"Calistenia 06:50",5:"Corrida 08:30",6:"Calistenia 08:30",
  0:"Calistenia + Revisão"
};
const CKS=[
  "Água 1 — acordar","Água 2 — manhã","Água 3 — almoço","Água 4 — tarde",
  "Treino do dia (corrida/casa)","Estudo 50 min (10:00–10:50)",
  "Escola (19:00–22:20)","Tela off 23:00"
];
const CKS_META=["06:00","09:00","12:30","17:30","08:30/06:50","10:00","19:00","23:00"];

/* Treino progressivo — 4 fases */
const TREINO_FASES=[
  {semanas:"1–2",label:"Base",items:["Flexão joelho/parede 3×8","Agachamento livre 3×12","Prancha 3×20s","Superman 3×15s","Ponte glúteo 3×12"]},
  {semanas:"3–4",label:"Volume",items:["Flexão padrão 3×8","Agachamento + salto 3×10","Prancha 3×30s","Superman 3×20s","Afundo estático 3×8/perna"]},
  {semanas:"5–6",label:"Intensidade",items:["Flexão fechada 3×8","Agach. búlgaro 3×8","Prancha 3×45s","Superman 3×30s","Flexão pike 3×6"]},
  {semanas:"7+",label:"Unilateral",items:["Flexão archer 3×5","Pistola assistida 3×5","Prancha 3×60s","Superman 3×45s","Core dinâmico 3×12"]}
];

/* ===== ESTADO ===== */
const STORAGE_PREFIX="rot-";
function todayKey(){
  const d=new Date();return STORAGE_PREFIX+d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function loadDay(){try{return JSON.parse(localStorage.getItem(todayKey())||"{}")}catch(e){return {}}}
function saveDay(o){localStorage.setItem(todayKey(),JSON.stringify(o))}
function loadAll(){
  let total=0,done=0,streak=0,best=0;const keys=Object.keys(localStorage);
  const today=new Date().toISOString().split("T")[0];
  for(const k of keys){if(!k.startsWith(STORAGE_PREFIX))continue;
    try{const o=JSON.parse(localStorage.getItem(k));const cnt=Object.values(o).filter(Boolean).length;total+=8;done+=cnt;
      const d=k.slice(STORAGE_PREFIX.length);
      if(d<=today && cnt===8){streak++}else if(cnt<8){streak=0}
      best=Math.max(best,streak);
    }catch(e){}
  }
  return {total,done,streak,best,weekPct:total?Math.round(done/total*100):0};
}

/* ===== RENDER ===== */
const _DOW=new Date().getDay();
const _DATE=new Date();
console.log("[Rotina] DOW:",_DOW,"Date:",_DATE);

function mkTL(d){
  const t=BASE.map(([time,label])=>({time,label}));
  if(d===6)return[["até 08:00","Acordar"],["08:30–09:10","💪 CALISTENIA 20 min"],["12:00–13:00","Curso"],["14:00–15:00","Bloco estudo maior"],["Tarde","Treino casa / livre"],["Noite","Livre"],["23:30","Dormir"]].map(([time,label])=>({time,label}));
  if(d===0)return[["Livre o dia todo",""],["10:00","💪 CALISTENIA + revisão semanal 30 min"],["23:30","Dormir"]].map(([time,label])=>({time,label}));
  const tr=DIA_TREINO[d];if(tr){const idx=BASE.findIndex(([t])=>t==="08:20");if(idx>=0)t.splice(idx+1,0,{time:tr[0],label:tr[1]});}
  return t;
}
const TL=mkTL(_DOW);

function render(){
  const ds=String(_DATE.getDate()).padStart(2,"0")+"/"+String(_DATE.getMonth()+1).padStart(2,"0");
  const label=_DOW===0?" • revisão + treino":_DOW===6?" • curso 12h + estudo 14h + treino":" • escola 19–22:20 • treino: "+(TREINO_LABELS[_DOW]||"—");
  document.getElementById("dayName").textContent=DIAS[_DOW];
  document.getElementById("todayDate").textContent=ds+label;

  /* Timeline */
  document.getElementById("timeline").innerHTML=TL.map((item,i)=>{
    const now=_DATE.getHours()*60+_DATE.getMinutes();
    const [h,m]=item.time.split(/[–:]/).map(Number);
    const itemMin=(h||0)*60+(m||0);
    const nxt=mkTL(_DOW)[i+1];
    const cls=itemMin<=now&&(i===TL.length-1||nxt&&parseInt(String(nxt.time).split(/[–:]/)[0])*60>now)?"current":itemMin<now?"past":"";
    return `<div class="timeline-item ${cls}"><span class="dot"></span><div class="time">${item.time}</div><div class="timeline-content"><div class="label">${item.label}</div></div></div>`;
  }).join("");

  /* Aulas */
  document.getElementById("aulas").innerHTML=AULAS[_DOW]?AULAS[_DOW].map((a,i)=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:.78rem"><span style="font-family:var(--font-mono);color:var(--warn);font-weight:700;min-width:24px">${i+1}ª</span><div><div class="subject-main">${a.split(" — ")[0]}</div><div class="subject-teacher">${a.split(" — ")[1]||""}</div></div></div>`).join(""):`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Sem aula hoje</div>`;

  /* Checklist */
  const s=loadDay();
  const box=document.getElementById("cks");
  box.innerHTML=CKS.map((c,i)=>`<label class="check-item ${s[i]?"done":""}" data-i="${i}"><input type="checkbox"${s[i]?" checked":""} hidden><div class="check-box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg></div><span class="check-label">${c}</span><span class="check-meta">${CKS_META[i]}</span></label>`).join("");
  box.querySelectorAll("input[type=checkbox]").forEach(inp=>inp.addEventListener("change",e=>{const lbl=e.target.closest(".check-item");const i=lbl.dataset.i;const o=loadDay();o[i]=e.target.checked;saveDay(o);lbl.classList.toggle("done",e.target.checked);updateProgress();}));
  updateProgress();

  /* Stats */
  const stats=loadAll();
  document.getElementById("streak").textContent=stats.streak;
  document.getElementById("weekPct").textContent=stats.weekPct+"%";
  document.getElementById("best").textContent=stats.best;
  document.getElementById("statsBar").style.display="grid";

  /* Progress ring */
  const pct=Math.round((Object.values(s).filter(Boolean).length/CKS.length)*100);
  const ring=document.getElementById("progressRing");
  if(ring)ring.style.strokeDashoffset=138*(1-pct/100);

  /* Train grid */
  const tg=document.getElementById("trainGrid");
  tg.innerHTML=TREINO_FASES.map((w,wi)=>`<div class="train-card ${wi===0?"current":""}"><div class="train-day">Semanas ${w.semanas} — ${w.label}</div><div class="train-items">${w.items.map(x=>`• ${x}`).join("<br>")}</div></div>`).join("");

  /* School table */
  document.getElementById("schoolBody").innerHTML=Object.entries(AULAS).map(([d,arr])=>`<tr><td><strong>${DIAS[d].charAt(0).toUpperCase()+DIAS[d].slice(1,3)}</strong></td>${arr.map(a=>`<td><div class="subject-main">${a.split(" — ")[0]}</div><div class="subject-teacher">${a.split(" — ")[1]||""}</div></td>`).join("")}</tr>`).join("");

  /* Tabs */
  document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>switchTab(btn.dataset.tab)));
}
function switchTab(name){
  document.querySelectorAll(".card").forEach(c=>c.classList.toggle("hidden",c.id!=="a-"+name));
  document.querySelectorAll(".tab").forEach(b=>{b.classList.toggle("active",b.dataset.tab===name);b.setAttribute("aria-selected",b.dataset.tab===name)});
  if(name==="check"){window.location.hash="check"}else if(name==="treino"){window.location.hash="treino"}else{window.location.hash=""}
}
function updateProgress(){
  const s=loadDay();const done=Object.values(s).filter(Boolean).length;const total=CKS.length;
  document.getElementById("progressPct").textContent=Math.round(done/total*100)+"%";
  document.getElementById("doneCount").textContent=done;
  document.getElementById("totalCount").textContent=total;
  document.getElementById("checkCount").textContent=done+"/"+total;
  const stats=loadAll();document.getElementById("streakToday").textContent=stats.streak;
  document.querySelectorAll(".check-item").forEach(el=>{const i=el.dataset.i;el.classList.toggle("done",!!s[i]);el.querySelector("input").checked=!!s[i]});
  const ring=document.getElementById("progressRing");if(ring)ring.style.strokeDashoffset=138*(1-done/total);
}
function clearToday(){if(confirm("Limpar checklist de hoje?")){localStorage.removeItem(todayKey());render();}}

function openExternal(url){window.open(url,"_blank")}

/* ===== CELULAR ===== */
async function runCelularAction(action){
  const out=document.getElementById("celularOutput");
  out.textContent="Executando: "+action+"...";
  if(action==="scrcpy"){
    out.innerHTML="Execute no PC:<br><code>adb connect SEU_IP:5555 && scrcpy</code><br><br>Ou rode <code>C:\\\\Users\\\\alenc\\\\scripts_celular\\\\setup_adb_wifi.bat</code>";
    return;
  }
  const map={"tema-escuro-ativar":"tema-escuro --ativar","tema-escuro-desativar":"tema-escuro --desativar"};
  const cmd=map[action]||action;
  out.innerHTML="No Termux (celular), execute:<br><code>python /sdcard/scripts/organiza_celular.py "+cmd+"</code>";
}
function showLocalInfo(){
  const ip=location.hostname==="localhost"||location.hostname==="127.0.0.1"?"SEU_IP_LOCAL":location.hostname;
  alert("No celular (mesma Wi-Fi):\nhttp://"+ip+":8765\n\nO 9router deve estar rodando no PC com --host 0.0.0.0");
}

/* Init */
render();
console.log("[Rotina] Render completo");

// Dismiss install banner if already dismissed
if(localStorage.getItem("rot-install-dismissed")){document.getElementById("installBanner").classList.remove("show")}

// Hash routing
if(window.location.hash==="#check"){switchTab("check")}else if(window.location.hash==="#treino"){switchTab("treino")}
window.addEventListener("hashchange",()=>{if(window.location.hash==="#check")switchTab("check");else if(window.location.hash==="#treino")switchTab("treino");});
