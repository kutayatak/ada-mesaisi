// Amounts are integer kuruş; averages can contain fractional kuruş until display.
export const dayDate=s=>new Date(s+'T12:00:00Z');
export const iso=d=>d.toISOString().slice(0,10);
export function addDays(s,n){const d=dayDate(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);}
export function weekStart(s){return addDays(s,-(dayDate(s).getUTCDay()+6)%7);}
export const sum=(rs,k='wage')=>rs.reduce((a,r)=>a+(r[k]??0),0);
export const average=(rs,k='wage')=>rs.length?sum(rs,k)/rs.length:null;
export const change=(a,b)=>b>0?(a/b-1)*100:null;
export const normalize=rows=>rows.map(r=>({...r,wage:r.cash!=null?Math.round(r.cash*.4):r.earnings-50000})).sort((a,b)=>a.date.localeCompare(b.date));
export function group(rows,key){return Object.entries(Object.groupBy(rows,key)).map(([id,rs])=>({id,rows:rs,total:sum(rs),avg:average(rs),km:sum(rs,'km')})).sort((a,b)=>a.id.localeCompare(b.id));}
export const months=rs=>group(rs,r=>r.date.slice(0,7));
export const weeks=rs=>group(rs,r=>weekStart(r.date));
export function monthStats(rows,month,planned=26){
  const selected=rows.filter(r=>r.date.startsWith(month));
  const last=selected.at(-1)?.date;
  const d=dayDate(month+'-01');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);
  const days=d.getUTCDate(), first=selected.filter(r=>+r.date.slice(-2)<=7);
  const count=Math.max(selected.length,Math.min(days,Math.round(planned)));
  const avg=average(selected);
  return {rows:selected,total:sum(selected),avg,km:sum(selected,'km'),fuel:selected.every(r=>r.fuel!=null)?sum(selected,'fuel'):null,days,last,first,count,projection:avg===null?null:sum(selected)+avg*(count-selected.length),firstProjection:first.length>=3?average(first)*count:null};
}
export function weekdayStats(rows){return Array.from({length:7},(_,i)=>{const rs=rows.filter(r=>(dayDate(r.date).getUTCDay()+6)%7===i);return {day:i,rows:rs,avg:average(rs),total:sum(rs)};});}
export function sameWeekProgress(rows,anchor){const start=weekStart(anchor),elapsed=(dayDate(anchor).getUTCDay()+6)%7;const current=rows.filter(r=>r.date>=start&&r.date<=anchor);const prevStart=addDays(start,-7);const previous=rows.filter(r=>r.date>=prevStart&&r.date<=addDays(prevStart,elapsed));return {current,previous,change:change(average(current),average(previous))};}
