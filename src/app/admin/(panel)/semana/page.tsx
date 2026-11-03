import Link from 'next/link';
import {adminData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import ContentList from '@/components/admin/ContentList';
export default async function Page(){const data=await adminData();return <><h1>Selecciones de la semana</h1><Link className="button primary" href="/admin/semana/new">Crear selección</Link><ContentList items={data.picks} kind="semana" demo={isDemo()}/></>;}