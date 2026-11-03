import Link from 'next/link';
import Shell from '@/components/Shell';
export default function NotFound(){return <Shell><div className="wrap section"><p className="eyebrow">404 / Una pista fuera del archivo</p><h1>Esta historia no está aquí.</h1><p>Hay otras que vale la pena descubrir.</p><Link className="button" href="/">Volver a explorar ↗</Link></div></Shell>;}
