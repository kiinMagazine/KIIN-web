export const site={name:'KIIN',tagline:'La cultura no es noticia.',url:process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,'')||'',socials:[] as {label:string;url:string}[]};
/** Activos de marca. Coloca los archivos en public/brand/ y escribe aquí su ruta; con null se usa el wordmark tipográfico y la animación SVG. */
export const brandAssets={logo:null as string|null,isotipo:null as string|null,isologo:null as string|null,loaderVideo:null as string|null};
export function absolute(path:string){return site.url?`${site.url}${path}`:undefined;}
