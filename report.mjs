export function validDate(date) {
  if (typeof date !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(date)) return false;
  const day = new Date(date);
  return Number.isFinite(+day) && day.toISOString().slice(0,10) === date;
}
export function cyprusToday(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone:'Asia/Famagusta', year:'numeric', month:'2-digit', day:'2-digit'
  }).formatToParts(now).map(p => [p.type,p.value]));
  return [parts.year,parts.month,parts.day].join('-');
}
export function parseReport(raw) {
  const fields = Object.fromEntries(['date','km','fuel','cash'].map(k=>[k,[]]));
  const add = (key,value) => fields[key].push(value);
  const number = '([0-9][0-9., \\u00a0\\u202f]*)(?:\\s*(?:₺|tl|try))?';
  const value = s => {
    s=s.replace(/[\s\u202f]/g,'');
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s=s.replace(/\./g,'');
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(s)) return null;
    return s.replace(',','.');
  };
  for (let line of raw.normalize('NFKC').split(/\r?\n/)) {
    line=line.trim().toLocaleLowerCase('tr').replace(/^[*•–—-]+\s*|[*]+$/g,'').replace(/\*/g,'');
    let m;
    if ((m=line.match(/^(?:tarih\s*[:=-]?\s*)?(20\d{2}-\d{2}-\d{2})$/))) add('date',m[1]);
    else if ((m=line.match(/^(?:tarih\s*[:=-]?\s*)?(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2}|20\d{2})$/))) {
      add('date',`${m[3].length===2?'20'+m[3]:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
    } else if ((m=line.match(new RegExp('^'+number+'\\s*km$'))) ||
               (m=line.match(new RegExp('^(?:km|kilometre)\\s*[:=-]?\\s*'+number+'\\s*(?:km)?$')))) add('km',value(m[1]));
    else if ((m=line.match(new RegExp('^yakıt(?:\\s+(?:masrafı|gideri))?\\s*[:=]?\\s*₺?\\s*'+number+'$')))) add('fuel',value(m[1]));
    else if ((m=line.match(new RegExp('^(?:kalan(?:\\s+kasa)?|(?:net\\s+)?kasa)\\s*[:=]?\\s*₺?\\s*'+number+'$')))) add('cash',value(m[1]));
  }
  const result={}, issues=[];
  const labels={date:'Tarih',km:'Kilometre',fuel:'Yakıt',cash:'Kalan kasa'};
  for (const [key, matches] of Object.entries(fields)) {
    const single = [...new Set(matches)];
    if (single.length===1 && single[0]!==null && (key!=='date'||validDate(single[0]))) result[key]=single[0];
    else issues.push(`${labels[key]} ${single.length>1?'için birden fazla değer var':'okunamadı'}. Elle kontrol et.`);
  }
  return {fields:result, issues};
}
export function validateReport(report) {
  if (!report || !validDate(report.date) || report.date > cyprusToday()) throw new Error('Geçerli bir vardiya tarihi gir.');
  function numeric(key, max, label) {
    const v=report[key];
    if ((typeof v!=='number' && typeof v!=='string') || !/^\d+(\.\d{1,2})?$/.test(String(v)) || Number(v)>max)
      throw new Error(`${label} alanına geçerli bir değer gir.`);
    return Number(v);
  }
  return {date:report.date,km:numeric('km',10000,'Kilometre'),
    fuel:Math.round(numeric('fuel',1000000,'Yakıt')*100), cash:Math.round(numeric('cash',1000000,'Kalan kasa')*100)};
}
