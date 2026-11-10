import {parseReport,validateReport} from './report.mjs';

const storageKey='ada-mesaisi-vault-v1';
const panelPin='1234';
const encoder=new TextEncoder();
const encode=bytes=>btoa(Array.from(bytes,byte=>String.fromCharCode(byte)).join(''));
const decode=text=>Uint8Array.from(atob(text),char=>char.charCodeAt(0));
const error=(status,message)=>Object.assign(new Error(message),{status});

export const hasVault=()=>localStorage.getItem(storageKey)!==null;
let session;

async function deriveKey(password,salt) {
  const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2',salt,iterations:600_000,hash:'SHA-256'},material,
    {name:'AES-GCM',length:256},false,['encrypt','decrypt']
  );
}

async function seal(key,salt,reports) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const payload=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(JSON.stringify(reports)));
  return JSON.stringify({salt:encode(salt),iv:encode(iv),payload:encode(new Uint8Array(payload))});
}

async function persist(current,reports) {
  const sealed=await seal(current.key,current.salt,reports);
  if (session!==current) throw error(401,'Panel kilitlendi.');
  if (localStorage.getItem(storageKey)!==current.sealed) {
    session=null;
    throw error(401,'Kayıtlar başka bir sekmede değişti. Yeniden giriş yap.');
  }
  localStorage.setItem(storageKey,sealed);
  session={...current,reports,sealed};
}

export async function vaultApi(path,body) {
  if (path==='admin/login') {
    if (!globalThis.crypto?.subtle) throw error(400,'Paneli HTTPS üzerinden aç.');
    const stored=localStorage.getItem(storageKey);
    if (!stored) {
      if (body.password!==panelPin) throw error(401,'Şifre doğru değil.');
      const salt=crypto.getRandomValues(new Uint8Array(16));
      const key=await deriveKey(body.password,salt);
      const sealed=await seal(key,salt,[]);
      if (hasVault()) throw error(409,'Panel başka bir sekmede kuruldu. Sayfayı yenile.');
      localStorage.setItem(storageKey,sealed);
      session={key,salt,reports:[],sealed};
      return;
    }
    let opened;
    try {
      const {salt,iv,payload}=JSON.parse(stored);
      const saltBytes=decode(salt);
      const key=await deriveKey(body.password,saltBytes);
      const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv)},key,decode(payload));
      opened={key,salt:saltBytes,reports:JSON.parse(new TextDecoder().decode(clear)),sealed:stored};
    } catch {
      throw error(401,'Şifre doğru değil veya bu tarayıcıdaki kayıt okunamadı.');
    }
    if (body.password!==panelPin) {
      const salt=crypto.getRandomValues(new Uint8Array(16));
      const key=await deriveKey(panelPin,salt);
      const sealed=await seal(key,salt,opened.reports);
      if (localStorage.getItem(storageKey)!==stored) {
        throw error(409,'Kayıtlar başka bir sekmede değişti. Yeniden giriş yap.');
      }
      localStorage.setItem(storageKey,sealed);
      opened={key,salt,reports:opened.reports,sealed};
    }
    session=opened;
    return;
  }

  if (!session) throw error(401,'Önce panel şifreni gir.');
  if (path==='admin/logout') {session=null;return;}
  if (path==='admin/parse') return parseReport(body.message);
  if (path==='admin/reports' && !body) return {reports:session.reports,examples:[],pages:false};
  if (path==='admin/import') {
    if (body?.format!=='ada-private-v1' || !Array.isArray(body.reports) || body.reports.length>10000) {
      throw error(400,'Bu dosya Ada Mesaisi kasa arşivi değil.');
    }
    const current=session;
    const all=new Map(current.reports.map(r=>[r.date,r]));
    let added=0,skipped=0;
    for (const row of body.reports) {
      const report=validateReport(row);
      if (all.has(report.date)) {skipped++;continue;}
      all.set(report.date,{...report,archive:true});
      added++;
    }
    const reports=[...all.values()].sort((a,b)=>b.date.localeCompare(a.date));
    if(added) await persist(current,reports);
    return {reports,added,skipped};
  }
  if (path==='admin/reports') {
    const report=validateReport(body);
    const current=session;
    if (current.reports.some(row=>row.date===report.date) && body.replace!==true) {
      throw error(409,'Bu tarihte zaten bir kayıt var.');
    }
    const reports=[...current.reports.filter(row=>row.date!==report.date),report]
      .sort((a,b)=>b.date.localeCompare(a.date));
    await persist(current,reports);
    return {report};
  }
  throw error(404,'İşlem bulunamadı.');
}
