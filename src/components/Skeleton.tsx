/**
 * Esqueletos de carga. Reutilizan las mismas clases de maquetación que las páginas reales
 * (page-header, post-grid, week-grid, article-grid…), así el contenido aparece exactamente
 * donde estaba su silueta y no hay saltos de diseño.
 *
 * - Un solo destello recorre toda la pantalla (fondo fijo compartido), no un brillo por bloque.
 * - Aparece con un pequeño retraso: en cargas rápidas no parpadea.
 * - Con movimiento reducido, los bloques quedan quietos.
 * - Lectores de pantalla: una sola región role="status" con texto; los bloques son aria-hidden.
 */
import type {CSSProperties, ReactNode} from 'react';

type W = number | string;
const width = (w?: W): CSSProperties | undefined => (w === undefined ? undefined : {width: typeof w === 'number' ? `${w}%` : w});

/** Bloque base. Número = porcentaje del contenedor; texto = cualquier medida CSS ("150px", "min(420px,100%)"). */
export function Sk({w, className = ''}: {w?: W; className?: string}) {
  return <span className={`sk ${className}`} style={width(w)} />;
}

/** Renglones de texto con la métrica tipográfica del elemento que los contiene. */
export function SkText({as: Tag = 'p', lines = [100], className = ''}: {as?: 'p' | 'h1' | 'h2' | 'h3' | 'div'; lines?: W[]; className?: string}) {
  return <Tag className={`sk-text ${className}`}>{lines.map((w, i) => <Sk key={i} w={w} />)}</Tag>;
}

/** Contenedor accesible de cada pantalla de carga. */
export function SkeletonRegion({label, children, className = ''}: {label: string; children: ReactNode; className?: string}) {
  return <div className={`skeleton ${className}`} role="status" aria-live="polite" aria-busy="true">
    <span className="sr-only">{label}…</span>
    <div aria-hidden="true">{children}</div>
  </div>;
}

export function PageHeaderSk({lede = 2, titleW = 58}: {lede?: number; titleW?: W}) {
  return <header className="page-header">
    <Sk className="sk-eyebrow" w="150px" />
    <SkText as="h1" lines={[titleW]} />
    {lede > 0 && <SkText lines={Array.from({length: lede}, (_, i) => (i === lede - 1 ? 62 : 100))} className="sk-lede" />}
  </header>;
}

export function PillsSk({count = 5, className = 'filters'}: {count?: number; className?: string}) {
  const widths = [64, 82, 70, 96, 88, 104];
  return <div className={`sk-pills ${className}`}>{Array.from({length: count}, (_, i) => <Sk key={i} className="sk-pill" w={`${widths[i % widths.length]}px`} />)}</div>;
}

export function PostCardSk() {
  return <article className="post-card">
    <Sk className="sk-media" />
    <div className="card-meta"><Sk className="sk-chip" w="30%" /><Sk className="sk-chip" w="22%" /></div>
    <SkText as="h3" lines={[96, 70]} />
    <SkText lines={[100, 100, 54]} />
  </article>;
}

export function PostGridSk({count = 6}: {count?: number}) {
  return <div className="post-grid">{Array.from({length: count}, (_, i) => <PostCardSk key={i} />)}</div>;
}

export function PickCardSk() {
  return <article className="pick-card">
    <Sk className="sk-media square" />
    <div>
      <Sk className="sk-eyebrow" w="58%" />
      <SkText as="h3" lines={[90, 55]} />
      <SkText lines={[48]} />
      <Sk className="sk-chip" w="44%" />
    </div>
  </article>;
}

export function WeekGridSk({count = 2}: {count?: number}) {
  return <div className="week-grid">{Array.from({length: count}, (_, i) => <PickCardSk key={i} />)}</div>;
}

function SectionHeadSk({titleW = 34}: {titleW?: W}) {
  return <div className="section-head">
    <div style={{flex: 1}}><Sk className="sk-eyebrow" w="130px" /><SkText as="h2" lines={[titleW]} /></div>
    <Sk className="sk-chip" w="120px" />
  </div>;
}

/* ───────── Pantallas públicas ───────── */

