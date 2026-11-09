import {metadata} from '@/lib/seo';
import {site} from '@/config/site';
import CopyFeed from '@/components/CopyFeed';
export function generateMetadata(){return metadata('Sigue KIIN por RSS','Recibe cada publicación nueva de KIIN en tu lector de noticias.','/rss');}
/**
 * Página legible para el RSS. El enlace del pie llevaba directo a /rss.xml y el navegador mostraba el XML crudo
 * ("código en lugar de la página"). El feed sigue en /rss.xml para los lectores.
 */
export default function Rss(){
  const feed=`${site.url||''}/rss.xml`;
  return <div className="wrap"><header className="page-header"><p className="eyebrow">Sin algoritmo de por medio</p><h1>Sigue KIIN por RSS.</h1></header>
    <article className="long-copy prose">
      <p>RSS te avisa de cada publicación nueva de KIIN en la aplicación de noticias que prefieras (por ejemplo Feedly, Inoreader, NetNewsWire o Reeder), sin crear cuenta ni depender de redes sociales.</p>
      <h2>Cómo suscribirte</h2>
      <ol><li>Copia la dirección del feed.</li><li>En tu lector, elige “Agregar fuente” o “Suscribirse” y pégala.</li></ol>
      <CopyFeed feed={feed}/>
      <p className="muted">Si abres la dirección directamente en el navegador verás texto técnico (XML): es normal, está pensada para los lectores de RSS.</p>
    </article></div>;
}
