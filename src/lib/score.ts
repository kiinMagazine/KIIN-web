export function scoreLabel(total:number){return total>=20?'Publicar':total>=15?'Evaluar':'Descartar';}
export function score(values:number[]){const total=values.reduce((a,b)=>a+b,0);return {total,label:scoreLabel(total)};}
export const scoreFields=['score_story','score_impact','score_discovery','score_affinity','score_narrative'] as const;
export const scoreNames=['Historia detrás','Impacto cultural','Potencial de descubrimiento','Afinidad','Capacidad narrativa'];