export function HomeSkeleton() {
  return <SkeletonRegion label="Cargando la portada">
    <div className="home-stage">
      <section className="hero editorial-hero wrap">
        <div className="hero-top"><Sk className="sk-eyebrow" w="170px" /><Sk className="sk-eyebrow" w="130px" /></div>
        <div className="hero-layout">
          <div className="hero-intro">
            <Sk className="sk-pill" w="210px" />
            <SkText as="h1" lines={[78, 92]} />
            <SkText lines={[100, 72]} className="hero-description" />
            <div className="hero-actions"><Sk className="sk-pill sk-pill-lg" w="210px" /><Sk className="sk-chip" w="110px" /></div>
            <PillsSk count={4} className="hero-territories" />
          </div>
          <div className="cover-story sk-cover-story">
            <Sk className="sk-media sk-wide" />
            <div className="cover-story-copy"><SkText as="h2" lines={[94, 60]} /><Sk className="sk-chip" w="36%" /></div>
          </div>
        </div>
      </section>
    </div>
    <section className="section wrap editorial-section">
      <SectionHeadSk />
      <PillsSk count={6} />
      <PostGridSk count={3} />
    </section>
  </SkeletonRegion>;
}

/** Respaldo general de las páginas públicas: encabezado y una retícula de historias. */
export function PageSkeleton({label = 'Cargando'}: {label?: string}) {
  return <SkeletonRegion label={label} className="wrap">
    <PageHeaderSk />
    <section className="section"><PostGridSk count={3} /></section>
  </SkeletonRegion>;
}

export function TerritorySkeleton() {
  return <SkeletonRegion label="Cargando el territorio" className="wrap">
    <PageHeaderSk lede={0} titleW={36} />
    <PillsSk count={6} />
    <section className="section"><PostGridSk count={6} /></section>
  </SkeletonRegion>;
}

export function ReviewsSkeleton() {
  return <SkeletonRegion label="Cargando las reseñas" className="wrap">
    <PageHeaderSk />
    <PillsSk count={3} className="hero-territories" />
    <section className="section"><WeekGridSk count={4} /></section>
  </SkeletonRegion>;
}

export function WeekSkeleton() {
  return <SkeletonRegion label="Cargando la selección de la semana" className="wrap">
    <PageHeaderSk titleW={74} />
    <WeekGridSk count={2} />
    <section className="section"><SkText as="h2" lines={[40]} /><div className="archive-week"><SkText as="h3" lines={[22]} /><WeekGridSk count={2} /></div></section>
  </SkeletonRegion>;
}

/** Historia, reseña o selección: encabezado, portada y cuerpo de lectura. */
export function ArticleSkeleton({label = 'Cargando la historia', square = false}: {label?: string; square?: boolean}) {
  return <SkeletonRegion label={label} className="wrap">
    <PageHeaderSk titleW={84} />
    <div className="article-grid">
      <figure><Sk className={`sk-media${square ? ' square' : ''}`} /><Sk className="sk-eyebrow" w="40%" /></figure>
      <div className="prose">
        <SkText lines={[100, 100, 96, 100, 64]} />
        <SkText lines={[100, 98, 100, 42]} />
        <SkText lines={[100, 100, 88, 100, 76]} />
        <div className="engagement"><Sk className="sk-btn" w="150px" /><Sk className="sk-btn" w="130px" /></div>
      </div>
    </div>
  </SkeletonRegion>;
}

export function SearchSkeleton() {
  return <SkeletonRegion label="Buscando" className="wrap">
    <PageHeaderSk lede={0} titleW={52} />
    <div className="search-form"><Sk className="sk-eyebrow" w="110px" /><Sk className="sk-field" w="100%" /><Sk className="sk-btn" w="130px" /></div>
    <PillsSk count={6} className="hero-territories" />
    <section className="section"><SkText lines={[24]} /><PostGridSk count={3} /></section>
  </SkeletonRegion>;
}

export function ProfileSkeleton() {
  return <SkeletonRegion label="Cargando tu perfil" className="wrap">
    <PageHeaderSk lede={1} titleW={46} />
    <div className="tabs sk-tabs">{[70, 96, 104, 86, 104].map((w, i) => <Sk key={i} className="sk-tab" w={`${w}px`} />)}</div>
    <div className="tab-panel">
      <SkText as="h2" lines={[22]} />
      <div className="profile-facts">{[0, 1].map(i => <div key={i}><Sk className="sk-chip" w={22} /><SkText lines={[i ? 58 : 46]} /></div>)}</div>
      <div className="sk-labeled sk-name"><Sk className="sk-chip" w="130px" /><div className="input-row"><Sk className="sk-field" w="100%" /><Sk className="sk-btn" w="160px" /></div></div>
    </div>
  </SkeletonRegion>;
}

