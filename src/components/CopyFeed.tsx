'use client';
import {useState} from 'react';
/** Dirección del feed con botón de copiar. Copiar es idempotente: repetir el clic no causa nada extra. */
export default function CopyFeed({feed}:{feed:string}){
  const [message,setMessage]=useState('');
  return <div className="inline-form"><code style={{overflowWrap:'anywhere'}}>{feed}</code>
    <button type="button" onClick={async()=>{try{await navigator.clipboard.writeText(new URL(feed,window.location.origin).href);setMessage('Dirección copiada.');}catch{setMessage('Selecciona la dirección y cópiala manualmente.');}}}>Copiar dirección</button>
    <span role="status">{message}</span></div>;
}
