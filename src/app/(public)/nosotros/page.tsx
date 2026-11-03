import brand from '@/content/brand.json';
import Markdown from '@/components/Markdown';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return metadata('Nosotros','KIIN nace desde Querétaro para descubrir, entender y documentar la cultura.','/nosotros');}
export default function About(){return <div className="wrap"><header className="page-header"><p className="eyebrow">Desde Querétaro</p><h1>La cultura se vive desde dentro.</h1></header><article className="long-copy"><Markdown text={brand.storytelling}/>{[['Misión',brand.mission],['Visión',brand.vision],['Valores',brand.values],['Creencias',brand.beliefs]].map(([title,text])=><section key={title}><h2 style={{marginBlock:30}}>{title}</h2><Markdown text={text}/></section>)}</article></div>;}
