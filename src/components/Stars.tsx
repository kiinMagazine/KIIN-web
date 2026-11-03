/** Estrellas KIIN: de 1 a 5 con medias estrellas. El texto accesible da la calificación exacta. */
export default function Stars({value,size='md'}:{value:number|null;size?:'sm'|'md'|'lg'}){
  if(value==null)return null;
  const full=Math.floor(value),half=value-full>=0.5;
  return <span className={`stars stars-${size}`} role="img" aria-label={`Calificación KIIN: ${value.toString().replace('.',',')} de 5 estrellas`}>
    {Array.from({length:5},(_,i)=><span key={i} aria-hidden="true" className={i<full?'star on':i===full&&half?'star half':'star'}>★</span>)}
    <span className="stars-number" aria-hidden="true">{value.toFixed(1).replace('.',',')}</span>
  </span>;
}
