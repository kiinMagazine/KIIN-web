import Shell from '@/components/Shell';
export const revalidate=300;
export default function PublicLayout({children}:{children:React.ReactNode}){return <Shell>{children}</Shell>;}
