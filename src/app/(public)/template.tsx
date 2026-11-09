/** Transición de entrada en cada navegación (se vuelve a montar por ruta). Movimiento discreto; desactivado con movimiento reducido. */
export default function Template({children}:{children:React.ReactNode}){return <div className="page-enter">{children}</div>;}
