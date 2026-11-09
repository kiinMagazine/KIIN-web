'use client';
import {useEffect,useRef,useState} from 'react';
import {useActionLock} from '@/lib/use-action-lock';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {updateUsername,updateFollows,markSeen,requestPasswordReset,signOut,type ReaderResult} from '@/app/cuenta-actions';
import {clearHistory} from '@/app/engagement-actions';
import {territories,territoryNames} from '@/lib/validators';
import type {ProfilePost,ReaderProfile} from '@/lib/reader';
import type {Pick} from '@/lib/data/types';
import KiinImage from './KiinImage';

type Tab='perfil'|'megusta'|'guardados'|'historial'|'seguridad';
const TABS:{id:Tab;label:string}[]=[{id:'perfil',label:'Perfil'},{id:'megusta',label:'Me gusta'},{id:'guardados',label:'Guardados'},{id:'historial',label:'Historial'},{id:'seguridad',label:'Seguridad'}];
const date=(iso:string)=>new Date(iso).toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
const href=(p:ProfilePost)=>p.kind==='review'?`/resenas/${p.slug}`:`/p/${p.slug}`;

function PostList({items,verb,empty}:{items:ProfilePost[];verb:string;empty:React.ReactNode}){
  if(!items.length)return <div className="empty-state">{empty}</div>;
  return <ul className="profile-list">{items.map(p=><li key={p.id}><Link href={href(p)} className="profile-item">
    <span className="profile-thumb">{p.cover?<KiinImage media={p.cover} square/>:<span className="image-empty square"><span>K</span></span>}</span>
    <span><span className="eyebrow">{p.kind==='review'?'Reseña':territoryNames[p.territory]}</span><strong>{p.title}</strong><small className="muted">{verb} el {date(p.at)}{p.views&&p.views>1?` · ${p.views} veces`:''}</small></span>
  </Link></li>)}</ul>;
}

