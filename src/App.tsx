import { FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Boxes, ClipboardList, Home, LogOut, PackageCheck, PackageOpen, RefreshCw, Search, Truck, Warehouse } from 'lucide-react'
import { supabase } from './lib/supabase'

type Page = 'dashboard' | 'ordini' | 'carichi' | 'prodotti'
type Stato = 'da_preparare' | 'pronto' | 'in_carico' | 'consegnato'

type Article = {
  id: string
  codice: string | null
  descrizione: string
  quantita: number
  riferimento_ordine: string | null
  numero_documento: string | null
  posizione: string | null
  stato: Stato
  created_at: string
}

type Product = { id: string; codice: string; descrizione: string; prezzo: number | null; attivo: boolean }
type Load = { id: string; numero: string | null; stato: string; data_carico: string; data_consegna: string | null }
type Profile = { nome: string | null; ruolo: string }

const statusLabel: Record<Stato, string> = {
  da_preparare: 'Da preparare',
  pronto: 'Pronti',
  in_carico: 'In carico',
  consegnato: 'Consegnati',
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [page, setPage] = useState<Page>('dashboard')
  const [articles, setArticles] = useState<Article[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loads, setLoads] = useState<Load[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [dataError, setDataError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) void loadData()
    else {
      setArticles([]); setProducts([]); setLoads([]); setProfile(null)
    }
  }, [session])

  async function login(event: FormEvent) {
    event.preventDefault()
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) setAuthError('Email o password non corretti.')
  }

  async function loadData() {
    setLoading(true)
    setDataError('')
    const [articleResult, productResult, loadResult, profileResult] = await Promise.all([
      supabase.from('go_articoli').select('id,codice,descrizione,quantita,riferimento_ordine,numero_documento,posizione,stato,created_at').order('created_at', { ascending: false }),
      supabase.from('go_prodotti').select('id,codice,descrizione,prezzo,attivo').order('codice'),
      supabase.from('go_carichi').select('id,numero,stato,data_carico,data_consegna').order('data_carico', { ascending: false }),
      supabase.from('go_utenti').select('nome,ruolo').eq('user_id', session?.user.id ?? '').maybeSingle(),
    ])
    const firstError = articleResult.error || productResult.error || loadResult.error || profileResult.error
    if (firstError) setDataError('Accesso ai dati non autorizzato. L’utente deve essere abilitato in Gestione Ordini.')
    setArticles((articleResult.data ?? []) as Article[])
    setProducts((productResult.data ?? []) as Product[])
    setLoads((loadResult.data ?? []) as Load[])
    setProfile(profileResult.data as Profile | null)
    setLoading(false)
  }

  const counts = useMemo(() => {
    const result: Record<Stato, number> = { da_preparare: 0, pronto: 0, in_carico: 0, consegnato: 0 }
    articles.forEach((item) => { if (item.stato in result) result[item.stato] += 1 })
    return result
  }, [articles])

  const filteredArticles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return articles
    return articles.filter((a) => [a.codice, a.descrizione, a.riferimento_ordine, a.numero_documento].some((v) => v?.toLowerCase().includes(q)))
  }, [articles, search])

  if (!authReady) return <div className="splash"><RefreshCw className="spin" /> Caricamento…</div>
  if (!session) return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark"><Boxes size={32} /></div>
        <p className="eyebrow">GESTIONALE ONLINE</p>
        <h1>Gestione Ordini</h1>
        <p className="muted">Accedi per controllare ordini, articoli pronti, carichi e prodotti anche da smartphone.</p>
        <form onSubmit={login}>
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
          {authError && <div className="error-box">{authError}</div>}
          <button className="primary" type="submit">Accedi</button>
        </form>
        <small>Accesso riservato agli utenti autorizzati.</small>
      </section>
    </main>
  )

  const title = page === 'dashboard' ? 'Dashboard' : page === 'ordini' ? 'Ordini' : page === 'carichi' ? 'Carichi' : 'Prodotti'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo"><span><Boxes size={24} /></span><div><b>Gestione Ordini</b><small>Online</small></div></div>
        <nav>
          <NavButton active={page === 'dashboard'} icon={<Home />} label="Dashboard" onClick={() => setPage('dashboard')} />
          <NavButton active={page === 'ordini'} icon={<ClipboardList />} label="Ordini" onClick={() => setPage('ordini')} />
          <NavButton active={page === 'carichi'} icon={<Truck />} label="Carichi" onClick={() => setPage('carichi')} />
          <NavButton active={page === 'prodotti'} icon={<Warehouse />} label="Prodotti" onClick={() => setPage('prodotti')} />
        </nav>
        <div className="sidebar-user"><small>{profile?.ruolo ?? 'utente'}</small><b>{profile?.nome || session.user.email}</b><button onClick={() => supabase.auth.signOut()}><LogOut size={17} /> Esci</button></div>
      </aside>

      <main className="content">
        <header><div><p className="eyebrow">GESTIONE ORDINI ONLINE</p><h1>{title}</h1></div><button className="refresh" onClick={() => void loadData()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={18} /> Aggiorna</button></header>
        {dataError && <div className="warning">{dataError}</div>}

        {page === 'dashboard' && <Dashboard counts={counts} articles={articles} loads={loads} onOpen={setPage} />}
        {page === 'ordini' && <Orders articles={filteredArticles} search={search} setSearch={setSearch} />}
        {page === 'carichi' && <Loads loads={loads} />}
        {page === 'prodotti' && <Products products={products} />}
      </main>

      <nav className="mobile-nav">
        <NavButton active={page === 'dashboard'} icon={<Home />} label="Home" onClick={() => setPage('dashboard')} />
        <NavButton active={page === 'ordini'} icon={<ClipboardList />} label="Ordini" onClick={() => setPage('ordini')} />
        <NavButton active={page === 'carichi'} icon={<Truck />} label="Carichi" onClick={() => setPage('carichi')} />
        <NavButton active={page === 'prodotti'} icon={<Warehouse />} label="Prodotti" onClick={() => setPage('prodotti')} />
      </nav>
    </div>
  )
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'nav-active' : ''} onClick={onClick}>{icon}<span>{label}</span></button>
}