/* ───────── Panel de administración ───────── */

function TableSk({rows = 6, cols = 3}: {rows?: number; cols?: number}) {
  const widths = [72, 40, 52, 60];
  return <div className="table-scroll"><table className="sk-table"><thead><tr>{Array.from({length: cols}, (_, c) => <th key={c}><Sk className="sk-chip" w={`${widths[c % 4] - 20}%`} /></th>)}</tr></thead>
    <tbody>{Array.from({length: rows}, (_, r) => <tr key={r}>{Array.from({length: cols}, (_, c) => <td key={c}><Sk className="sk-chip" w={`${widths[(c + r) % 4]}%`} /></td>)}</tr>)}</tbody></table></div>;
}

export function AdminDashboardSkeleton() {
  return <SkeletonRegion label="Cargando el panel">
    <Sk className="sk-eyebrow" w="150px" />
    <SkText as="h1" lines={[42]} />
    <div className="stats">{Array.from({length: 4}, (_, i) => <div className="stat" key={i}><Sk className="sk-chip" w="50%" /><SkText className="sk-stat" lines={[30]} /></div>)}</div>
    <div className="admin-tools"><Sk className="sk-btn" w="180px" /><Sk className="sk-btn" w="160px" /><Sk className="sk-btn" w="130px" /></div>
    <SkText as="h2" lines={[28]} />
    <TableSk rows={6} />
  </SkeletonRegion>;
}

export function AdminTableSkeleton({label = 'Cargando el contenido'}: {label?: string}) {
  return <SkeletonRegion label={label}>
    <SkText as="h1" lines={[38]} />
    <Sk className="sk-btn" w="180px" />
    <div className="admin-tools">{[180, 150, 130, 150].map((w, i) => <div key={i} className="sk-labeled"><Sk className="sk-chip" w="40%" /><Sk className="sk-field" w={`${w}px`} /></div>)}</div>
    <TableSk rows={8} cols={4} />
  </SkeletonRegion>;
}

export function AdminEditorSkeleton({label = 'Cargando el editor'}: {label?: string}) {
  const field = (i: number, label: W = 28) => <div key={i} className="sk-labeled"><Sk className="sk-chip" w={label} /><Sk className="sk-field" w="100%" /></div>;
  return <SkeletonRegion label={label}>
    <SkText as="h1" lines={[46]} />
    <SkText lines={[44]} className="sk-muted-line" />
    <div className="kind-picker sk-kind"><Sk className="sk-chip" w="140px" /><Sk className="sk-card" /><Sk className="sk-card" /></div>
    <div className="form-grid">
      {field(0, 12)}{field(1, 10)}{field(2, 16)}{field(3, 18)}{field(4, 22)}{field(5, 16)}
      <div className="sk-labeled full"><Sk className="sk-chip" w={14} /><Sk className="sk-area" /></div>
    </div>
    <div className="form-actions"><Sk className="sk-btn" w="160px" /><Sk className="sk-btn" w="130px" /></div>
  </SkeletonRegion>;
}

export function AdminMediaSkeleton() {
  const field = (i: number, label: W) => <div key={i} className="sk-labeled"><Sk className="sk-chip" w={label} /><Sk className="sk-field" w="100%" /></div>;
  return <SkeletonRegion label="Cargando la biblioteca">
    <SkText as="h1" lines={[50]} />
    <div className="form-grid">{field(0, 12)}{field(1, 22)}{field(2, 10)}<Sk className="sk-chip sk-check" w={44} /></div>
    <div className="form-actions"><Sk className="sk-btn" w="170px" /></div>
    <SkText lines={[34]} />
    <SkText as="h2" lines={[18]} />
    <div className="media-grid">{Array.from({length: 4}, (_, i) => <article key={i}><Sk className="sk-media square" /><Sk className="sk-field" w="100%" /></article>)}</div>
  </SkeletonRegion>;
}

/** Reseñas del panel: encabezado con acción y bloques por estado (en votación, borradores, publicadas). */
export function AdminReviewsSkeleton() {
  return <SkeletonRegion label="Cargando las reseñas">
    <header className="admin-page-head"><SkText as="h1" lines={[100]} className="sk-head-title" /><Sk className="sk-btn" w="140px" /></header>
    <SkText lines={[78]} className="sk-muted-line" />
    {[30, 26, 46].map((w, i) => <section key={i} className="account-section"><SkText as="h2" lines={[w]} /><SkText lines={[60]} /></section>)}
  </SkeletonRegion>;
}

