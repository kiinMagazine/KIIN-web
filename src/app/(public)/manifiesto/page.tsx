import brand from '@/content/brand.json';
import Markdown from '@/components/Markdown';
import {metadata} from '@/lib/seo';
export function generateMetadata(){return metadata('Manifiesto','La cultura se vive desde dentro. Estas son las creencias que mueven a KIIN.','/manifiesto');}
export default function Manifesto(){return <div className="wrap"><header className="page-header"><p className="eyebrow">Lo que nos mueve</p><h1>Hay más detrás.</h1></header><article className="long-copy manifesto"><Markdown text={brand.manifesto}/></article></div>;}
