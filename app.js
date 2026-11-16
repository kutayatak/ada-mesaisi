import './pwa.mjs?v=17';
import {mountMotion,watchMotion} from './motion.mjs?v=8';
import {cyprusToday} from './report.mjs?v=1';
import {LEAVE_DAYS,publicRows,publicPeriods,dayDate,addDays,weekStart,rowsInRange,monthComparison,sum,average,change,normalize,months,weeks,monthStats,weekdayStats,latestWeekProgress} from './stats.mjs?v=19';
const app=document.querySelector('#app'),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const pages=!!document.querySelector('meta[name=ada-mode]');
const decimal=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2});
const number=n=>decimal.format(n),money=n=>n==null?'—':number(n/100)+' ₺',rate=money;
const format=(s,options)=>new Intl.DateTimeFormat('tr-TR',{timeZone:'UTC',...options}).format(dayDate(s));
const short=s=>format(s,{day:'numeric',month:'short'}),long=s=>format(s,{day:'numeric',month:'long',year:'numeric'}),monthName=s=>format(s+'-01',{month:'long',year:'numeric'});
const weekdays=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];
const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14"/></svg>';
const taxi=`<svg class="taxi" viewBox="0 0 140 75" aria-hidden="true"><path fill="#f2c879" stroke="#184457" stroke-width="3" d="m27 38 14-23h47l22 23 16 4 5 18H9V45Z"/><path fill="#b3d5cf" stroke="#184457" stroke-width="3" d="m40 34 9-13h16v13Zm31-13h14l13 13H71Z"/><rect x="56" y="7" width="25" height="9" rx="2" fill="#f7f0dc" stroke="#184457" stroke-width="2"/><path d="M13 46h8m95 0h10M29 43h76" stroke="#184457" stroke-width="4" stroke-dasharray="7 5"/><g fill="#184457"><circle cx="34" cy="59" r="13"/><circle cx="106" cy="59" r="13"/></g><g fill="#f7f0dc"><circle cx="34" cy="59" r="5"/><circle cx="106" cy="59" r="5"/></g></svg>`;
const brand=()=>`<button class="brand" aria-label="Taksi Defteri" title="Taksi Defteri"><img class="brand-logo" src="./icons/logo-128.png" alt="" width="46" height="46"><span>Taksi Defteri<span class="brand-caption">KUTAY’IN KIBRIS GÜNLÜĞÜ</span></span></button>`;
const header=action=>`<header class="shell nav">${brand()}${action}</header>`;
function footer(showVisits = false) {
 const counter = showVisits ? '<span class="visit-count" hidden><span>Bugün / toplam</span></span>' : '';
 return `<footer class="shell"><div class="checker"></div><div class="footer-meta"><span>Taksi Defteri</span>${counter}</div><button class="install-button" type="button" data-install-app>Telefona ekle ↗</button></footer>`;
}
let visitBadge;
function mountVisitCount() {
 const slot = document.querySelector('.visit-count');
 if (!slot) return;
 if (!visitBadge) {
  visitBadge = new Image();
  visitBadge.alt = 'Sayfa açılışları, bugün ve toplam';
  visitBadge.height = 20;
  visitBadge.referrerPolicy = 'no-referrer';
  visitBadge.addEventListener('load', () => visitBadge.parentElement?.removeAttribute('hidden'), {once:true});
  const endpoint = new URL('https://hitscounter.dev/api/hit');
  endpoint.search = new URLSearchParams({
   url: 'https://kutayatak.github.io/ada-mesaisi/', label: 'Açılış',
   icon: 'eye', color: '#276d83', timezone: 'Asia/Famagusta'
  });
  visitBadge.src = endpoint.href;
 }
 slot.prepend(visitBadge);
 slot.hidden = !visitBadge.naturalWidth;
}
let records=[],timer,screen=0;
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),3000);}
function delta(n,label=''){return n==null?`<span class="muted">Kıyas için kayıt yok</span>`:`<span class="delta ${n<0?'down':''}">${n>=0?'↗':'↘'} %${decimal.format(Math.abs(n))}</span> ${label}`;}
function stat(label,value,detail='',cls=''){return `<article class="stat ${cls}"><span class="eyebrow">${label}</span><strong>${value}</strong><small>${detail}</small></article>`;}
function sectionTitle(kicker,title,extra=''){return `<div class="section-title"><div><span class="eyebrow">${kicker}</span><h2>${title}</h2></div>${extra}</div>`;}
async function load(){const res=await fetch(pages?'./vardiyalar.json':'/api/public',{cache:'no-cache'});if(!res.ok)throw new Error('Vardiyalar yüklenemedi.');return (await res.json()).reports;}
function celebrate(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const el=document.createElement('div');el.className='confetti';el.setAttribute('aria-hidden','true');el.innerHTML=Array.from({length:35},(_,i)=>`<i style="--x:${(i*29)%100}%;--r:${i*33}deg;--delay:${i%8*.05}s;--c:${['#f2c879','#dc674c','#518477'][i%3]}"></i>`).join('');document.body.append(el);setTimeout(()=>el.remove(),2200);}
function secret(){let taps=[];$('.brand').onclick=()=>{const now=Date.now();taps=taps.filter(t=>now-t<4500);taps.push(now);if(taps.length===5){taps=[];login();}};}
const chartMetrics={
 wage:{label:'Payım',format:money,color:'#258ca1'},
 km:{label:'Kilometre',format:value=>number(value)+' km',color:'#3b7961'},
 fuel:{label:'Yakıt',format:money,color:'#bf6541'}
};
function lineChart(rows,key){
 const metric=chartMetrics[key];
 const left=132,right=770,top=24,bottom=195;
 const values=rows.map(r=>r[key]);
 const peak=Math.max(...values,key==='km'?1:100);
 const unit=10**Math.floor(Math.log10(peak/4));
 const step=Math.ceil(peak/(4*unit))*unit;
 const max=step*4;
 const points=values.map((value,i)=>[
  left+(rows.length===1?.5:i/(rows.length-1))*(right-left),
  bottom-(value/max)*(bottom-top)
 ]);
 const path=points.map(([x,y],i)=>`${i?'L':'M'}${x},${y}`).join(' ');
 const grid=[0,1,2,3,4].map(i=>{
  const y=bottom-i*(bottom-top)/4;
  return `<path d="M${left} ${y}H${right}" stroke="currentColor" stroke-opacity=".16"/><text x="${left-12}" y="${y}" text-anchor="end" dominant-baseline="middle">${metric.format(i*step)}</text>`;
 }).join('');
 return `<div class="line-wrap"><svg class="line-chart" viewBox="0 0 800 220" role="img" aria-label="${metric.label} grafiği"><g class="chart-grid">${grid}</g><path d="${path} L${points.at(-1)[0]},${bottom} L${points[0][0]},${bottom}Z" fill="${metric.color}" opacity=".12"/><path d="${path}" fill="none" stroke="${metric.color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>${points.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="4" fill="${metric.color}"><title>${short(rows[i].date)} · ${metric.format(values[i])}</title></circle>`).join('')}</svg></div><div class="axis"><span>${short(rows[0].date)}</span><span>${short(rows.at(-1).date)}</span></div>`;
}
function plotControl(rows,target,key='wage',selectedDate,onSelect){
 const el=$(target), metric=chartMetrics[key];
 if(!rows.length){el.innerHTML='<p class="empty">Bu aralıkta kayıt yok.</p>';return;}
 let selected=rows.findIndex(row=>row.date===selectedDate);
 if (selected<0) selected=rows.length-1;
 el.innerHTML=`<div class="chart-readout" aria-live="polite"></div>${lineChart(rows,key)}<div class="date-pills" aria-label="Grafikten bir gün seç">${rows.map((r,i)=>`<button type="button" data-point="${i}" aria-pressed="${i===selected}">${format(r.date,{day:'numeric'})}<small>${format(r.date,{month:'short'})}</small></button>`).join('')}</div>`;
 const draw=()=>{
  const row=rows[selected];
  const secondary=key!=='km'&&row.km?`<br>${number(row.km)} km · ${rate(row[key]/row.km)} / km`:'';
  el.querySelector('.chart-readout').innerHTML=`<strong>${metric.format(row[key])}</strong><span>${metric.label} · ${long(row.date)}${secondary}</span>`;
  el.querySelectorAll('[data-point]').forEach(button=>button.setAttribute('aria-pressed',String(+button.dataset.point===selected)));
  el.querySelectorAll('.line-chart circle').forEach((point,i)=>point.setAttribute('r',i===selected?'8':'4'));
 };
 el.querySelectorAll('[data-point]').forEach(button=>button.onclick=()=>{
  selected=+button.dataset.point;
  onSelect?.(rows[selected].date);
  draw();
 });
 draw();
}
async function publicPage(){
 records=[];
 const currentScreen=++screen;
 document.title='Taksi Defteri · Kutay’ın taksi günlüğü';
 app.innerHTML=header('<button class="button outline" id="share">Paylaş '+arrow+'</button>')+'<main class="shell"><div class="empty">Yükleniyor…</div></main>'+footer(pages && location.hostname==='kutayatak.github.io');
 secret();
 mountVisitCount();
 $('#share').onclick=async()=>{const url=new URL('./',location.href).href;try{if(navigator.share)await navigator.share({title:'Taksi Defteri',text:'Kıbrıs’tan bir taksi günlüğü.',url});else{await navigator.clipboard.writeText(url);toast('Bağlantı kopyalandı.');}}catch(e){if(e.name!=='AbortError')toast('Bağlantıyı adres çubuğundan kopyalayabilirsin.');}};
 let rows;
 try{rows=publicRows(await load());}catch(e){if(screen!==currentScreen)return;$('main').innerHTML='<div class="empty">Vardiyalar yüklenemedi. <button class="button" id="retry">Tekrar dene</button></div>';$('#retry').onclick=publicPage;return;}
 if(screen!==currentScreen)return;
 if(!rows.length){$('main').innerHTML='<div class="empty">Henüz kayıt yok.</div>';return;}
 const latest=rows.at(-1),best=rows.reduce((a,b)=>a.wage>b.wage?a:b);
 const {month,week,weekly,monthly,recent}=publicPeriods(rows,cyprusToday());
 $('main').innerHTML=`<section class="hero"><div class="postcard"><div class="postcard-scene"><img src="./mercedes-kibris.jpg" alt="Kıbrıs sahil yolunda sol şeritte ilerleyen gümüş Mercedes taksi" fetchpriority="high"></div><div class="postcard-top"><span class="coast-label">AKDENİZ</span><span class="sun">🔆</span></div><button class="taxi-sticker" id="horn" aria-label="Taksiye dokun ve kutla">${taxi}<span>bip bip!</span></button></div><div class="ticket"><span class="eyebrow">SON GÜN · KAZANCIM</span><strong>${money(latest.wage)}</strong><div><span>${short(latest.date)} · ${format(latest.date,{weekday:'long'})}</span><b>${number(latest.km)} km ↗</b></div></div><a href="#gunluk" class="text-link">Kayıtları gör <span>↓</span></a></section>
 <div class="road-strip"><span>KIBRIS YOLLARI</span><div class="road-line" aria-hidden="true"><i>🥵</i></div><span>${number(sum(rows,'km'))} KM VE DEVAMI…</span></div>
 <section id="gunluk"><div class="public-stats">${stat('BU HAFTA',money(weekly.length?sum(weekly):null),`${weekly.length} gün · ${short(week)} – ${short(addDays(week,6))}`)}${stat('BU AY',money(monthly.length?sum(monthly):null),`${monthName(month)} · ${monthly.length} gün`)}${stat('TOPLAM',money(sum(rows)),`${rows.length} gün · ${short(rows[0].date)} tarihinden beri`,'dark-stat')}</div></section>
 <section class="public-grid section"><div class="panel chart-panel">${sectionTitle('KAZANÇ', 'Günlük kazancım',`<div class="segmented" aria-label="Grafik dönemi"><button data-public-range="7" aria-pressed="true">Son 7 gün</button><button data-public-range="month" aria-pressed="false">Bu ay</button></div>`)}<div id="public-chart"></div></div><aside class="record-card"><span class="eyebrow">EN YÜKSEK KAZANCIM</span><div class="record-sun" aria-hidden="true">💵</div><strong>${money(best.wage)}</strong><p>${long(best.date)}<br>${number(best.km)} kilometrelik bir gün.</p></aside></section>
 <section class="section">${sectionTitle('KAYITLAR','Son günler',`<span class="muted">Son kayıt · ${short(latest.date)}</span>`)}<div class="shift-list">${rows.slice(-7).reverse().map((r,i)=>`<article><span class="shift-index">${String(i+1).padStart(2,'0')}</span><div><h3>${format(r.date,{weekday:'long'})}</h3><span>${long(r.date)}</span></div><span class="shift-distance">${number(r.km)} <small>km</small></span><strong>${money(r.wage)}</strong>${arrow}</article>`).join('')}</div></section>`;
 const draw=range=>{plotControl(range==='month'?monthly:recent,'#public-chart');$$('[data-public-range]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.publicRange===range)));};
 $$('[data-public-range]').forEach(b=>b.onclick=()=>draw(b.dataset.publicRange));draw('7');$('#horn').onclick=()=>{celebrate();toast('🚕');};mountMotion();
}
function login(){
 screen++;
 document.title='Giriş · Taksi Defteri';
 app.innerHTML=header('<button class="button outline" id="home">Ana sayfa ↗</button>')+`<main class="shell login-layout"><section class="login-card"><span class="eyebrow">GİRİŞ</span><h1>Sürücü paneli</h1><form id="login"><label for="password">Panel şifren</label><div class="password-field"><input id="password" type="password" autocomplete="current-password" required maxlength="512" placeholder="••••"><button type="button" id="reveal" aria-label="Şifreyi göster">Göster</button></div><p id="login-error" class="error" role="alert"></p><button class="button primary" type="submit">Giriş yap ${arrow}</button></form><div class="login-checker checker"></div></section></main>`+footer();
 $('#home').onclick=publicPage;$('#password').focus();$('#reveal').onclick=()=>{const p=$('#password'),show=p.type==='password';p.type=show?'text':'password';$('#reveal').textContent=show?'Gizle':'Göster';$('#reveal').setAttribute('aria-label',show?'Şifreyi gizle':'Şifreyi göster');};
 $('#login').onsubmit=async event=>{
  event.preventDefault();
  const loginScreen=screen, button=event.submitter, password=$('#password').value;
  button.disabled=true;
  $('#login-error').textContent='';
  try {
   let reports;
   if (pages) {
    const {unlockReports}=await import('./vault.js?v=17');
    reports=await unlockReports(password);
   } else {
    const response=await fetch('/api/admin/login',{
     method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})
    });
    if (!response.ok) throw new Error((await response.json()).error);
    const data=await fetch('/api/admin/reports',{cache:'no-store'});
    if (!data.ok) throw new Error('Panel kayıtları yüklenemedi.');
    ({reports}=await data.json());
   }
   if (loginScreen!==screen) return;
   records=normalize(reports);
   dashboard();
   window.scrollTo(0,0);
  } catch (error) {
   if (loginScreen!==screen) return;
   $('#login-error').textContent=error.message||'Panel açılamadı.';
   button.disabled=false;
  }
 };
 mountMotion();
}
function dashboard(){
 screen++;
 if(!records.length){
  app.innerHTML=header('<button class="button outline" id="home">Ana sayfa ↗</button>')+'<main class="shell empty">Henüz vardiya kaydı yok.</main>'+footer();
  $('#home').onclick=publicPage;
  return;
 }
 document.title='Sürücü paneli · Taksi Defteri';
 const today=cyprusToday(),currentMonth=today.slice(0,7);
 const latest=records.at(-1),monthGroups=months(records),weekGroups=weeks(records);
 const selectableMonths=[...new Set([currentMonth,...monthGroups.map(m=>m.id).reverse()])];
 let selectedMonth=currentMonth,metric='wage',planned=null,selectedDay,selectedWeekday=5;
 const workedDays=new Set(records.map(row=>row.date));
 const peak=records.reduce((a,b)=>a.wage>b.wage?a:b);
 app.innerHTML=header(`<div class="nav-actions"><button class="button outline" id="home">Ana sayfa ↗</button><button class="lock-button" id="logout" aria-label="Paneli kilitle">Çıkış</button></div>`)+`
 <main class="shell cockpit"><header class="dashboard-head"><div><span class="eyebrow">KUTAY · SÜRÜCÜ PANELİ</span><h1>Kazanç <em>özeti</em></h1><p>Son gün: ${long(latest.date)} · ${records.length} kayıt</p></div><span class="dashboard-stamp">%40<br><small>SENİN PAYIN</small></span></header>
 <nav class="dashboard-nav" aria-label="Panel bölümleri"><a href="#aylik">Ayın özeti</a><a href="#haftalar">Haftalar</a><a href="#gunler">Günleri kıyasla</a><a href="#arsiv">Arşiv</a></nav>
 <div class="lifetime-strip"><div><span>Tüm aylar toplamı</span><strong>${money(sum(records))}</strong></div><div id="week-average"></div><div><span>Günlük ortalama</span><strong>${money(average(records))}</strong></div><div><span>En iyi gün · ${short(peak.date)}</span><strong>${money(peak.wage)}</strong></div></div>
 <section id="aylik" class="section">${sectionTitle('AYLIK ÖZET','Aylık kazanç',`<label class="select-label"><span class="sr-only">Ay seç</span><select id="month-select">${selectableMonths.map(month=>`<option value="${month}">${monthName(month)}</option>`).join('')}</select></label>`)}<div id="month-summary"></div>
 <div class="analysis-grid"><section class="panel monthly-chart"><div class="section-title"><div><span class="eyebrow">GÜNLÜK VERİLER</span><h3 id="metric-title">Vardiya payı</h3></div><div class="segmented" aria-label="Grafik ölçüsü"><button type="button" data-metric="wage" aria-pressed="true">Payım</button><button type="button" data-metric="km" aria-pressed="false">Km</button><button type="button" data-metric="fuel" aria-pressed="false">Yakıt</button></div></div><div id="month-chart"></div></section><section class="forecast-card" id="forecast"></section></div>
 <section class="panel month-compare" id="month-compare"></section></section>
 <section id="haftalar" class="section">${sectionTitle('HAFTALIK ÖZET','Haftalık kazanç')}<div id="weekly"></div></section>
 <section id="gunler" class="section">${sectionTitle('GÜNLERE GÖRE','Haftanın günleri')}<div class="panel"><p class="sub">Bir günü seç; tüm kayıtlardaki ortalamasını ve son gününü önceki aynı günlerle kıyasla.</p><div class="weekday-tabs" aria-label="Haftanın günü">${weekdays.map((d,i)=>`<button data-weekday="${i}" aria-label="${d}" aria-pressed="${i===5}"><span>${['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'][i]}</span></button>`).join('')}</div><div id="weekday-result"></div></div>
 <section class="panel compare-card"><div class="section-title"><div><span class="eyebrow">TARİH SEÇ</span><h3>Gün karşılaştırması</h3></div></div><div class="compare-selectors"><label>Birinci gün<select id="day-a">${dateOptions(records,latest.date)}</select></label><span>vs.</span><label>İkinci gün<select id="day-b">${dateOptions(records,records.at(-2)?.date)}</select></label></div><div id="day-comparison" aria-live="polite"></div></section></section>
 <section id="arsiv" class="section">${sectionTitle('ARŞİV','Tüm kayıtlar')}<div class="panel"><div class="table-scroll"><table><thead><tr><th>Ay</th><th>Payım</th><th>Gün</th><th>Ort. / gün</th><th>Yol</th></tr></thead><tbody>${monthGroups.slice().reverse().map(m=>`<tr><th>${monthName(m.id)}<small>${m.rows[0].date.slice(-2)}–${m.rows.at(-1).date.slice(-2)} arası kayıt</small></th><td class="bold">${money(m.total)}</td><td>${m.rows.length}</td><td>${money(m.avg)}</td><td>${number(m.km)} km</td></tr>`).join('')}</tbody><tfoot><tr><th>Hepsi</th><td>${money(sum(records))}</td><td>${records.length}</td><td>${money(average(records))}</td><td>${number(sum(records,'km'))} km</td></tr></tfoot></table></div></div>
 <div class="panel archive-filter">
  <div class="archive-fields">
   <label>Başlangıç <input id="archive-start" type="date" aria-describedby="archive-error"></label>
   <label>Bitiş <input id="archive-end" type="date" aria-describedby="archive-error"></label>
   <button id="archive-reset" class="button outline" type="button" disabled>Filtreyi temizle</button>
  </div>
  <p id="archive-error" class="error" role="alert"></p>
  <div id="archive-summary" class="summary-grid" aria-live="polite"></div>
 </div>
 <details class="panel ledger"><summary>Vardiyaları göster <span id="archive-count"></span></summary><div class="table-scroll"><table><thead><tr><th>Tarih</th><th>Payım</th><th>Km</th><th>Pay / km</th><th>Yakıt</th><th>Yakıt / km</th><th>Kasa</th></tr></thead><tbody id="archive-rows"></tbody></table></div></details>
 <div class="fuel-line lifetime-fuel"><span>Tüm kayıtların yakıtı <b>${money(sum(records,'fuel'))}</b></span><span>Ortalama yakıt / km <b>${rate(sum(records,'km')?sum(records,'fuel')/sum(records,'km'):null)}</b></span></div><p class="data-note">Payın, mesajdaki kalan kasanın %40’ı. Yakıt payından ikinci kez düşülmez. Kayıtsız tarihler izin günü kabul edilmez. Güncel dönemler Kıbrıs takvimine göre gösterilir.</p></section></main>`+footer();
 $('#home').onclick=publicPage;if($('#logout'))$('#logout').onclick=async()=>{if(!pages)await fetch('/api/admin/logout',{method:'POST'});records=[];login();};
 const archiveStart=$('#archive-start'),archiveEnd=$('#archive-end'),archiveReset=$('#archive-reset');
 function renderArchive(){
  const start=archiveStart.value,end=archiveEnd.value,invalid=Boolean(start&&end&&start>end);
  const rows=invalid?[]:rowsInRange(records,start,end);
  archiveReset.disabled=!start&&!end;
  archiveStart.setAttribute('aria-invalid',String(invalid));
  archiveEnd.setAttribute('aria-invalid',String(invalid));
  $('#archive-error').textContent=invalid?'Başlangıç tarihi bitiş tarihinden sonra olamaz.':'';
  $('#archive-summary').hidden=invalid;
  $('#archive-summary').innerHTML=invalid?'':[
   stat('TOPLAM PAY',money(rows.length?sum(rows):null)),
   stat('VARDİYA SAYISI',number(rows.length)),
   stat('TOPLAM YOL',rows.length?number(sum(rows,'km'))+' km':'—'),
   stat('TOPLAM YAKIT',money(rows.length?sum(rows,'fuel'):null))
  ].join('');
  $('#archive-count').textContent=invalid?'Geçersiz aralık':rows.length+' kayıt';
  $('#archive-rows').innerHTML=rows.length?rows.slice().reverse().map(r=>
   `<tr><th>${short(r.date)}<small>${format(r.date,{weekday:'long'})}</small></th><td class="bold">${money(r.wage)}</td><td>${number(r.km)}</td><td>${rate(r.km?r.wage/r.km:null)}</td><td>${money(r.fuel)}</td><td>${rate(r.km?r.fuel/r.km:null)}</td><td>${money(r.cash)}</td></tr>`
  ).join(''):`<tr><td colspan="7">${invalid?'Tarih aralığını düzelt.':'Bu aralıkta vardiya yok.'}</td></tr>`;
 }
 archiveStart.onchange=archiveEnd.onchange=renderArchive;
 archiveReset.onclick=()=>{archiveStart.value=archiveEnd.value='';renderArchive();archiveStart.focus();};
 renderArchive();
 function renderDailyChart(){
  const titles={wage:'Vardiya payı',km:'Vardiya kilometresi',fuel:'Vardiya yakıtı'};
  $('#metric-title').textContent=titles[metric];
  const rows=rowsInRange(records,selectedMonth+'-01',selectedMonth===currentMonth?today:null)
   .filter(row=>row.date.startsWith(selectedMonth+'-'));
  plotControl(rows,'#month-chart',metric,selectedDay,date=>{selectedDay=date;});
 }
 function renderForecast(){
  const active=selectedMonth===currentMonth;
  const s=monthStats(records,selectedMonth,planned,today);
  const recorded=s.rows.length;
  const title=active?'Ay sonu kazancı':'Ay sonu senaryosu';
  const summary=recorded?`${recorded} vardiyanın ortalaması: ${money(s.avg)}`:'Tahmin için vardiya kaydı gerekiyor.';
  const controls=recorded?`<p id="forecast-plan"></p><label class="range-label" for="planned">Ayın toplam vardiyası <b id="planned-label"></b></label><input id="planned" type="range" min="${recorded}" max="${s.maxShifts}" value="${s.count}" ${s.maxShifts===recorded?'disabled':''}><p id="forecast-equation"></p>`:'';
  $('#forecast').innerHTML=`<h3>${title}</h3><strong id="forecast-value">${money(s.projection)}</strong><p class="forecast-label">${summary}</p>${controls}`;
  if (!recorded) return;
  function update(f){
   $('#forecast-value').textContent=money(f.projection);
   $('#planned-label').textContent=f.count+' vardiya';
   $('#forecast-plan').textContent=`${recorded} kayıtlı + ${f.count-recorded} ek vardiya`;
   $('#forecast-equation').textContent=`${money(f.total)} gerçekleşen + ${f.count-recorded} × ${money(f.avg)}`;
  }
  update(s);
  $('#planned').oninput=e=>{
   planned=+e.target.value;
   update(monthStats(records,selectedMonth,planned,today));
  };
 }
 function renderMonth(){
  const s=monthStats(records,selectedMonth,planned,today),active=selectedMonth===currentMonth;
  const {previous,priorEnd,current,prior}=monthComparison(records,selectedMonth,today);
  const currentPeriod=active?`1–${Number(today.slice(-2))} ${monthName(selectedMonth)}`:monthName(selectedMonth);
  const priorPeriod=active?`1–${Number(priorEnd.slice(-2))} ${monthName(previous)}`:monthName(previous);
  const currentDetail=`${currentPeriod} · ${current.length} vardiya`,previousDetail=`${priorPeriod} · ${prior.length} vardiya`;
  const trend=change(average(current),average(prior));
  $('#month-summary').innerHTML=`<div class="summary-grid">${stat('SEÇİLİ AYDAKİ PAYIM',money(current.length?sum(current):null),currentDetail,'yellow-stat')}${stat('ÖNCEKİ AYDAKİ PAYIM',money(prior.length?sum(prior):null),previousDetail)}${stat('ORTALAMA / VARDİYA',money(s.avg),delta(trend,'önceki döneme göre'))}${stat('KİLOMETRE BAŞINA PAY',rate(s.km?s.total/s.km:null),`${number(s.km)} km toplam yol`)}</div><div class="fuel-line"><span>↳ Yakıt: <b>${money(s.rows.length?s.fuel:null)}</b></span><span>Km başına <b>${rate(s.km?s.fuel/s.km:null)}</b></span><span>Kasa / km <b>${rate(s.km?sum(s.rows,'cash')/s.km:null)}</b></span></div>`;
  renderDailyChart();
  renderForecast();
  const maxTotal=Math.max(sum(current),sum(prior),1);
  const bars=[[current,currentDetail],[prior,previousDetail]].map(([rows,label])=>
   `<div><span>${label}</span><div style="--width:${sum(rows)/maxTotal*100}%"><b>${rows.length?money(sum(rows)):'Kayıt yok'}</b></div></div>`
  ).join('');
  const coverage=rows=>rows.length?`${short(rows[0].date)}–${short(rows.at(-1).date)} arasında kayıt var`:'Bu dönemde kayıt yok';
  $('#month-compare').innerHTML=`<h3>Aylık karşılaştırma</h3><div class="month-bars">${bars}</div><p class="sub">${coverage(current)} · ${coverage(prior)}</p>`;
  watchMotion($('#month-summary'));
 }
 $('#month-select').onchange=e=>{
  selectedMonth=e.target.value;
  planned=null;
  selectedDay=undefined;
  renderMonth();
 };
 const metricButtons=$$('[data-metric]');
 metricButtons.forEach(button=>button.onclick=()=>{
  metric=button.dataset.metric;
  metricButtons.forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  renderDailyChart();
 });
 renderMonth();
 function renderWeekly(){
  const progress=latestWeekProgress(records,today),start=weekStart(progress.anchor);
  const weekPeriod=`${short(start)} – ${short(addDays(start,6))}`;
  const leaveByWeek=Object.groupBy(LEAVE_DAYS.filter(date=>!workedDays.has(date)&&date<=today),weekStart);
  const complete=weekGroups.filter(w=>w.rows.length+(leaveByWeek[w.id]?.length??0)===7);
  const sample=complete.length?complete:weekGroups;
  $('#week-average').innerHTML=`<span>${complete.length?'Tam hafta ortalaması':'Kayıtlı hafta ortalaması'}</span><strong>${money(average(sample,'total'))}</strong><small>${sample.length} hafta üzerinden</small>`;
  const maxWeek=Math.max(1,...weekGroups.map(w=>w.total));
  const title=progress.latest?'SON KAYITLI HAFTA':'BU HAFTA PAYIM';
  const cmpDetail=progress.latest?'Önceki takvim haftasına göre':'Aynı gün aralığı';
  const bars=weekGroups.map(w=>{
   const rest=leaveByWeek[w.id]?.length??0;
   const previous=weekGroups.find(p=>p.id===addDays(w.id,-7));
   return `<div class="week-column"><strong>${money(w.total)}</strong><div class="week-track"><div style="height:${w.total/maxWeek*100}%"></div></div><b>${short(w.id)}</b><span>${w.rows.length} vardiya${rest?` · ${rest} izin`:''}</span><small>${money(w.avg)} / vardiya</small><small>${delta(change(w.avg,previous?.avg))}</small></div>`;
  }).join('');
  $('#weekly').innerHTML=`${progress.latest?'<p class="sub week-empty">Bu hafta henüz vardiya kaydı yok.</p>':''}<div class="summary-grid week-summary">${stat(title,money(progress.current.length?sum(progress.current):null),weekPeriod,'yellow-stat')}${stat('VARDİYA SAYISI',number(progress.current.length))}${stat('ORTALAMA / VARDİYA',money(average(progress.current)))}${stat('ÖNCEKİ HAFTAYA GÖRE',delta(progress.change),`${cmpDetail} · ${progress.current.length} / ${progress.previous.length} vardiya`)}</div><div class="panel"><div class="week-chart">${bars}</div><p class="sub">Pazartesi–Pazar. Yüzdeler vardiya başına ortalama payı karşılaştırır.</p></div>`;
  watchMotion($('#weekly'));
 }
 renderWeekly();
 const wd=weekdayStats(records);
 function renderWeekday(){const w=wd[selectedWeekday],last=w.rows.at(-1),prior=w.rows.slice(0,-1),avg=average(prior),max=Math.max(...w.rows.map(r=>r.wage),1);$('#weekday-result').innerHTML=`<div class="weekday-summary"><div><span>${weekdays[selectedWeekday]} ortalaması</span><strong>${money(w.avg)}</strong><small>${w.rows.length} kayıt üzerinden</small></div><div><span>Son ${weekdays[selectedWeekday].toLocaleLowerCase('tr')}</span><strong>${last?money(last.wage):'—'}</strong><small>${last?short(last.date):'Kayıt yok'}</small></div><div><span>Önceki aynı günlere göre</span><strong>${delta(last?change(last.wage,avg):null)}</strong><small>${prior.length} önceki günün ortalaması${prior.length===1?' · tek örnek':''}</small></div></div><div class="weekday-bars">${w.rows.map(r=>`<div><span>${short(r.date)}</span><i style="--width:${r.wage/max*100}%"></i><b>${money(r.wage)}</b></div>`).join('')}</div>`;}
 $$('[data-weekday]').forEach(b=>b.onclick=()=>{selectedWeekday=+b.dataset.weekday;$$('[data-weekday]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderWeekday();});renderWeekday();
 function compareDays(){const a=records.find(r=>r.date===$('#day-a').value),b=records.find(r=>r.date===$('#day-b').value);const metrics=[['Payım',a.wage,b.wage,money],['Yol',a.km,b.km,v=>number(v)+' km'],['Pay / km',a.km?a.wage/a.km:null,b.km?b.wage/b.km:null,rate],['Yakıt',a.fuel,b.fuel,money],['Yakıt / km',a.km?a.fuel/a.km:null,b.km?b.fuel/b.km:null,rate],['Kasa',a.cash,b.cash,money]];$('#day-comparison').innerHTML=`<div class="comparison-table">${metrics.map(([label,x,y,fn])=>`<div><span>${label}</span><b>${fn(x)}</b><b>${fn(y)}</b></div>`).join('')}</div><p class="comparison-result">${a.date===b.date?'Aynı günü seçtin. Başka bir gün seçerek kıyaslayabilirsin.':a.wage===b.wage?'İki günün kazancı aynı.':`${short(a.date)} günü ${money(Math.abs(a.wage-b.wage))} ${a.wage>b.wage?'daha fazla':'daha az'} kazandın. ${a.km&&b.km?`Km başına payın ${delta(change(a.wage/a.km,b.wage/b.km))}.`:''}`}</p>`;}
 $('#day-a').onchange=compareDays;$('#day-b').onchange=compareDays;compareDays();mountMotion();
}
function dateOptions(rows,selected){return rows.slice().reverse().map(r=>`<option value="${r.date}" ${r.date===selected?'selected':''}>${short(r.date)} · ${format(r.date,{weekday:'long'})}</option>`).join('');}
if(!pages && location.pathname==='/sofor')login();else publicPage();