/** Formularios de cuenta (entrar, registro, recuperar…). */
export function AuthFormSkeleton() {
  return <SkeletonRegion label="Cargando" className="wrap auth-page">
    <PageHeaderSk lede={1} titleW={34} />
    <div className="reader-auth">
      {[0, 1].map(i => <div key={i} className="sk-labeled"><Sk className="sk-chip" w="22%" /><Sk className="sk-field" w="100%" /></div>)}
      <Sk className="sk-btn" w="100%" />
      <Sk className="sk-chip" w="60%" />
    </div>
  </SkeletonRegion>;
}

/* Secciones del panel: los mismos bloques apilados (account-section) que las pantallas reales. */
function SectionSk({title = 34, children}: {title?: W; children: ReactNode}) {
  return <section className="account-section"><SkText as="h2" lines={[title]} />{children}</section>;
}
const FieldSk = ({label = 30}: {label?: W}) => <div className="sk-labeled"><Sk className="sk-chip" w={label} /><Sk className="sk-field" w="100%" /></div>;

export function AdminGridSkeleton() {
  return <SkeletonRegion label="Cargando la parrilla">
    <SkText as="h1" lines={[56]} />
    <SectionSk title={30}><FieldSk label={22} /><FieldSk label={48} /><Sk className="sk-chip" w={40} /><FieldSk label={26} /><Sk className="sk-btn" w={100} /></SectionSk>
    <SectionSk title={26}><ul className="grid-list">{[62, 48, 56].map((w, i) => <li key={i} className="sk-list-row"><Sk className="sk-chip" w={w} /><Sk className="sk-btn sk-btn-sm" w="90px" /></li>)}</ul></SectionSk>
  </SkeletonRegion>;
}

export function AdminTeamSkeleton() {
  return <SkeletonRegion label="Cargando el equipo">
    <SkText as="h1" lines={[22]} />
    <SectionSk title={36}><SkText lines={[100, 40]} /><ul className="team-list">{[64, 58].map((w, i) => <li key={i} className="sk-stack"><Sk className="sk-chip" w={w} /><Sk className="sk-btn sk-btn-sm" w="200px" /></li>)}</ul></SectionSk>
    <SectionSk title={52}><SkText lines={[100, 100, 70]} /><FieldSk label={20} /><FieldSk label={34} /><Sk className="sk-btn" w="190px" /></SectionSk>
  </SkeletonRegion>;
}

export function AdminNoticesSkeleton() {
  return <SkeletonRegion label="Cargando las notificaciones">
    <SkText as="h1" lines={[44]} />
    <SectionSk title={52}><div className="notice-actions">{['135px', '165px', '210px'].map((w, i) => <Sk key={i} className="sk-btn sk-btn-sm" w={w} />)}</div></SectionSk>
    <SectionSk title={34}><ul className="notice-list">{[70, 56, 64].map((w, i) => <li key={i}><Sk className="sk-chip" w={w} /><Sk className="sk-chip" w={20} /></li>)}</ul><div className="notice-actions"><Sk className="sk-btn sk-btn-sm" w="170px" /><Sk className="sk-btn sk-btn-sm" w="155px" /></div></SectionSk>
  </SkeletonRegion>;
}

/** Entrada al panel desde el sitio: la barra lateral y una página neutra aparecen mientras se verifica la sesión (sirve para cualquier sección). */
export function AdminShellSkeleton() {
  return <div className="admin-shell">
    <aside className="admin-nav sk-scope" aria-hidden="true">
      <Sk className="sk-logo" w="120px" />
      <Sk className="sk-eyebrow" w={70} />
      <div className="sk-nav">{[62, 84, 70, 52, 60, 54, 64, 76, 50, 90, 58, 48].map((w, i) => <Sk key={i} className="sk-chip" w={w} />)}</div>
    </aside>
    <main className="admin-main"><SkeletonRegion label="Cargando el panel"><SkText as="h1" lines={[40]} /><SkText lines={[52]} className="sk-muted-line" /><TableSk rows={7} /></SkeletonRegion></main>
  </div>;
}
