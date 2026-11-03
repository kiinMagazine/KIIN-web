import type {Metadata} from 'next';
import localFont from 'next/font/local';
import './globals.css';
import IdleGuard from '@/components/IdleGuard';
const display=localFont({src:'../../node_modules/@fontsource/anton/files/anton-latin-400-normal.woff2',variable:'--font-display',display:'swap'});
const serif=localFont({src:'../../node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2',variable:'--font-serif',display:'swap'});
const sans=localFont({src:'../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2',variable:'--font-sans',display:'swap'});
export const metadata:Metadata={title:{default:'KIIN · La cultura no es noticia.',template:'%s · KIIN'},description:'Historias, escenas y personas que están construyendo la cultura. Desde Querétaro.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es-MX" suppressHydrationWarning><body className={`${display.variable} ${serif.variable} ${sans.variable}`}><a className="skip" href="#contenido">Saltar al contenido</a>{children}<IdleGuard/></body></html>;}