function Dashboard({ counts, articles, loads, onOpen }: { counts: Record<Stato, number>; articles: Article[]; loads: Load[]; onOpen: (p: Page) => void }) {
  const cards: { key: Stato; icon: React.ReactNode; hint: string }[] = [
    { key: 'da_preparare', icon: <PackageOpen />, hint: 'Articoli ancora da preparare' },
    { key: 'pronto', icon: <PackageCheck />, hint: 'Pronti per il carico' },
    { key: 'in_carico', icon: <Truck />, hint: 'Attualmente in carico' },
    { key: 'consegnato', icon: <Boxes />, hint: 'Articoli consegnati' },
  ]
  return <>
    <section className="stats-grid">{cards.map((card) => <article className={`stat stat-${card.key}`} key={card.key}><div className="stat-icon">{card.icon}</div><div><small>{statusLabel[card.key]}</small><strong>{counts[card.key]}</strong><p>{card.hint}</p></div></article>)}</section>
    <section className="dashboard-grid">
      <article className="panel"><div className="panel-head"><div><h2>Attività recente</h2><p>Ultimi articoli inseriti</p></div><button onClick={() => onOpen('ordini')}>Vedi ordini</button></div>{articles.length ? <div className="compact-list">{articles.slice(0, 6).map((a) => <div key={a.id}><span className={`dot dot-${a.stato}`} /><div><b>{a.codice || 'Senza codice'}</b><small>{a.descrizione}</small></div><span className="badge">{statusLabel[a.stato]}</span></div>)}</div> : <Empty text="Nessun articolo presente" />}</article>
      <article className="panel"><div className="panel-head"><div><h2>Carichi</h2><p>Situazione corrente</p></div><button onClick={() => onOpen('carichi')}>Apri</button></div><div className="big-number">{loads.filter((l) => l.stato === 'aperto').length}</div><p className="muted">carichi aperti</p><div className="divider" /><div className="summary-row"><span>Totale carichi</span><b>{loads.length}</b></div></article>
    </section>
  </>
}

function Orders({ articles, search, setSearch }: { articles: Article[]; search: string; setSearch: (v: string) => void }) {
  return <section className="panel"><div className="toolbar"><div className="search"><Search size={18} /><input placeholder="Cerca codice, descrizione, ordine o documento…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><span>{articles.length} articoli</span></div>{articles.length ? <div className="table-wrap"><table><thead><tr><th>Codice</th><th>Descrizione</th><th>Q.tà</th><th>Ordine</th><th>Documento</th><th>Stato</th></tr></thead><tbody>{articles.map((a) => <tr key={a.id}><td><b>{a.codice || '—'}</b></td><td>{a.descrizione}</td><td>{a.quantita}</td><td>{a.riferimento_ordine || '—'}</td><td>{a.numero_documento || '—'}</td><td><span className={`badge badge-${a.stato}`}>{statusLabel[a.stato]}</span></td></tr>)}</tbody></table></div> : <Empty text="Nessun articolo da visualizzare" />}</section>
}

function Loads({ loads }: { loads: Load[] }) {
  return <section className="panel"><div className="panel-head"><div><h2>Carichi</h2><p>Storico e carichi aperti</p></div></div>{loads.length ? <div className="cards-list">{loads.map((l) => <article key={l.id}><div><small>{l.data_carico}</small><h3>{l.numero || 'Carico senza numero'}</h3></div><span className="badge">{l.stato}</span></article>)}</div> : <Empty text="Nessun carico presente" />}</section>
}

function Products({ products }: { products: Product[] }) {
  return <section className="panel"><div className="panel-head"><div><h2>Anagrafica prodotti</h2><p>Codici, descrizioni e prezzi</p></div><span>{products.length} prodotti</span></div>{products.length ? <div className="table-wrap"><table><thead><tr><th>Codice</th><th>Descrizione</th><th>Prezzo</th><th>Stato</th></tr></thead><tbody>{products.map((p) => <tr key={p.id}><td><b>{p.codice}</b></td><td>{p.descrizione}</td><td>{p.prezzo == null ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(p.prezzo)}</td><td><span className="badge">{p.attivo ? 'Attivo' : 'Disattivato'}</span></td></tr>)}</tbody></table></div> : <Empty text="Nessun prodotto presente" />}</section>
}

function Empty({ text }: { text: string }) { return <div className="empty"><Boxes size={34} /><b>{text}</b><span>I dati reali verranno importati in una fase successiva.</span></div> }

export default App