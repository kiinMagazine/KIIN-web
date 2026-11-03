import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../..');
function tree(dir,prefix=''){
 const entries=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>!['node_modules','.next'].includes(e.name)).sort((a,b)=>Number(b.isDirectory())-Number(a.isDirectory())||a.name.localeCompare(b.name));
 return entries.flatMap((entry,i)=>{const last=i===entries.length-1;return [prefix+(last?'└── ':'├── ')+entry.name,...(entry.isDirectory()?tree(path.join(dir,entry.name),prefix+(last?'    ':'│   ')):[])];});
}
for(const dir of ['MemoriaKIIN','PaginaWEB'])console.log([dir+'/',...tree(path.join(root,dir))].join('\n'));