/** Perfil: pestañas accesibles (flechas izquierda/derecha, Inicio/Fin), con el estado en el hash para poder enlazarlas. */
export default function Profile({profile,email,role,likes,saves,history,picks}:{profile:ReaderProfile;email:string;role:'admin'|'usuario';likes:ProfilePost[];saves:ProfilePost[];history:ProfilePost[];picks:Pick[]}){
  const [tab,setTab]=useState<Tab>('perfil'),[result,setResult]=useState<ReaderResult|null>(null),[username,setUsername]=useState(profile.username);
  const [all,setAll]=useState(profile.follow_all),[picked,setPicked]=useState<string[]>(profile.follow_territories);
  const router=useRouter(),refs=useRef<Record<string,HTMLButtonElement|null>>({});
  useEffect(()=>{const h=location.hash.slice(1) as Tab;if(TABS.some(t=>t.id===h))queueMicrotask(()=>setTab(h));},[]);
  function select(t:Tab,focus=false){setTab(t);setResult(null);history_replace(t);if(focus)refs.current[t]?.focus();}
  function history_replace(t:Tab){try{window.history.replaceState(null,'',`#${t}`);}catch{}}
  function onKey(e:React.KeyboardEvent){const i=TABS.findIndex(t=>t.id===tab);const n=e.key==='ArrowRight'?(i+1)%TABS.length:e.key==='ArrowLeft'?(i-1+TABS.length)%TABS.length:e.key==='Home'?0:e.key==='End'?TABS.length-1:-1;if(n>=0){e.preventDefault();select(TABS[n].id,true);}}
  const lock=useActionLock(),{busy,ready}=lock;
  // Un clic = un envío: el candado se toma en el mismo clic (el estado de React llega un render tarde).
  function run(task:()=>Promise<ReaderResult>,done?:(r:ReaderResult)=>void){return lock.run(async()=>{try{const r=await task();setResult(r);if(r.ok)done?.(r);}catch{setResult({ok:false,message:'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'});}});}
  const count={megusta:likes.length,guardados:saves.length+picks.length,historial:history.length} as Record<string,number>;
  const banner=result?.message&&<p className={result.ok?'notice-ok':'notice-error'} role={result.ok?'status':'alert'}>{result.message}</p>;
  return <div className="profile">
    <div role="tablist" aria-label="Secciones de tu perfil" className="tabs" onKeyDown={onKey}>
      {TABS.map(t=><button key={t.id} ref={el=>{refs.current[t.id]=el;}} role="tab" id={`tab-${t.id}`} aria-selected={tab===t.id} aria-controls={`panel-${t.id}`} tabIndex={tab===t.id?0:-1} onClick={()=>select(t.id)}>{t.label}{count[t.id]?<span className="tab-count"> {count[t.id]}</span>:null}</button>)}
    </div>

    <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tab-panel" tabIndex={0}>
      {banner}
      {tab==='perfil'&&<>
        <h2>Tu perfil</h2>
        <dl className="profile-facts"><div><dt>Correo</dt><dd>{email}</dd></div><div><dt>Tipo de cuenta</dt><dd>{role==='admin'?<>Administrador · <Link href="/admin">Ir al panel</Link></>:'Lector'}</dd></div></dl>
        <form method="post" className="inline-form" onSubmit={e=>{e.preventDefault();run(()=>updateUsername({username}),()=>router.refresh());}}>
          <div className="field"><label htmlFor="username">Nombre de usuario</label><input id="username" value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.]{3,30}" aria-describedby="username-help" aria-invalid={!!result?.errors?.username}/><small id="username-help" className="hint">De 3 a 30 caracteres: letras sin acentos, números, punto o guion bajo.</small></div>
          <button disabled={!ready||busy||username===profile.username}>Guardar nombre</button>
        </form>
        <h2>Lo que sigues</h2>
        <p className="muted">Te mostramos aquí las novedades publicadas desde tu última visita.</p>
        <label className="field-inline"><input type="checkbox" checked={all} onChange={e=>setAll(e.target.checked)}/> Todo KIIN</label>
        <div className="follow-list">{territories.map(t=><label className="field-inline" key={t}><input type="checkbox" disabled={all} checked={all||picked.includes(t)} onChange={()=>setPicked(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])}/> {territoryNames[t]}</label>)}</div>
        <div className="form-actions"><button disabled={!ready||busy} onClick={()=>run(()=>updateFollows({follow_all:all,follow_territories:picked}),()=>router.refresh())}>Guardar lo que sigo</button><button disabled={!ready||busy} onClick={()=>run(markSeen,()=>router.refresh())}>Marcar novedades como vistas</button></div>
      </>}
      {tab==='megusta'&&<><h2>Publicaciones que te gustan</h2><PostList items={likes} verb="Te gustó" empty={<><p>Todavía no le das me gusta a nada.</p><p>Toca <strong>♡ Me gusta</strong> en cualquier historia o reseña y aparecerá aquí.</p><Link className="button" href="/">Explorar historias</Link></>}/></>}
      {tab==='guardados'&&<><h2>Guardados</h2><PostList items={saves} verb="Guardada" empty={<><p>No tienes publicaciones guardadas.</p><p>Usa <strong>□ Guardar</strong> para leer después.</p><Link className="button" href="/resenas">Ver reseñas</Link></>}/>
        {!!picks.length&&<><h3>Selecciones de la semana</h3><ul className="profile-list">{picks.map(p=><li key={p.id}><Link className="profile-item" href={`/semana/${p.slug}`}><span className="profile-thumb">{p.cover&&<KiinImage media={p.cover} square/>}</span><span><span className="eyebrow">{p.kind==='album'?'Álbum':'Canción'} de la semana</span><strong>{p.title}</strong><small className="muted">{p.artist}</small></span></Link></li>)}</ul></>}</>}
      {tab==='historial'&&<><div className="tab-head"><h2>Historial</h2>{!!history.length&&<button className="link-button" disabled={!ready||busy} onClick={()=>run(clearHistory as ()=>Promise<ReaderResult>,()=>router.refresh())}>Borrar historial</button>}</div>
        <PostList items={history} verb="Abierta por última vez" empty={<><p>Aquí verás las publicaciones que abras con tu sesión iniciada.</p><Link className="button" href="/">Empezar a leer</Link></>}/></>}
      {tab==='seguridad'&&<>
        <h2>Contraseña</h2>
        <p>Cámbiala cuando quieras. Al hacerlo cerramos tus otras sesiones.</p>
        <Link className="button" href="/cuenta/cambiar-contrasena">Cambiar contraseña</Link>
        <h3>¿No recuerdas la actual?</h3>
        <p>Te enviamos un enlace a <strong>{email}</strong> para elegir una nueva. Vence en 30 minutos.</p>
        <button disabled={!ready||busy} onClick={()=>run(()=>requestPasswordReset({email}))}>Enviarme enlace de recuperación</button>
        <h2>Sesión</h2>
        <button disabled={!ready||busy} onClick={()=>run(signOut,()=>{router.push('/');router.refresh();})}>Cerrar sesión</button>
        {role==='admin'&&<p className="muted">Verificación en dos pasos del panel: <Link href="/admin/cuenta">configúrala aquí</Link>.</p>}
      </>}
    </section>
  </div>;
}
