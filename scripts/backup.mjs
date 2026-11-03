import fs from 'node:fs/promises';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key){console.error('Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno local para respaldar.');process.exit(1);}
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const output=path.resolve(import.meta.dirname,'../backups',new Date().toISOString().replaceAll(':','-'));
try{
 await fs.mkdir(output,{recursive:true});
 for(const table of ['posts','weekly_picks','media','admins']){const rows=[];for(let start=0;;start+=500){const {data,error}=await client.from(table).select('*').order(table==='admins'?'user_id':'id').range(start,start+499);if(error)throw error;rows.push(...data);if(data.length<500)break;}await fs.writeFile(path.join(output,`${table}.json`),JSON.stringify(rows,null,2));console.log(`${table}: ${rows.length} filas`);}
 const paths=[];async function list(prefix=''){for(let offset=0;;offset+=100){const {data,error}=await client.storage.from('kiin-media').list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(error)throw error;for(const item of data){const full=[prefix,item.name].filter(Boolean).join('/');if(item.id)paths.push(full);else await list(full);}if(data.length<100)break;}}
 await list();await fs.writeFile(path.join(output,'storage-paths.json'),JSON.stringify(paths,null,2));console.log(`Respaldo guardado en ${output}. Storage: ${paths.length} rutas (los binarios no se descargan).`);
}catch{console.error('No se completó el respaldo. Comprueba conexión, permisos y variables. La carpeta puede contener archivos parciales.');process.exitCode=1;}
