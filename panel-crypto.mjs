const encoder=new TextEncoder();
const encode=bytes=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const iterations=600000;
async function keyFor(password,salt,usage){
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,usage);
}
export function cleanReports(rows){
 if(!Array.isArray(rows)||rows.length>10000)throw new Error('Panel kayıtları geçerli değil.');
 const dates=new Set();
 return rows.map(r=>{
  if(!/^20\d\d-\d\d-\d\d$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date||dates.has(r.date))throw new Error('Panel kayıt tarihi geçerli değil.');
  dates.add(r.date);
  if(!Number.isFinite(r.km)||r.km<0||r.km>10000||!Number.isSafeInteger(r.cash)||r.cash<0||!Number.isSafeInteger(r.fuel)||r.fuel<0)throw new Error('Panel tutarları geçerli değil.');
  return {date:r.date,km:r.km,fuel:r.fuel,cash:r.cash};
 }).sort((a,b)=>b.date.localeCompare(a.date));
}
export async function sealReports(rows,password){
 if(typeof password!=='string'||!password.length)throw new Error('Panel şifresi gerekli.');
 const reports=cleanReports(rows),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await keyFor(password,salt,['encrypt']);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('ada-panel-v1')},key,encoder.encode(JSON.stringify({reports})));
 return {format:'ada-panel-v1',salt:encode(salt),iv:encode(iv),payload:encode(new Uint8Array(ciphertext))};
}
export async function openReports(envelope,password){
 if(envelope?.format!=='ada-panel-v1'||typeof envelope.salt!=='string'||typeof envelope.iv!=='string'||typeof envelope.payload!=='string'||envelope.payload.length>4000000)throw new Error('Panel dosyası geçerli değil.');
 const salt=decode(envelope.salt),iv=decode(envelope.iv);if(salt.length!==16||iv.length!==12)throw new Error('Panel dosyası geçerli değil.');
 const key=await keyFor(password,salt,['decrypt']);
 let clear;
 try{clear=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode('ada-panel-v1')},key,decode(envelope.payload));}
 catch{throw new Error('Şifre doğru değil veya panel dosyası okunamıyor.');}
 return cleanReports(JSON.parse(new TextDecoder().decode(clear)).reports);
}
export async function wrapAccess(secret,pin){
 if(!/^[A-Za-z0-9_-]{43}$/.test(secret))throw new Error('Özel bağlantı geçerli değil.');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await keyFor(pin,salt,['encrypt']);
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode('ada-device-v1')},key,encoder.encode(secret));
 return {format:'ada-device-v1',salt:encode(salt),iv:encode(iv),payload:encode(new Uint8Array(ciphertext))};
}
export async function unwrapAccess(envelope,pin){
 try{
  if(envelope?.format!=='ada-device-v1')throw new Error();
  const key=await keyFor(pin,decode(envelope.salt),['decrypt']);
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(envelope.iv),additionalData:encoder.encode('ada-device-v1')},key,decode(envelope.payload));
  const secret=new TextDecoder().decode(clear);if(!/^[A-Za-z0-9_-]{43}$/.test(secret))throw new Error();return secret;
 }catch{throw new Error('Şifre doğru değil veya bu telefondaki giriş kaydı okunamıyor.');}
}
