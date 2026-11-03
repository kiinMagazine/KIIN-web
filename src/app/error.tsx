'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main id="contenido" className="wrap section"><h1>No pudimos abrir esta historia.</h1><p>Inténtalo otra vez en un momento.</p><button onClick={reset}>Volver a intentar</button></main>;}
