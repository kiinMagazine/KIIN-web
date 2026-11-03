import {teamData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import Team from '@/components/admin/Team';
export default async function Page(){return <><h1>Equipo</h1><Team members={await teamData()} demo={isDemo()}/></>;}
