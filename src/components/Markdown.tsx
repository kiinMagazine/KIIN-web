import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
export default function Markdown({text}:{text:string}){return <div className="prose"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} skipHtml components={{img:({alt})=><span className="muted">[Imagen: {alt||'sin descripción'}]</span>,a:({href,children})=><a href={href} rel="noopener noreferrer">{children}</a>}}>{text}</ReactMarkdown></div>;}
