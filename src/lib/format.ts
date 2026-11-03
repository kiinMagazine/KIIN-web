import {zone} from './week';
export function formatDate(value:string){return new Intl.DateTimeFormat('es-MX',{timeZone:zone,day:'numeric',month:'long',year:'numeric'}).format(new Date(value));}
export function xml(value:string){return value.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));}
