const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const fine=matchMedia('(hover: hover) and (pointer: fine)');
const targets='.hero-copy,.postcard,.ticket,.public-stats,.panel,.record-card,.shift-list article,.lifetime-strip,.summary-grid,.forecast-card,.dashboard-head,.login-card';
const counters='.stat strong,.ticket>strong,.lifetime-strip strong,.record-card>strong';
let controller,observer,seen=new WeakSet();
const counted=new WeakSet(),frames=new Set(),finishers=new Set();
const schedule=fn=>{const id=requestAnimationFrame(t=>{frames.delete(id);fn(t);});frames.add(id);return id;};
function count(el){
 if(counted.has(el)||reduced.matches||el.children.length)return;
 const label=el.textContent.trim();if(!/^[\d.,]+ ₺$/.test(label))return;
 counted.add(el);
 const value=Number(label.replace(' ₺','').replaceAll('.','').replace(',','.'));if(!Number.isFinite(value))return;
 const spoken=document.createElement('span'),visual=document.createElement('span');
 spoken.className='sr-only';spoken.textContent=label;visual.setAttribute('aria-hidden','true');
 visual.textContent=label;el.replaceChildren(spoken,visual);el.classList.add('counting');
 const precision=label.includes(',')?label.split(',')[1].split(' ')[0].length:0;
 const factor=10**precision,formatter=new Intl.NumberFormat('tr-TR',{maximumFractionDigits:precision});let start;
 const finish=()=>{el.textContent=label;el.classList.remove('counting');finishers.delete(finish);};finishers.add(finish);
 const tick=time=>{
  if(!el.isConnected||reduced.matches||document.hidden){finish();return;}
  start??=time;const progress=Math.min(1,(time-start)/780),ease=1-Math.pow(1-progress,4);
  visual.textContent=formatter.format(Math.round(value*(.72+.28*ease)*factor)/factor)+' ₺';
  if(progress<1)schedule(tick);else finish();
 };schedule(tick);
}
export function watchMotion(root){
 if(!root||!observer||reduced.matches)return;
 const elements=[...(root.matches?.(targets)?[root]:[]),...root.querySelectorAll(targets)];
 elements.forEach((el,i)=>{if(seen.has(el))return;seen.add(el);el.classList.add('motion-reveal');el.style.setProperty('--reveal-delay',Math.min(i%4*45,135)+'ms');observer.observe(el);});
}
function stop(){
 controller?.abort();observer?.disconnect();observer=null;
 frames.forEach(cancelAnimationFrame);frames.clear();[...finishers].forEach(f=>f());
 document.querySelectorAll('.motion-reveal').forEach(el=>el.classList.remove('motion-reveal','in-view','revealed'));
 document.querySelectorAll('.tap-wave').forEach(el=>el.remove());
 document.documentElement.classList.remove('motion-paused');
}
export function mountMotion(){
 stop();seen=new WeakSet();const root=document.querySelector('#app');
 if(!root||reduced.matches||!('IntersectionObserver' in window))return;
 controller=new AbortController();const {signal}=controller;
 observer=new IntersectionObserver(entries=>{for(const entry of entries){
  const el=entry.target;if(!el.isConnected){observer?.unobserve(el);continue;}
  el.classList.toggle('in-view',entry.isIntersecting);
  if(entry.isIntersecting){el.classList.add('revealed');if(el.matches(counters))count(el);el.querySelectorAll(counters).forEach(count);}
 }},{threshold:.08,rootMargin:'0px 0px -12px 0px'});
 watchMotion(root);
 let scrollQueued=false;
 const progress=()=>{scrollQueued=false;const max=document.documentElement.scrollHeight-innerHeight;document.documentElement.style.setProperty('--page-progress',max>0?Math.min(1,Math.max(0,scrollY/max)):0);};
 const queue=()=>{if(!scrollQueued){scrollQueued=true;schedule(progress);}};
 addEventListener('scroll',queue,{passive:true,signal});addEventListener('resize',queue,{passive:true,signal});progress();
 document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('motion-paused',document.hidden);if(document.hidden)[...finishers].forEach(f=>f());},{signal});
 root.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;const button=event.target.closest('.button,.segmented button,.weekday-tabs button,.date-pills button,.taxi-sticker');
  if(!button||button.disabled)return;const rect=button.getBoundingClientRect(),wave=document.createElement('span');
  wave.className='tap-wave';wave.setAttribute('aria-hidden','true');wave.style.left=(event.clientX-rect.left)+'px';wave.style.top=(event.clientY-rect.top)+'px';button.append(wave);
  wave.addEventListener('animationend',()=>wave.remove(),{once:true});
 },{passive:true,signal});
 const postcard=root.querySelector('.postcard');
 if(postcard&&fine.matches){
  let rect,queued=false,x=0,y=0;
  postcard.addEventListener('pointerenter',()=>{rect=postcard.getBoundingClientRect();},{signal});
  postcard.addEventListener('pointermove',event=>{
   if(!rect)return;x=(event.clientX-rect.left)/rect.width-.5;y=(event.clientY-rect.top)/rect.height-.5;
   if(!queued){queued=true;schedule(()=>{queued=false;postcard.style.setProperty('--tilt-x',(-y*5).toFixed(2)+'deg');postcard.style.setProperty('--tilt-y',(x*5).toFixed(2)+'deg');});}
  },{passive:true,signal});
  postcard.addEventListener('pointerleave',()=>{x=0;y=0;postcard.style.setProperty('--tilt-x','0deg');postcard.style.setProperty('--tilt-y','0deg');},{signal});
 }
}
reduced.addEventListener('change',()=>{if(reduced.matches)stop();else mountMotion();});
