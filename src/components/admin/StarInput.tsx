'use client';
/** Selector accesible de 1 a 5 estrellas (grupo de radios: flechas para moverse, Espacio para elegir). */
export default function StarInput({name,value,onChange,label,error}:{name:string;value:number;onChange:(n:number)=>void;label:string;error?:string}){
  return <fieldset className="star-input" aria-describedby={error?`${name}-error`:undefined}>
    <legend>{label}</legend>
    <div className="star-input-row">{[1,2,3,4,5].map(n=><label key={n} className={n<=value?'on':''}>
      <input type="radio" name={name} value={n} checked={value===n} onChange={()=>onChange(n)}/>
      <span aria-hidden="true">★</span><span className="sr-only">{n} {n===1?'estrella':'estrellas'}</span>
    </label>)}<span className="star-input-value" aria-hidden="true">{value?`${value}/5`:'Sin calificar'}</span></div>
    {error&&<span id={`${name}-error`} className="field-error">{error}</span>}
  </fieldset>;
}
