import {getPosts} from '@/lib/data';
import {site} from '@/config/site';
import {xml} from '@/lib/format';
export const revalidate=300;
export async function GET(){if(!site.url)return new Response('Configura NEXT_PUBLIC_SITE_URL para habilitar el RSS.',{status:503});const {items}=await getPosts({limit:30});return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>KIIN</title><link>${xml(site.url)}</link><description>La cultura no es noticia.</description><language>es-MX</language>${items.map(p=>`<item><title>${xml(p.title)}</title><link>${xml(site.url+'/p/'+p.slug)}</link><guid>${xml(site.url+'/p/'+p.slug)}</guid><description>${xml(p.excerpt)}</description><pubDate>${new Date(p.published_at!).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});}
