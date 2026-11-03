import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const source=files(path.join(root,'src'));
const serviceFile=path.join(root,'src','lib','supabase','service.ts');
for(const pattern of [/service_role|SUPABASE_SERVICE_ROLE_KEY/g,/dangerouslySetInnerHTML/g,/localStorage/g]){
 let count=0;console.log(`Búsqueda: ${pattern.source}`);
 for(const file of source){if(pattern.source.includes('service_role')&&file===serviceFile)continue;const text=fs.readFileSync(file,'utf8');const lines=text.split('\n');for(const [i,line] of lines.entries())if(new RegExp(pattern.source).test(line)){const n=[...line.matchAll(new RegExp(pattern.source,'g'))].length;count+=n;console.log(`${path.relative(root,file)}:${i+1}: ${line.trim()}`);}}
 console.log(`Coincidencias: ${count}`);
 if(pattern.source.includes('service_role')&&count)process.exitCode=1;
}
console.log('Procesos de servidores de desarrollo:');
try{const result=process.platform==='win32'?execFileSync('powershell.exe',['-NoProfile','-Command',"Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'node|cmd' -and $_.CommandLine -match 'next\\s+dev|npm(?:\.cmd)?\\s+run\\s+dev' } | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"],{encoding:'utf8'}):execFileSync('ps',['-eo','pid,args'],{encoding:'utf8'}).split('\n').filter(line=>/next\s+dev|npm\s+run\s+dev/.test(line)).join('\n');console.log(result.trim()||'0 procesos encontrados.');}catch{console.log('No se pudo consultar la lista de procesos del sistema.');process.exitCode=1;}
console.log('Cabeceras de next.config.ts:');console.log(fs.readFileSync(path.join(root,'next.config.ts'),'utf8'));
