import React,{useCallback,useEffect,useMemo,useState} from 'react';
import{createRoot}from'react-dom/client';
import{LayoutDashboard,ClipboardList,Truck,Package,LogOut,Search,CheckCircle2,RefreshCw}from'lucide-react';
import{supabase}from'./supabase';
import'./style.css';

const allowed='giangi79@gmail.com';
const items=[['Dashboard',LayoutDashboard],['Ordini',ClipboardList],['Carichi',Truck],['Prodotti',Package]];
const emptyCounts={da_preparare:0,pronto:0,in_carico:0,consegnato:0};

function Login(){
  const[email,setEmail]=useState(allowed),[password,setPassword]=useState(''),[mode,setMode]=useState('login'),[msg,setMsg]=useState('');
  async function go(e){e.preventDefault();setMsg('');if(email.toLowerCase()!==allowed){setMsg('Email non autorizzata.');return}const r=mode==='signup'?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});if(r.error)setMsg(r.error.message);else if(mode==='signup')setMsg('Account creato. Controlla la tua email per confermare la registrazione.')}
  return <main className="login"><form onSubmit={go} className="card auth"><div className="brand">GO</div><h1>Gestione Ordini</h1><p>Accesso area riservata</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength="6" required/></label><button>{mode==='login'?'Accedi':'Crea account'}</button><button type="button" className="link" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Primo accesso? Crea il tuo account':'Hai già un account? Accedi'}</button>{msg&&<p className="msg">{msg}</p>}</form></main>
}

function App(){
  const[session,setSession]=useState(null),[page,setPage]=useState('Dashboard'),[counts,setCounts]=useState(emptyCounts);
  const refreshCounts=useCallback(async()=>{const{data}=await supabase.from('go_articoli').select('stato');if(data){const c={...emptyCounts};data.forEach(x=>{if(x.stato in c)c[x.stato]++});setCounts(c)}},[]);
  useEffect(()=>{supabase.auth.getSession().then(({data})=>setSession(data.session));const{data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
  useEffect(()=>{if(session)refreshCounts()},[session,refreshCounts]);
  if(!session)return <Login/>;
  return <div className="app"><aside><div className="logo">GO</div><nav>{items.map(([n,I])=><button key={n} className={page===n?'on':''} onClick={()=>setPage(n)}><I/> {n}</button>)}</nav><button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut/> Esci</button></aside><section><header><div><small>GESTIONE ORDINI ONLINE</small><h1>{page}</h1></div><span>{session.user.email}</span></header>{page==='Dashboard'?<Dashboard c={counts}/>:page==='Ordini'?<Orders onChanged={refreshCounts}/>:<Empty page={page}/>}</section><div className="bottom">{items.map(([n,I])=><button key={n} className={page===n?'on':''} onClick={()=>setPage(n)}><I/><small>{n}</small></button>)}</div></div>
}

function Dashboard({c}){return <><div className="welcome"><h2>Panoramica ordini</h2><p>Stato aggiornato degli articoli gestiti online.</p></div><div className="stats"><Stat t="Da preparare" n={c.da_preparare}/><Stat t="Pronti" n={c.pronto}/><Stat t="In carico" n={c.in_carico}/><Stat t="Consegnati" n={c.consegnato}/></div><div className="card"><h3>Versione online</h3><p>La gestione Ordini è ora collegata al database online. Il programma desktop resta separato e invariato.</p></div></>}
function Stat({t,n}){return <div className="card stat"><span>{t}</span><strong>{n}</strong></div>}

function Orders({onChanged}){
  const[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');const{data,error}=await supabase.from('go_articoli').select('id,codice,descrizione,quantita,riferimento_ordine,numero_documento,posizione,stato,data_pronto').in('stato',['da_preparare','pronto']).order('created_at',{ascending:false});if(error)setError(error.message);else setRows(data||[]);setLoading(false)},[]);
  useEffect(()=>{load()},[load]);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return rows;return rows.filter(r=>[r.codice,r.descrizione,r.riferimento_ordine,r.numero_documento,r.posizione].some(v=>String(v||'').toLowerCase().includes(q)))},[rows,query]);
  async function ready(row){setBusy(row.id);setError('');const{error}=await supabase.from('go_articoli').update({stato:'pronto',data_pronto:new Date().toISOString()}).eq('id',row.id);if(error)setError(error.message);else{setRows(v=>v.map(x=>x.id===row.id?{...x,stato:'pronto'}:x));await onChanged()}setBusy('')}
  return <><div className="ordersTop"><div><h2>Articoli da preparare</h2><p>Ricerca l'articolo e segnalo come pronto quando la preparazione è terminata.</p></div><button className="refresh" onClick={load} disabled={loading}><RefreshCw/> Aggiorna</button></div><div className="searchBox"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cerca codice, descrizione, documento, ordine o posizione"/></div>{error&&<div className="alert">{error}</div>}{loading?<div className="card empty"><p>Caricamento articoli…</p></div>:filtered.length===0?<div className="card empty"><h3>Nessun articolo da mostrare</h3><p>{query?'Nessun risultato per questa ricerca.':'Non ci sono ancora articoli da preparare o pronti nel database online.'}</p></div>:<div className="orderList">{filtered.map(r=><article className={'card order '+(r.stato==='pronto'?'isReady':'')} key={r.id}><div className="orderMain"><div className="orderTitle"><strong>{r.codice||'Senza codice'}</strong><span className={'status '+r.stato}>{r.stato==='pronto'?'PRONTO':'DA PREPARARE'}</span></div><h3>{r.descrizione||'Articolo senza descrizione'}</h3><div className="meta"><span><b>Q.tà</b> {r.quantita??0}</span><span><b>Documento</b> {r.numero_documento||'—'}</span><span><b>Ordine</b> {r.riferimento_ordine||'—'}</span><span><b>Posizione</b> {r.posizione||'—'}</span></div></div>{r.stato==='da_preparare'?<button className="readyBtn" disabled={busy===r.id} onClick={()=>ready(r)}><CheckCircle2/>{busy===r.id?'Salvataggio…':'Articolo pronto'}</button>:<div className="readyMark"><CheckCircle2/> Pronto</div>}</article>)}</div>}</>
}

function Empty({page}){return <div className="card empty"><h2>{page}</h2><p>Sezione pronta per il prossimo passaggio di sviluppo.</p></div>}
createRoot(document.getElementById('root')).render(<App/>);
