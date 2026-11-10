const app=document.querySelector('#app');
const pagesMode=Boolean(document.querySelector('meta[name=ada-mode]'));
const svg={
 share:'<path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8"/>',
 arrow:'<path d="M12 5v14m-5-5 5 5 5-5"/>',
 external:'<path d="M7 17 17 7M7 7h10v10"/>',
 pin:'<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 calendar:'<rect x="4" y="6" width="16" height="15" rx="2"/><path d="M8 3v6m8-6v6M4 11h16"/>',
 road:'<path d="M5 21 8 3m11 18L16 3M12 5v3m0 3v3m0 3v3"/>',
 spark:'<path d="M12 2c0 6-4 10-10 10 6 0 10 4 10 10 0-6 4-10 10-10-6 0-10-4-10-10Z"/>',
 wallet:'<path d="M19 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h13V8H6a2 2 0 0 1 0-4m13 8h2v4h-6v-4h4Z"/>',
 lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
 chart:'<path d="M4 4v16h16M8 16v-4m4 4V8m4 8v-6"/>',
 fuel:'<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10m0 4h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0v-6l-4-4"/>',
 left:'<path d="m15 18-6-6 6-6"/>',right:'<path d="m9 18 6-6-6-6"/>'
};
const ico=(name,size=18)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svg[name]}</svg>`;
const nf=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2});
const num=n=>nf.format(n);
const money=c=>num(c/100)+' ₺';
const km=n=>num(n)+' km';
const date=d=>new Date(d+'T12:00:00Z');
const fmt=(d,opt)=>new Intl.DateTimeFormat('tr-TR',{timeZone:'UTC',...opt}).format(date(d));
const long=d=>fmt(d,{day:'numeric',month:'long',year:'numeric'});
const short=d=>fmt(d,{day:'numeric',month:'short'});
const iso=d=>d.toISOString().slice(0,10);
const cyprus=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Famagusta'}).format();
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const total=(rs,k)=>rs.reduce((a,r)=>a+r[k],0);
const share=c=>Math.round(c*0.4);
const period=(mode,anchor)=>{
  const d=date(anchor);
  if(mode==='week') {
    d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
    const start=iso(d);
    d.setUTCDate(d.getUTCDate()+6);
    return {start,end:iso(d)};
  }
  if(mode==='month') {
    d.setUTCDate(1);const start=iso(d);
    d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);
    return {start,end:iso(d)};
  }
  return {start:anchor,end:anchor};
};
const inside=(rs,p)=>rs.filter(r=>r.date>=p.start && r.date<=p.end);
const periodName=(mode,p)=>mode==='month'?fmt(p.start,{month:'long',year:'numeric'}):mode==='day'?long(p.start):short(p.start)+' – '+short(p.end);
const get=(s)=>document.querySelector(s);
let toastTimer;
function toast(msg){const el=get('#toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
async function api(url,body) {
  const path=pagesMode && url==='public'?'./vardiyalar.json':'/api/'+url;
  const res=await fetch(path,body===undefined?{cache:'no-cache'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok) throw Object.assign(new Error(data.error),{status:res.status});
  return data;
}
const brand=()=>`<a class="brand" href="./" aria-label="Ada Mesaisi ana sayfa"><img src="./icon.svg" alt="" width="41" height="41"><span>Ada Mesaisi<small>KIBRIS’TA DİREKSİYON BAŞINDA</small></span></a>`;
const footer=()=>`<footer class="shell footer"><div class="checker" aria-hidden="true"></div><span>Bir sonraki turda görüşürüz! <b>✦</b></span>${pagesMode?'':`<a class="quiet" href="/sofor" aria-label="Sürücü girişi" title="Sürücü girişi">${ico('lock',15)}</a>`}</footer>`;
const header=(action)=>`<header class="shell nav">${brand()}${action}</header>`;
const metric=(label,val,caption,icon,feature=false)=>`<article class="metric ${feature?'feature':''}"><div class="metric-top"><span class="metric-icon">${ico(icon)}</span><span>${label}</span></div><strong>${val}</strong><small>${caption}</small></article>`;
const labelFor={day:'Son mesai',week:'Haftanın kasası',month:'Ayın kasası'};
function chart(rs,key,formatter) {
  if(!rs.length) return '<div class="empty">Bu dönemde henüz vardiya kaydı yok.</div>';
  const max=Math.max(1,...rs.map(r=>r[key]));
  return `<div class="chart-scroll"><div class="bars" style="--count:${rs.length}">${rs.slice().reverse().map(r=>`<div class="bar-col"><span class="bar-value">${formatter(r[key])}</span><div class="bar-track"><div class="bar" style="--bar:${Math.max(2,r[key]/max*100)}%"></div></div><span class="bar-date">${short(r.date)}</span></div>`).join('')}</div></div>`;
}
function table(rs,privateView=false) {
  if(!rs.length) return '<div class="empty">Gösterilecek kayıt yok.</div>';
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Vardiya</th><th scope="col">Yol</th>${privateView?'<th scope="col">Yakıt</th>':''}<th scope="col">Kasa</th>${privateView?'<th scope="col">Payım</th><th scope="col"><span class="sr-only">İşlem</span></th>':''}</tr></thead><tbody>${rs.map(r=>`<tr><th scope="row">${short(r.date)} <small>${r.date.slice(0,4)}</small></th><td>${km(r.km)}</td>${privateView?`<td>${money(r.fuel)}</td>`:''}<td class="cash">${money(r.cash)}</td>${privateView?`<td class="cash">${money(share(r.cash))}</td><td><button class="text-btn edit" data-date="${r.date}">Düzenle</button></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
async function publicPage(){
  app.innerHTML=header(`<button id="share" class="button outline">${ico('share',16)} <span>Paylaş</span></button>`)+`
  <main class="shell">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <div class="hero-label"><span aria-hidden="true">☀</span> KIBRIS’TAN BİP BİP!</div>
        <h1 id="hero-title">Atla, <em>gidiyoruz!</em></h1>
        <p>Adaya taşındım, taksiye bindim. Her mesainin sonunda bakalım taksimetre ne demiş.</p>
        <div class="hero-actions">
          <a class="button yellow" href="#kasa">Kasa ne yaptı? ${ico('arrow',16)}</a>
          <button class="horn" id="horn" type="button">Bip bip! <span aria-hidden="true">📣</span></button>
        </div>
      </div>
      <figure class="postcard">
        <img src="./hero.jpg" alt="Gün batımında Kıbrıs sahil yolunda ilerleyen sarı taksi" fetchpriority="high">
        <figcaption><span aria-hidden="true">✦</span> Ada turu · 01 <span aria-hidden="true">↗</span></figcaption>
        <span class="hero-stamp" aria-hidden="true">☀</span>
        <span class="postcard-star" aria-hidden="true">✷</span>
      </figure>
      <div id="confetti" class="confetti" aria-hidden="true"></div>
    </section>
    <div class="taxi-tape" aria-hidden="true"><span>ADA MODU AÇIK</span><span>✦</span><span>TAKSİ YOLDA</span><span>✦</span><span>ADA MODU AÇIK</span><span>✦</span><span>TAKSİ YOLDA</span></div>
    <section id="kasa" class="section">
      <div class="section-head"><div><span class="eyebrow"><span class="dot"></span> TAKSİMETRE</span><h2>Ne yaptık bakalım?</h2></div><div id="report-date" class="date-chip"></div></div>
      <div id="public-data" aria-live="polite"><div class="empty">Kasa kayıtları yükleniyor…</div></div>
    </section>
  </main>`+footer();
  const confetti=get('#confetti');
  let confettiTimer;
  function celebrate() {
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    clearTimeout(confettiTimer);
    confetti.innerHTML=Array.from({length:24},(_,i)=>
      `<i style="--x:${4+(i*31)%93}%;--delay:${(i%7)*45}ms;--drift:${(i%2?-1:1)*(18+i*3)}px"></i>`).join('');
    confettiTimer=setTimeout(()=>confetti.replaceChildren(),2100);
  }
  get('#horn').onclick=()=>{
    celebrate();
    toast('Bip bip! 🚕');
  };
  celebrate();
  get('#share').onclick=async()=>{
    if(!pagesMode && ['127.0.0.1','localhost','[::1]'].includes(location.hostname)){
      toast('Bu adres şimdilik bu Mac’te açılır.');
      return;
    }
    const url=new URL('./',location.href).href;
    try {
      if(navigator.share) await navigator.share({title:'Ada Mesaisi',text:'Kıbrıs taksi günlüğüme göz at!',url});
      else {await navigator.clipboard.writeText(url);toast('Bağlantı kopyalandı.');}
    } catch(e){if(e.name!=='AbortError') window.prompt('Paylaşmak için bağlantıyı kopyala:',url);}
  };
  try {
    const {reports,demo}=await api('public');
    if(!reports.length){get('#public-data').innerHTML='<div class="empty">İlk vardiya raporu gelince kasa ve kilometre burada görünecek.</div>';return;}
    const anchor=reports[0].date;
    get('#report-date').innerHTML=ico('calendar',15)+' Son mesai · '+long(anchor);
    const periods=Object.fromEntries(Object.keys(labelFor).map(mode=>[mode,inside(reports,period(mode,anchor))]));
    get('#public-data').innerHTML=`${demo?'<div class="demo-note"><span>ÖRNEK</span> İki vardiyalık deneme turu</div>':''}
    <div class="metrics">${Object.entries(labelFor).map(([mode,label],i)=>metric(label,money(total(periods[mode],'cash')),km(total(periods[mode],'km'))+(i?' · '+periods[mode].length+' vardiya':''),['wallet','calendar','chart'][i],!i)).join('')}</div>
    <div class="panel overview"><div class="panel-head"><div><span class="eyebrow">TAKSİMETRE GRAFİĞİ</span><h3>Gün gün kasa</h3><p class="sub" id="public-period"></p></div>
    <div class="segmented" aria-label="Grafik dönemi"><button data-mode="week" aria-pressed="true">Hafta</button><button data-mode="month" aria-pressed="false">Ay</button></div></div>
    <div id="public-chart"></div></div>
    <div class="panel history"><div class="panel-head"><div><span class="eyebrow">GERİYE BAKIŞ</span><h3>Son turlar</h3></div>${ico('road',23)}</div>${table(reports.slice(0,10))}</div>`;
    const draw=mode=>{
      get('#public-period').textContent=periodName(mode,period(mode,anchor));
      get('#public-chart').innerHTML=chart(periods[mode],'cash',money);
      document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    };
    document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>draw(b.dataset.mode));draw('week');
  } catch {get('#public-data').innerHTML='<div class="empty">Kasa verileri yüklenemedi. Sayfayı yenileyip tekrar dene.</div>';}
}
publicPage();
