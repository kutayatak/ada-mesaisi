import {openReports} from './panel-crypto.mjs?v=17';

export async function unlockReports(password) {
 if (!globalThis.crypto?.subtle) throw new Error('Paneli HTTPS üzerinden aç.');
 const response = await fetch('./panel.enc.json', {cache:'no-store'});
 if (!response.ok) throw new Error('Panel verileri yüklenemedi. Biraz sonra tekrar dene.');
 const envelope = await response.json();
 return openReports(envelope.passwordLogin ?? envelope, password);
}
