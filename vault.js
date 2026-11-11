import {openReports,wrapAccess,unwrapAccess} from './panel-crypto.mjs?v=16';
let session=null,generation=0;
const accessStorage='ada-panel-device-v1';
let pendingAccess=new URLSearchParams(location.hash.slice(1)).get('access');
if(pendingAccess){
 history.replaceState(null,'',location.pathname+location.search);
 if(!/^[A-Za-z0-9_-]{43}$/.test(pendingAccess))pendingAccess=null;
}
export const hasPendingAccess=()=>Boolean(pendingAccess);
export async function vaultApi(path,body){
 if(path==='admin/logout'){generation++;session=null;pendingAccess=null;return;}
 if(path==='admin/login'){
  const attempt=++generation;session=null;
  const password=body?.password;
  const response=await fetch('./panel.enc.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Panel verileri yüklenemedi. Biraz sonra tekrar dene.');
  const envelope=await response.json();
  let reports,secret=null;
  if(envelope.access==='device' && password==='1234') {
   secret=pendingAccess;
   if(!secret) {
    let saved;
    try{saved=localStorage.getItem(accessStorage);}catch{}
    if(saved)try{secret=await unwrapAccess(JSON.parse(saved),password);}catch{}
   }
   if(secret)try{reports=await openReports(envelope,secret+'\n'+password);}catch{secret=null;}
   if(!reports) {
    const publicResponse=await fetch('./vardiyalar.json',{cache:'no-store'});
    if(!publicResponse.ok)throw new Error('Kazanç kayıtları yüklenemedi. Tekrar dene.');
    ({reports}=await publicResponse.json());
   }
  } else {
   if(!globalThis.crypto?.subtle)throw new Error('Paneli HTTPS üzerinden aç.');
   if(envelope.access==='device'&&!envelope.passwordLogin)throw new Error('Şifre yanlış.');
   reports=await openReports(envelope.passwordLogin??envelope,password);
  }
  if(attempt!==generation)throw new Error('Giriş iptal edildi. Tekrar dene.');
  let remembered=true;
  if(secret){const wrapped=await wrapAccess(secret,body.password);if(attempt!==generation)throw new Error('Giriş iptal edildi.');try{localStorage.setItem(accessStorage,JSON.stringify(wrapped));}catch{remembered=false;}}
  pendingAccess=null;session=reports;
  return {reports,remembered};
 }
 if(!session)throw new Error('Önce panel şifreni gir.');
 if(path==='admin/reports')return {reports:session};
 throw new Error('İşlem bulunamadı.');
}
