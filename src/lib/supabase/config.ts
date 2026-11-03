export function isDemo(){return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;}
export function credentials(){return {url:process.env.NEXT_PUBLIC_SUPABASE_URL!,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!};}
