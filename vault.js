import {openReports,wrapAccess,unwrapAccess} from './panel-crypto.mjs';
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
  if(!globalThis.crypto?.subtle)throw new Error('Paneli HTTPS üzerinden aç.');
  const response=await fetch('./panel.enc.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Panel verileri yüklenemedi. Biraz sonra tekrar dene.');
  const envelope=await response.json();
  let secret=null,credential=body?.password;
  if(envelope.access==='device'){
   secret=pendingAccess;
   if(!secret){let saved;try{saved=localStorage.getItem(accessStorage);}catch{}
    if(!saved)throw new Error('Bu telefonda ilk giriş için özel bağlantını aç.');
    secret=await unwrapAccess(JSON.parse(saved),body?.password);
   }
   credential=secret+'\n'+body?.password;
  }
  const reports=await openReports(envelope,credential);
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
