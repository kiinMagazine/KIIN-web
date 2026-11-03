export function slugify(text:string){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');}
export function uniqueSlug(base:string,used:string[]){let n=2;let candidate=base;while(used.includes(candidate)){const suffix=`-${n++}`;candidate=base.slice(0,100-suffix.length)+suffix;}return candidate;}
