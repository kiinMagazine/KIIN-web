import type {NextConfig} from 'next';
const isDev = process.env.NODE_ENV === 'development';
// Next.js necesita eval y WebSocket para depuración y recarga en desarrollo.
const csp = ["default-src 'self'", `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`, "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https://*.supabase.co", `connect-src 'self' https://*.supabase.co${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`, "frame-src https://open.spotify.com https://www.youtube-nocookie.com", "font-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'", ...(!isDev ? ['upgrade-insecure-requests'] : [])].join('; ');
const config: NextConfig = {
  agentRules:false,
  images:{unoptimized:true}, poweredByHeader:false,
  async headers(){return [{source:'/:path*',headers:[
    ...(!isDev ? [{key:'Strict-Transport-Security',value:'max-age=63072000; includeSubDomains'}] : []),
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Content-Security-Policy',value:csp}
  ]},{source:'/admin/:path*',headers:[{key:'Cache-Control',value:'private, no-store, max-age=0'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}];}
};
export default config;
