export const zone='America/Mexico_City';
export function mexicoDate(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function isoWeek(input:string|Date=new Date()){
  const s=typeof input==='string'?input.slice(0,10):mexicoDate(input);
  const date=new Date(`${s}T12:00:00Z`);
  if(Number.isNaN(date.getTime())) throw new Error('Fecha inválida');
  const day=date.getUTCDay()||7;
  const monday=new Date(date); monday.setUTCDate(date.getUTCDate()-day+1);
  date.setUTCDate(date.getUTCDate()+4-day);
  const year=date.getUTCFullYear();
  const week=Math.ceil((((date.getTime()-Date.UTC(year,0,1,12))/86400000)+1)/7);
  return {year,week,week_start:monday.toISOString().slice(0,10)};
}
export function pickSlug(kind:string,year:number,week:number){return `${kind}-${year}-s${String(week).padStart(2,'0')}`;}
export function mexicoToIso(local:string){
  // Ciudad de México mantiene UTC−6 para las fechas editoriales admitidas (2023+).
  return new Date(`${local}:00-06:00`).toISOString();
}
export function localDateTime(date=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date).replace(' ','T');}
