'use client';
import {useEffect,useState} from 'react';
export default function Theme(){
  const [theme,setTheme]=useState('papel');
  useEffect(()=>{
    let value=window.matchMedia('(prefers-color-scheme: dark)').matches?'noche':'papel';
    try{
      const saved=localStorage.getItem('kiin-theme');
      if(saved==='papel'||saved==='noche')value=saved;
    }catch{}
    document.documentElement.dataset.theme=value;
    queueMicrotask(()=>setTheme(value));
  },[]);
  function toggle(){
    const value=theme==='papel'?'noche':'papel';
    setTheme(value);
    document.documentElement.dataset.theme=value;
    try{localStorage.setItem('kiin-theme',value);}catch{}
  }
  return <button className="theme-button" onClick={toggle} aria-label={`Activar tema ${theme==='papel'?'Noche':'Papel'}`}>{theme==='papel'?'Noche':'Papel'} <span aria-hidden="true">◐</span></button>;
}
