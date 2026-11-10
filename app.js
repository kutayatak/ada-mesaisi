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
const mealAllowance=50_000;
const wageOf=row=>row.wage??share(row.cash);
const wagesFor=rows=>rows.reduce((sum,row)=>sum+wageOf(row),0);
const publicEarnings=row=>row.earnings??(share(row.cash-mealAllowance)+mealAllowance);
const bestBy=(rows,key)=>rows.reduce((best,row)=>!best||row[key]>best[key]?row:best,null);

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
let vault;
const offlineReports=document.querySelector('#private-reports');
function toast(msg){const el=get('#toast');el.textContent=msg;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
async function api(url,body) {
  if(pagesMode && url.startsWith('admin/')) return vault.vaultApi(url,body);
  const path=pagesMode && url==='public'?'./vardiyalar.json':'/api/'+url;
  const res=await fetch(path,body===undefined?{cache:'no-cache'}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await res.json();
  if(!res.ok) throw Object.assign(new Error(data.error),{status:res.status});
  return data;
}
const brand=()=>`<button class="brand" type="button"><img src="./icon.svg" alt="" width="43" height="43"><span>Ada Mesaisi<small>KIBRIS TAKSİ GÜNLÜĞÜ</small></span></button>`;
const footer=()=>`<footer class="shell footer"><div class="checker" aria-hidden="true"></div><span>Kıbrıs’ta direksiyon başından. <b>✦</b></span>${pagesMode?'':`<a class="quiet" href="/sofor" aria-label="Sürücü girişi" title="Sürücü girişi">${ico('lock',15)}</a>`}</footer>`;
const header=(action)=>`<header class="shell nav">${brand()}${action}</header>`;
const metric=(label,val,caption,icon,feature=false)=>`<article class="metric ${feature?'feature':''}"><div class="metric-top"><span class="metric-icon">${ico(icon)}</span><span>${label}</span></div><strong>${val}</strong><small>${caption}</small></article>`;
const labelFor={day:'Son vardiyadaki kazancım',week:'Haftalık kazancım',month:'Aylık kazancım'};
function chart(rs,key,formatter) {
  if(!rs.length) return '<div class="empty">Bu dönemde henüz vardiya kaydı yok.</div>';
  const max=Math.max(1,...rs.map(r=>r[key]));
  return `<div class="chart-scroll"><div class="bars" style="--count:${rs.length}">${rs.slice().reverse().map(r=>`<div class="bar-col"><span class="bar-value">${formatter(r[key])}</span><div class="bar-track"><div class="bar" style="--bar:${Math.max(2,r[key]/max*100)}%"></div></div><span class="bar-date">${short(r.date)}</span></div>`).join('')}</div></div>`;
}
function table(rs,privateView=false) {
  if(!rs.length) return '<div class="empty">Gösterilecek kayıt yok.</div>';
  return `<div class="table-scroll"><table><thead><tr><th scope="col">Vardiya</th><th scope="col">Yol</th>${privateView?'<th scope="col">Yakıt</th>':''}<th scope="col">${privateView?'Kasa':'Kazancım'}</th>${privateView?'<th scope="col">Payım</th><th scope="col"><span class="sr-only">İşlem</span></th>':''}</tr></thead><tbody>${rs.map(r=>`<tr><th scope="row">${short(r.date)} <small>${r.date.slice(0,4)}</small></th><td>${km(r.km)}</td>${privateView?`<td>${r.fuel===null?'—':money(r.fuel)}</td>`:''}<td class="cash">${money(privateView?r.cash:publicEarnings(r))}</td>${privateView?`<td class="cash">${money(share(r.cash))}</td><td><button class="text-btn edit" data-date="${r.date}">Düzenle</button></td>`:''}</tr>`).join('')}</tbody></table></div>`;
}
async function publicPage(){
  document.title='Ada Mesaisi — Kıbrıs Taksi Günlüğü';
  app.innerHTML=header(`<button id="share" class="button outline">${ico('share',16)} <span>Paylaş</span></button>`)+`
  <main class="shell">
    <section class="hero night-hero" aria-labelledby="hero-title">
      <img class="night-photo" src="./hero.jpg" alt="Gün batımında Kıbrıs sahil yolunda ilerleyen taksi" fetchpriority="high">
      <div class="hero-copy">
        <h1 id="hero-title">Kıbrıs’ta<br><em>taksi günlüğüm.</em></h1>
        <p>Vardiya vardiya kazancım ve yaptığım yol.</p>
        <div class="hero-actions">
          <a class="button yellow" href="#kasa">Kazanca bak ${ico('arrow',16)}</a>
          <button class="horn" id="horn" type="button" aria-label="Bip bip efekti">Bip bip <span aria-hidden="true">↗</span></button>
        </div>
      </div>
      <div id="confetti" class="confetti" aria-hidden="true"></div>
    </section>
    <section id="kasa" class="section">
      <div class="section-head"><div><h2>Kazanç özeti</h2></div><div id="report-date" class="date-chip"></div></div>
      <div id="public-data" aria-live="polite"><div class="empty">Taksimetre açılıyor…</div></div>
    </section>
  </main>`+footer();
  let taps=0,lastTap=0;
  async function showLogin() {
    if (pagesMode) vault=await import('./vault.js?v=3');
    login();
    get('#password').focus();
  }
  get('.brand').onclick=async()=>{
    const now=Date.now();
    taps=now-lastTap>1500?1:taps+1;
    lastTap=now;
    if(taps!==5) return;
    taps=0;
    try {
      await showLogin();
    } catch {toast('Sürücü paneli açılamadı. Sayfayı yenileyip tekrar dene.');}
  };
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
    if(!get('#public-data')) return;
    if(!reports.length){
      get('#public-data').innerHTML=`<div class="metrics">${Object.values(labelFor)
        .map((label,i)=>metric(label,'—','Kayıt bekleniyor',['wallet','calendar','chart'][i],!i)).join('')}</div>`;
      return;
    }
    const shifts=reports.map(row=>({...row,earnings:publicEarnings(row)}));
    const anchor=shifts[0].date;
    get('#report-date').innerHTML=ico('calendar',15)+' Son mesai · '+long(anchor);
    const periods=Object.fromEntries(Object.keys(labelFor).map(mode=>[mode,inside(shifts,period(mode,anchor))]));
    get('#public-data').innerHTML=`${demo?'<div class="demo-note"><span>ÖRNEK</span> İki vardiyalık deneme turu</div>':''}
    <div class="metrics">${Object.entries(labelFor).map(([mode,label],i)=>metric(label,money(total(periods[mode],'earnings')),km(total(periods[mode],'km'))+(i?' · '+periods[mode].length+' vardiya':''),['wallet','calendar','chart'][i],!i)).join('')}</div>
    <div class="public-highlights"><span><b>${reports.length}</b> vardiya</span><span><b>${km(total(reports,'km'))}</b> toplam yol</span><span><b>${money(bestBy(shifts,'earnings').earnings)}</b> en iyi vardiya</span></div>
    <div class="panel overview"><div class="panel-head"><div><span class="eyebrow">TAKSİMETRE GRAFİĞİ</span><h3>Gün gün kazancım</h3><p class="sub" id="public-period"></p></div>
    <div class="segmented" aria-label="Grafik dönemi"><button data-mode="week" aria-pressed="true">Hafta</button><button data-mode="month" aria-pressed="false">Ay</button></div></div>
    <div id="public-chart"></div></div>
    <div class="panel history"><div class="panel-head"><div><span class="eyebrow">GERİYE BAKIŞ</span><h3>Son turlar</h3></div>${ico('road',23)}</div>${table(reports.slice(0,10))}</div>`;
    const draw=mode=>{
      get('#public-period').textContent=periodName(mode,period(mode,anchor));
      get('#public-chart').innerHTML=chart(periods[mode],'earnings',money);
      document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    };
    document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>draw(b.dataset.mode));draw('week');
  } catch {if(get('#public-data')) get('#public-data').innerHTML='<div class="empty">Kasa verileri yüklenemedi. Sayfayı yenileyip tekrar dene.</div>';}
}
function login(message=''){
  document.title='Sürücü Paneli — Ada Mesaisi';
  app.innerHTML=header(`<a class="button outline" href="./">Vitrine dön ${ico('external',16)}</a>`)+`
    <main class="shell login-wrap"><section class="panel login">
    <div class="metric-icon">${ico('lock',23)}</div><span class="eyebrow">ÖZEL ALAN</span><h1>Sürücü girişi</h1>
    <p>Vardiya raporlarını ve kendi kazancını görmek için giriş yap.</p>
    <form id="login"><label for="password">Şifre</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="512"  required><p class="error" id="login-error" role="alert">${escape(message)}</p><button class="button dark" type="submit">Giriş yap ${ico('external',16)}</button></form></section></main>`+footer();
  get('#login').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;get('#login-error').textContent='';
    try {await api('admin/login',{password:get('#password').value});await (pagesMode?driverDashboard():adminPage());}
    catch(err){get('#login-error').textContent=err.message;} finally{b.disabled=false;}
  };
}
async function driverDashboard() {
  const privateRows=offlineReports?JSON.parse(offlineReports.textContent):null;
  let publicRows=[],feedError=false;
  if(!privateRows) {
    try {({reports:publicRows}=await api('public'));}
    catch {feedError=true;}
  }
  const records=(privateRows??publicRows.map(row=>({
    date:row.date,km:row.km,wage:publicEarnings(row)-mealAllowance,fuel:null,cash:null
  }))).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const newest=records[0]?.date||cyprus();
  let mode='month',anchor=newest,plot='wage';
  app.innerHTML=header(`<div class="nav-actions"><a class="button outline" href="${offlineReports?'https://kutayatak.github.io/ada-mesaisi/':'./'}">Vitrin</a>${offlineReports?'':'<button class="button outline" id="logout">Kilitle</button>'}</div>`)+`
    <main class="shell admin driver-dashboard">
      <header class="driver-head">
        <span class="eyebrow">${ico('lock',14)} SÜRÜCÜ PANELİ</span>
        <h1>Vardiya özeti</h1>
        <p>${records.length?short(records.at(-1).date)+' – '+long(newest):'Vardiya kaydı bekleniyor'}</p>
      </header>
      <div id="admin-lifetime" class="lifetime"></div>
      ${!privateRows?'<p class="access-note">Yakıt ve ham kasa, Mac’teki özel vardiya özetinde.</p>':''}
      ${!records.length && feedError?'<p class="error">Vardiyalara ulaşılamadı. Sayfayı yenileyip tekrar dene.</p>':''}
      <section class="panel admin-stats">
        <div class="admin-controls">
          <div class="segmented" aria-label="Kazanç dönemi">
            <button data-driver-period="week">Hafta</button><button data-driver-period="month">Ay</button><button data-driver-period="all">Tümü</button>
          </div>
          <div class="stepper" id="driver-stepper">
            <button class="icon-btn" id="prev" aria-label="Önceki dönem">${ico('left',16)}</button>
            <span id="admin-period"></span><button class="icon-btn" id="next" aria-label="Sonraki dönem">${ico('right',16)}</button>
          </div>
        </div>
        <div id="admin-data" aria-live="polite"></div>
        <div class="trend-head"><h3>Vardiya grafiği</h3>
          <div class="segmented" aria-label="Grafik göstergesi">
            <button data-driver-plot="wage">Kazanç</button><button data-driver-plot="km">Yol</button>
            ${privateRows?'<button data-driver-plot="fuel">Yakıt</button>':''}
          </div>
        </div>
        <div id="admin-chart"></div>
      </section>
      <section class="panel history"><div class="panel-head"><h3>Vardiya dökümü</h3>${ico('road',23)}</div><div id="driver-table"></div></section>
    </main>`+footer();
  const stat=(label,value,detail)=>`<div><small>${label}</small><strong>${value}</strong><span>${detail}</span></div>`;
  const peak=records.reduce((best,row)=>!best||wageOf(row)>wageOf(best)?row:best,null);
  get('#admin-lifetime').innerHTML=
    stat('TOPLAM PAYIM',money(wagesFor(records)),records.length+' vardiya · %40 pay')+
    stat('TOPLAM YOL',km(total(records,'km')),records.length?km(total(records,'km')/records.length)+' / vardiya':'—')+
    stat('EN İYİ VARDİYA',peak?money(wageOf(peak)):'—',peak?long(peak.date):'—')+
    stat('TOPLAM YAKIT',privateRows?money(total(records,'fuel')):'—',privateRows&&total(records,'km')?money(total(records,'fuel')/total(records,'km'))+' / km':'—');
  function draw() {
    const all=mode==='all';
    const p=all?null:period(mode,anchor);
    const rs=all?records:inside(records,p);
    const wages=wagesFor(rs), distance=total(rs,'km'), fuel=privateRows?total(rs,'fuel'):null;
    let comparison='Vardiya başına';
    if(p && rs.length) {
      const d=date(p.start);d.setUTCDate(d.getUTCDate()-1);
      const prev=inside(records,period(mode,iso(d)));
      if(prev.length && wagesFor(prev)>0) {
        const change=100*(wages/rs.length/(wagesFor(prev)/prev.length)-1);
        comparison=`${change>=0?'+':''}${num(change)}% · önceki dönemin günlük ortalamasına göre`;
      }
    }
    document.querySelectorAll('[data-driver-period]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.driverPeriod===mode)));
    get('#driver-stepper').hidden=all;
    if(p) {
      get('#admin-period').textContent=periodName(mode,p);
      get('#prev').disabled=!records.length||records.at(-1).date>=p.start;
      get('#next').disabled=newest<=p.end;
    }
    get('#admin-data').innerHTML=`<div class="metrics admin-metrics">
      ${metric('Benim kazancım',money(wages),rs.length+' vardiya · %40 pay','wallet',true)}
      ${metric('Günlük ortalama',rs.length?money(wages/rs.length):'—',comparison,'chart')}
      ${metric('Yol',km(distance),distance?money(wages/distance)+' pay / km':'—','road')}
      ${metric('Yakıt',fuel===null?'—':money(fuel),fuel!==null&&distance?money(fuel/distance)+' / km':'—','fuel')}
      </div>`;
    const chartRows=rs.map(row=>({...row,wage:wageOf(row)}));
    document.querySelectorAll('[data-driver-plot]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.driverPlot===plot)));
    get('#admin-chart').innerHTML=chart(chartRows,plot,plot==='km'?km:money);
    get('#driver-table').innerHTML=rs.length?`<div class="table-scroll"><table><thead><tr>
      <th scope="col">Vardiya</th><th scope="col">Payım</th><th scope="col">Yol</th>
      ${privateRows?'<th scope="col">Yakıt</th><th scope="col">Ham kasa</th>':''}
      </tr></thead><tbody>${rs.map(row=>`<tr><th scope="row">${short(row.date)}</th><td class="cash">${money(wageOf(row))}</td><td>${km(row.km)}</td>
      ${privateRows?`<td>${money(row.fuel)}</td><td>${money(row.cash)}</td>`:''}</tr>`).join('')}</tbody></table></div>`
      :'<div class="empty">Bu dönemde vardiya kaydı yok.</div>';
  }
  function step(direction) {
    const d=date(period(mode,anchor).start);
    if(mode==='week') d.setUTCDate(d.getUTCDate()+direction*7);
    else d.setUTCMonth(d.getUTCMonth()+direction);
    anchor=iso(d);draw();
  }
  document.querySelectorAll('[data-driver-period]').forEach(b=>b.onclick=()=>{mode=b.dataset.driverPeriod;anchor=newest;draw();});
  document.querySelectorAll('[data-driver-plot]').forEach(b=>b.onclick=()=>{plot=b.dataset.driverPlot;draw();});
  get('#prev').onclick=()=>step(-1);
  get('#next').onclick=()=>step(1);
  if(!offlineReports) get('#logout').onclick=async()=>{await api('admin/logout',{});login();};
  draw();
}
async function adminPage() {
  document.title='Sürücü Paneli — Ada Mesaisi';
  let data;
  try {data=await api('admin/reports');}
  catch(e){login(e.status===401?'':e.message);return;}
  let records=data.reports,mode='month',anchor=records[0]?.date||cyprus(),editDate='';
  let plot='wage';
  app.innerHTML=header(`<div class="nav-actions"><a class="button outline" href="./">Vitrin ${ico('external',15)}</a><button class="button outline" id="logout">Çıkış</button></div>`)+`
  <main class="shell admin">
    <div class="admin-banner"><div><span class="eyebrow">${ico('lock',14)} SADECE SENİN İÇİN</span><h1>Sürücü paneli<span>.</span></h1><p>Kendi kazancın, vardiya performansın ve yol defterin.</p></div><span class="banner-icon">${ico('road',84)}</span></div>
    <div id="admin-lifetime" class="lifetime" aria-label="Tüm vardiyaların özeti"></div>
    <div class="admin-grid">
      <section class="panel admin-stats"><div class="panel-head"><div><span class="eyebrow">01 / HESAP KİTAP</span><h2>Mesai özeti</h2></div></div>
      <div class="admin-controls"><div class="segmented" aria-label="Kazanç dönemi"><button data-mode="week" aria-pressed="true">Hafta</button><button data-mode="month" aria-pressed="false">Ay</button></div>
      <div class="stepper"><button class="icon-btn" id="prev" aria-label="Önceki dönem">${ico('left',16)}</button><span id="admin-period"></span><button class="icon-btn" id="next" aria-label="Sonraki dönem">${ico('right',16)}</button></div></div>
      <div id="admin-data"></div>
      <div class="trend-head"><h3>Vardiya grafiği</h3><div class="segmented" aria-label="Grafik göstergesi"><button data-plot="wage" aria-pressed="true">Payım</button><button data-plot="km" aria-pressed="false">Yol</button></div></div>
      <div id="admin-chart"></div></section>
      <section class="panel entry" id="rapor"><span class="eyebrow">02 / YENİ MESAİ</span><h2>Kasa ekle</h2>
      <p class="sub">${pagesMode?'Vitrine gönderdiğin vardiyalar burada otomatik görünür. Bu formdaki değişiklikler bu tarayıcıda kalır.':'Mesajını yapıştır, okunan rakamları kontrol et ve kaydet.'}</p>
      <form id="parse"><label for="message">Kasa mesajı</label><textarea id="message" rows="6" maxlength="6000" placeholder="GG.AA.YY&#10;… km&#10;yakıt … TL&#10;kalan … TL" required></textarea><button class="button yellow" type="submit">${ico('spark',16)} Mesajı oku</button><button type="button" id="manual" class="text-btn">Elle gir</button></form>
      <div id="review" hidden><hr><h3 id="review-title">Rakamları kontrol et</h3><p id="issues" role="status"></p>
      <form id="save"><div class="fields">
        <label>Tarih<input id="date" type="date" required max="${cyprus()}"></label>
        <label>Kilometre<input id="km" type="number" min="0" max="10000" step=".01" inputmode="decimal" required></label>
        <label>Yakıt (TL)<input id="fuel" type="number" min="0" max="1000000" step=".01" inputmode="decimal" required></label>
        <label>Kalan kasa (TL)<input id="cash" type="number" min="0" max="1000000" step=".01" inputmode="decimal" required></label>
      </div><div id="calc" class="calc"></div><button type="submit" class="button dark" id="save-btn">Onayla ve kaydet</button><button type="button" class="text-btn" id="cancel-review">Vazgeç</button></form></div>
      <p id="entry-error" class="error" role="alert"></p>
      ${data.pages?`<button id="publish" type="button" class="text-btn">Vitrini eşitle</button><p id="publish-status" class="sub" role="status"></p>`:''}</section>
    </div>
    <section class="panel history"><div class="panel-head"><div><span class="eyebrow">03 / ARŞİV</span><h3>Vardiya kayıtları</h3></div>${ico('road',23)}</div><div id="private-table"></div></section>
    ${data.examples.length?'<details class="panel examples"><summary>Örnek vardiyalarla hesapları incele</summary><p class="sub">Bu kayıtlar sadece örnek; kayıt defterine ve kazanç ortalamana dahil değil.</p>'+table(data.examples)+'</details>':''}
  </main>`+footer();
  function draw() {
    const p=period(mode,anchor), rs=inside(records,p), n=rs.length;
    const wages=wagesFor(rs);
    const avg=(value,formatter)=>n?formatter(value/n):'—';
    const peak=bestBy(rs,'cash');
    const fuelRows=rs.filter(r=>r.fuel!==null);
    const fuel=total(fuelRows,'fuel');
    const fuelDistance=total(fuelRows,'km');
    const prevAnchor=date(p.start);
    prevAnchor.setUTCDate(prevAnchor.getUTCDate()-1);
    const previous=inside(records,period(mode,iso(prevAnchor)));
    const previousAverage=previous.length?wagesFor(previous)/previous.length:0;
    const averageChange=n&&previousAverage?100*(wages/n/previousAverage-1):null;
    const change=averageChange===null?'':`${averageChange>=0?'+':''}${num(averageChange)}% · önceki dönemin günlük ortalamasına göre`;
    get('#admin-period').textContent=periodName(mode,p);
    get('#prev').disabled=!records.length || records.at(-1).date>=p.start;
    get('#next').disabled=!records.length || records[0].date<=p.end;
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    const overallBest=bestBy(records,'cash');
    get('#admin-lifetime').innerHTML=`
      <div><small>TÜM VARDİYALAR</small><strong>${records.length}</strong><span>${records.length?short(records.at(-1).date)+' – '+short(records[0].date):'Kayıt bekleniyor'}</span></div>
      <div><small>TOPLAM PAYIM</small><strong>${money(wagesFor(records))}</strong><span>Vardiya kasasının %40’ı</span></div>
      <div><small>TOPLAM YOL</small><strong>${km(total(records,'km'))}</strong><span>${records.length?km(total(records,'km')/records.length)+' / vardiya':'—'}</span></div>
      <div><small>EN İYİ VARDİYAM</small><strong>${overallBest?money(share(overallBest.cash)):'—'}</strong><span>${overallBest?long(overallBest.date):'—'}</span></div>`;
    get('#admin-data').innerHTML=`<div class="metrics admin-metrics">
      ${metric('Benim kazancım',money(wages),n+' vardiya · %40 pay','wallet',true)}
      ${metric('Günlük ortalama',avg(wages,money),change||'Kayıtlı vardiya başına','chart')}
      ${metric('Toplam kasa',money(total(rs,'cash')),peak?'En iyi gün '+short(peak.date)+' · '+money(peak.cash):'—','spark')}
      ${metric('Toplam yol',km(total(rs,'km')),'Ort. '+avg(total(rs,'km'),km)+' / vardiya','road')}
    </div>
    <div class="fuel-strip">${ico('fuel')} <div><b>Yakıt ${fuelRows.length?money(fuel):'—'}</b><small>${fuelRows.length
      ?`${fuelRows.length}/${n} vardiya · ${fuelDistance?money(fuel/fuelDistance)+' / km':'km bilgisi yok'}`
      :'Yakıt rakamları için özel arşivi içe aktar.'}</small></div></div>`;
    drawChart(rs);
    get('#private-table').innerHTML=table(records,true);
    document.querySelectorAll('.edit').forEach(b=>b.onclick=()=>{const r=records.find(r=>r.date===b.dataset.date);openReview({...r,fuel:r.fuel===null?'':r.fuel/100,cash:r.cash/100},[],r.date);get('#rapor').scrollIntoView({behavior:'smooth'});});
  }
  function drawChart(rows=inside(records,period(mode,anchor))) {
    document.querySelectorAll('[data-plot]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plot===plot)));
    get('#admin-chart').innerHTML=plot==='km'
      ?chart(rows,'km',km)
      :chart(rows.map(r=>({...r,wage:share(r.cash)})),'wage',money);
  }
  function openReview(fields={},issues=[],editing='') {
    editDate=editing;
    get('#review').hidden=false;
    get('#review-title').textContent=editDate?'Vardiyayı düzenle':'Rakamları kontrol et';
    get('#save-btn').textContent=editDate?'Değişiklikleri kaydet':'Onayla ve kaydet';
    get('#issues').textContent=issues.join(' ');
    get('#entry-error').textContent='';
    for(const k of ['date','km','fuel','cash']) get('#'+k).value=fields[k]??'';
    get('#date').readOnly=Boolean(editDate);
    updateCalc();
    get('#review-title').setAttribute('tabindex','-1');get('#review-title').focus();
  }
  function updateCalc(){
    const v=get('#cash').value;
    get('#calc').innerHTML=v&&Number(v)>=0?`<span>Benim payım <b>${money(share(Math.round(Number(v)*100)))}</b></span><span>Vitrindeki kasa <b>${money(share(Math.round(Number(v)*100))+mealAllowance)}</b></span>`:'';
  }
  get('#cash').oninput=updateCalc;
  get('#manual').onclick=()=>openReview({date:cyprus()});
  get('#cancel-review').onclick=()=>{get('#review').hidden=true;get('#entry-error').textContent='';get('#message').focus();};
  get('#parse').onsubmit=async e=>{
    e.preventDefault();e.submitter.disabled=true;get('#entry-error').textContent='';
    try {const {fields,issues}=await api('admin/parse',{message:get('#message').value});openReview(fields,issues);}
    catch(err){if(err.status===401)return login(err.message);get('#entry-error').textContent=err.message;}
    finally{e.submitter.disabled=false;}
  };
  get('#save').onsubmit=async e=>{
    e.preventDefault();const btn=e.submitter;btn.disabled=true;get('#entry-error').textContent='';
    const fields=Object.fromEntries(['date','km','fuel','cash'].map(k=>[k,get('#'+k).value]));
    const save=(replace)=>api('admin/reports',{...fields,replace});
    try {
      let result;
      try {result=await save(Boolean(editDate));}
      catch(err){
        if(err.status!==409) throw err;
        if(!confirm(long(fields.date)+' tarihli kaydın üzerine yazılsın mı?')) return;
        result=await save(true);
      }
      records=[...records.filter(r=>r.date!==result.report.date),result.report].sort((a,b)=>b.date.localeCompare(a.date));
      anchor=result.report.date;
      get('#review').hidden=true;get('#message').value='';draw();
      toast('Vardiya kaydedildi.');
      if(result.pages) showPublish(result.pages);
    }catch(err){if(err.status===401)return login(err.message);get('#entry-error').textContent=err.message;}finally{btn.disabled=false;}
  };
  function showPublish(result) {
    get('#publish-status').textContent=result==='sent'
      ?'GitHub güncellemeyi aldı. Vitrine yansıması birkaç dakika sürebilir.'
      :'Kayıt Mac’te duruyor. GitHub’a göndermek için Vitrini eşitle’ye bas.';
  }
  if(data.pages) get('#publish').onclick=async e=>{
    const button=e.currentTarget;
    button.disabled=true;
    get('#publish-status').textContent='GitHub’a gönderiliyor…';
    try {showPublish((await api('admin/publish',{})).pages);}
    catch(err){if(err.status===401)return login(err.message);showPublish('failed');}
    finally {button.disabled=false;}
  };
  document.querySelectorAll('[data-plot]').forEach(b=>b.onclick=()=>{plot=b.dataset.plot;drawChart();});
  get('#logout').onclick=async()=>{try{await api('admin/logout',{});login();}catch(err){if(err.status===401) login();else toast(err.message);}};
  document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;draw();});
  const step=dir=>{
    const d=date(period(mode,anchor).start);
    if(mode==='week')d.setUTCDate(d.getUTCDate()+dir*7);else d.setUTCMonth(d.getUTCMonth()+dir);
    anchor=iso(d);draw();
  };
  get('#prev').onclick=()=>step(-1);get('#next').onclick=()=>step(1);draw();
}
if(offlineReports) driverDashboard();
else if(!pagesMode && location.pathname==='/sofor') adminPage();
else publicPage();
