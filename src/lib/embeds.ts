function safeUrl(input: string): URL | null {
  if(input.length>300) return null;
  try { const u=new URL(input); return u.protocol==='https:' && !u.username && !u.password && !u.port ? u : null; } catch { return null; }
}
export function parseSpotifyUrl(input:string){
  const u=safeUrl(input); if(!u || u.hostname!=='open.spotify.com') return null;
  const m=u.pathname.match(/^\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist)\/([A-Za-z0-9]{22})\/?$/);
  return m ? {kind:m[1],id:m[2],url:`https://open.spotify.com/${m[1]}/${m[2]}`,embedUrl:`https://open.spotify.com/embed/${m[1]}/${m[2]}`} : null;
}
export function parseYoutubeUrl(input:string){
  const u=safeUrl(input); if(!u || !['youtube.com','www.youtube.com','music.youtube.com','youtu.be'].includes(u.hostname)) return null;
  if(u.pathname==='/playlist' && u.hostname!=='youtu.be'){
    const id=u.searchParams.get('list');
    return id && /^[A-Za-z0-9_-]{10,100}$/.test(id) ? {id,url:`https://www.youtube.com/playlist?list=${id}`,embedUrl:`https://www.youtube-nocookie.com/embed/videoseries?list=${id}`} : null;
  }
  const id=u.hostname==='youtu.be' ? u.pathname.slice(1) : u.pathname==='/watch' ? u.searchParams.get('v') : u.pathname.startsWith('/embed/') ? u.pathname.slice(7) : null;
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? {id,url:`https://www.youtube.com/watch?v=${id}`,embedUrl:`https://www.youtube-nocookie.com/embed/${id}`} : null;
}
