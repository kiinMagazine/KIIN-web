import {notificationData} from '@/lib/admin';
import {isDemo} from '@/lib/data';
import Notifications from '@/components/admin/Notifications';
export default async function Page(){return <><h1>Notificaciones</h1><Notifications items={await notificationData()} demo={isDemo()}/></>;}
