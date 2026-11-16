// Amounts are integer kuruş; averages can contain fractional kuruş until display.
export const PUBLIC_ALLOWANCE = 60_000;
export const dayDate=s=>new Date(s+'T12:00:00Z');
export const iso=d=>d.toISOString().slice(0,10);
export function addDays(s,n){const d=dayDate(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);}
export function weekStart(s){return addDays(s,-(dayDate(s).getUTCDay()+6)%7);}
export const sum=(rs,k='wage')=>rs.reduce((a,r)=>a+(r[k]??0),0);
export const average=(rs,k='wage')=>rs.length?sum(rs,k)/rs.length:null;
export const change=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b>0?(a/b-1)*100:null;
export const driverPay=cash=>Math.round(cash*0.4);
const byDate=(a,b)=>a.date.localeCompare(b.date);
export const normalize=rows=>rows.map(r=>({...r,wage:driverPay(r.cash)})).sort(byDate);
export const publicRows=rows=>rows.map(r=>({...r,wage:r.earnings})).sort(byDate);
export function group(rows,key){return Object.entries(Object.groupBy(rows,key)).map(([id,rs])=>({id,rows:rs,total:sum(rs),avg:average(rs),km:sum(rs,'km')})).sort((a,b)=>a.id.localeCompare(b.id));}
export const months=rs=>group(rs,r=>r.date.slice(0,7));
export const weeks=rs=>group(rs,r=>weekStart(r.date));
export const rowsInRange=(rows,start,end)=>rows.filter(r=>(!start||r.date>=start)&&(!end||r.date<=end));

export function monthComparison(rows,month,today){
  const start=month+'-01', previousEnd=addDays(start,-1);
  const previous=previousEnd.slice(0,7);
  const active=today.startsWith(month+'-');
  const priorEnd=active?previous+'-'+[today.slice(-2),previousEnd.slice(-2)].sort()[0]:previousEnd;
  const current=rows.filter(r=>r.date.startsWith(month+'-')&&(!active||r.date<=today));
  return {previous,priorEnd,current,prior:rowsInRange(rows,previous+'-01',priorEnd)};
}
export function publicPeriods(rows,today){
  const week=weekStart(today), month=today.slice(0,7), recentStart=addDays(today,-6);
  const throughToday=rows.filter(r=>r.date<=today);
  return {
    week,month,
    weekly:throughToday.filter(r=>r.date>=week),
    monthly:throughToday.filter(r=>r.date.startsWith(month)),
    recent:throughToday.filter(r=>r.date>=recentStart)
  };
}

export function monthStats(rows,month,planned=26,today){
  const selected=rows.filter(r=>r.date.startsWith(month));
  const last=selected.at(-1)?.date;
  const d=dayDate(month+'-01');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);
  const days=d.getUTCDate(), first=selected.filter(r=>+r.date.slice(-2)<=7);
  const current=today?.startsWith(month+'-');
  const remaining=current ? days-Number(today.slice(-2))+(last===today?0:1) : days;
  const maxShifts=Math.min(days, selected.length+remaining);
  const count=Math.max(selected.length,Math.min(maxShifts,Math.round(planned)));
  const avg=average(selected);
  return {rows:selected,total:sum(selected),avg,km:sum(selected,'km'),fuel:selected.every(r=>r.fuel!=null)?sum(selected,'fuel'):null,days,last,first,maxShifts,count,projection:avg===null?null:sum(selected)+avg*(count-selected.length),firstProjection:first.length>=3?average(first)*count:null};
}
export function weekdayStats(rows){return Array.from({length:7},(_,i)=>{const rs=rows.filter(r=>(dayDate(r.date).getUTCDay()+6)%7===i);return {day:i,rows:rs,avg:average(rs),total:sum(rs)};});}
export function sameWeekProgress(rows,anchor){const start=weekStart(anchor),elapsed=(dayDate(anchor).getUTCDay()+6)%7;const current=rows.filter(r=>r.date>=start&&r.date<=anchor);const prevStart=addDays(start,-7);const previous=rows.filter(r=>r.date>=prevStart&&r.date<=addDays(prevStart,elapsed));return {current,previous,change:current.length?change(average(current),average(previous)):null};}
