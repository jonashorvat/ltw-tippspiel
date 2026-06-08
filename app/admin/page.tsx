'use client'
// app/admin/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { QUESTIONS } from '@/lib/types'
import type { Participant, MatchResult } from '@/lib/types'

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY ?? 'ltw-admin-2024'
const ADMIN_UI_PASSWORD = 'JonasHorvat'
const DEMO_NAMES = ['Max Mustermann','Lena Koch','Tom Bauer','Sarah Braun','Kevin Wolf','Anna Klein','Florian Schwarz','Maria Weiß','Ben Schäfer','Julia Richter','Chris Berg','Laura Vogt','David Fuchs','Eva Hartmann','Nico Simon','Mia Lange','Jan Hoffmann','Sophie Krause','Felix Meyer','Hannah Zimmermann']

const headers = { 'Content-Type':'application/json', 'x-admin-key':ADMIN_KEY }

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)

  const attempt = () => {
    if (pw === ADMIN_UI_PASSWORD) {
      sessionStorage.setItem('admin_auth', '1')
      onLogin()
    } else {
      setError(true)
      setPw('')
      setTimeout(() => setError(false), 2000)
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontFamily:'Barlow Condensed,sans-serif',fontWeight:900,fontSize:13,letterSpacing:'2px',color:'var(--muted)',textTransform:'uppercase',marginBottom:8}}>LightTheWorld</div>
          <h1 style={{fontSize:28,marginBottom:4}}>Admin-Bereich</h1>
          <p style={{color:'var(--muted)',fontSize:14}}>Bitte Kennwort eingeben</p>
        </div>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Kennwort</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••••"
              value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && attempt()}
              autoFocus
              style={error ? {borderColor:'#ff6060'} : {}}
            />
            {error && <p style={{color:'#ff6060',fontSize:13,marginTop:6}}>Falsches Kennwort</p>}
          </div>
          <button className="btn btn-primary btn-block" onClick={attempt}>
            Einloggen →
          </button>
        </div>
      </div>
    </div>
  )
}

interface AdminData {
  results: MatchResult
  participants: Participant[]
  source: 'live' | 'manual'
  codes: string[]
  usedCodes: string[]
}

function randomAnswer(q: typeof QUESTIONS[0]): string {
  if (q.type === 'score') return `${Math.floor(Math.random()*6)}:${Math.floor(Math.random()*4)}`
  if (q.type === 'yn') return Math.random() > 0.5 ? 'Ja' : 'Nein'
  if (q.type === 'number') {
    if (q.id === 5) return String(Math.floor(Math.random()*8)+1)
    if (q.id === 6) return String(Math.floor(Math.random()*15)+8)
    return String(Math.floor(Math.random()*10))
  }
  if (q.type === 'scorer') {
    const opts = (q.options ?? []).filter(o => o !== 'Keiner')
    return Math.random() > 0.15 ? opts[Math.floor(Math.random()*opts.length)] : 'Keiner'
  }
  if (q.type === 'minute') {
    return Math.random() > 0.15 ? String(Math.floor(Math.random()*90)+1) : 'Kein Tor'
  }
  return ''
}

type AdminTab = 'overview' | 'resolve' | 'codes' | 'data'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('admin_auth') === '1') setAuthed(true)
  }, [])

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />
  return <AdminPanel />
}

function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null)
  const [tab, setTab] = useState<AdminTab>('overview')
  const [manualAnswers, setManualAnswers] = useState<Record<number,string>>({})
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [codesText, setCodesText] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''),2500) }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin', { headers: { 'x-admin-key': ADMIN_KEY }, cache: 'no-store' })
      if (res.ok) {
        const d = await res.json() as AdminData
        setData(d)
        const cleanAnswers: Record<number, string> = {}
        Object.entries(d.results?.answers ?? {}).forEach(([k, v]) => {
          if (v !== null && v !== undefined) cleanAnswers[Number(k)] = v
        })
        setManualAnswers(cleanAnswers)
        if (d.codes?.length > 0) setCodesText(d.codes.join('\n'))
      }
    } catch {}
  }, [])

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 8000); return ()=>clearInterval(t) }, [fetchData])

  const post = async (body: object) => {
    setLoading(true)
    try {
      await fetch('/api/admin', { method:'POST', headers, body: JSON.stringify(body) })
      await fetchData()
    } catch {}
    setLoading(false)
  }

  const manualSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/live-sync-manual', { method:'POST', headers })
      const d = await res.json()
      if (d.ok) {
        showToast(`✅ Sync erfolgreich · Status: ${d.matchStatus ?? '?'}`)
      } else {
        showToast('⚠️ Sync fehlgeschlagen: ' + (d.error ?? 'Unbekannt'))
      }
      await fetchData()
    } catch {
      showToast('❌ Netzwerkfehler beim Sync')
    }
    setSyncing(false)
  }

  const saveCodes = async () => {
    const codes = codesText.split('\n').map(c => c.trim().toUpperCase()).filter(Boolean)
    await post({ action:'set-codes', codes })
    showToast(`${codes.length} Codes gespeichert ✓`)
  }

  const resetUsedCodes = async () => {
    if (!confirm('Alle verwendeten Codes zurücksetzen? Codes können dann erneut genutzt werden.')) return
    await post({ action:'reset-used-codes' })
    showToast('Verwendete Codes zurückgesetzt ✓')
  }

  const generateCodes = (count: number) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const newCodes = Array.from({length: count}, () =>
      Array.from({length: 6}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
    )
    setCodesText(prev => prev ? prev+'\n'+newCodes.join('\n') : newCodes.join('\n'))
  }

  const toggleSource = async (source: 'live' | 'manual') => {
    await post({ action:'set-source', source })
    showToast(source === 'live' ? '🔴 Live-Daten aktiviert' : '✏️ Manuelle Eingabe aktiviert')
  }

  const setAnswer = async (qId: number, answer: string) => {
    const updated = { ...manualAnswers, [qId]: answer }
    setManualAnswers(updated)
    await post({ action:'set-answer', questionId: qId, answer })
    showToast(`Frage ${qId} aufgelöst ✓`)
  }

  const addBulkDemo = async (count: number) => {
    setLoading(true)
    const used = new Set((data?.participants ?? []).map(p => p.name))
    const pool = [...DEMO_NAMES].sort(()=>Math.random()-.5)
    for (let i = 0; i < count; i++) {
      let name = pool[i % pool.length] + (i >= pool.length ? ' '+(i+1) : '')
      while (used.has(name)) name += '_'
      used.add(name)
      const answers: Record<number,string> = {}
      QUESTIONS.forEach(q => { answers[q.id] = randomAnswer(q) })
      await fetch('/api/admin', { method:'POST', headers, body: JSON.stringify({ action:'add-participant', name, answers }) })
    }
    await fetchData(); setLoading(false)
    showToast(`${count} Test-Teilnehmer hinzugefügt ✓`)
  }

  const clearParticipants = async () => {
    if (!confirm('Alle Teilnehmer löschen?')) return
    await post({ action:'clear-participants' }); showToast('Teilnehmer gelöscht')
  }
  const clearAll = async () => {
    if (!confirm('Alle Daten (Teilnehmer + Ergebnisse) löschen?')) return
    await post({ action:'clear' }); showToast('Alle Daten gelöscht')
  }

  const resolvedCount = QUESTIONS.filter(q => data?.results?.answers?.[q.id] != null).length
  const participantCount = data?.participants?.length ?? 0
  const source = data?.source ?? 'manual'
  const isLive = source === 'live'

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      {/* NAV */}
      <nav className="topnav">
        <div className="nav-logo">
          <span className="nav-logo-text">LightTheWorld</span>
          <div className="nav-logo-divider" />
          <span className="nav-logo-sub">ADMIN</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <a href="/leaderboard" className="btn btn-ghost btn-sm" target="_blank">🏆 Leaderboard</a>
          <a href="/guest" className="btn btn-ghost btn-sm" target="_blank">📱 Gast-View</a>
        </div>
      </nav>

      <div className="container-wide">
        {/* STATS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:10,margin:'20px 0'}}>
          {[
            {label:'Teilnehmer', value:participantCount},
            {label:'Aufgelöst', value:`${resolvedCount}/8`},
            {label:'Führend', value:data?.participants?.[0]?.name?.split(' ')[0] ?? '–'},
            {label:'Max Punkte', value:data?.participants?.[0]?.points ?? 0},
          ].map(s => (
            <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
              <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:28,fontWeight:900,color:'var(--accent)'}}>{s.value}</div>
              <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px',marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* DATA SOURCE TOGGLE */}
        <div className="card">
          <div className="card-title">Datenquelle</div>
          <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
            <div className="toggle-wrap" style={{maxWidth:320}}>
              <button className={`toggle-opt ${!isLive?'active':''}`} onClick={()=>toggleSource('manual')}>
                ✏️ Manuelle Eingabe
              </button>
              <button className={`toggle-opt ${isLive?'active':''}`} onClick={()=>toggleSource('live')}>
                🔴 Live API
              </button>
            </div>
            <span className={`badge ${isLive?'badge-live':'badge-manual'}`}>
              {isLive ? '● LIVE – API-Football' : '✏ Manuelle Eingabe aktiv'}
            </span>
            {isLive && (
              <button
                className="btn btn-green btn-sm"
                onClick={manualSync}
                disabled={syncing}
              >
                {syncing ? '⏳ Lädt…' : '🔄 Jetzt syncen'}
              </button>
            )}
          </div>
          {isLive && data?.results?.matchStatus && (
            <div style={{marginTop:12,display:'flex',gap:16,flexWrap:'wrap',fontSize:13}}>
              <span style={{color:'var(--muted)'}}>Status: <b style={{color:'var(--text)'}}>{data.results.matchStatus}</b></span>
              {data.results.liveScore && (
                <span style={{color:'var(--muted)'}}>Live: <b style={{color:'var(--accent)',fontFamily:'Barlow Condensed',fontSize:16}}>{data.results.liveScore.home}:{data.results.liveScore.away}</b></span>
              )}
              <span style={{color:'var(--muted)'}}>Zuletzt: {new Date(data.results.lastUpdated).toLocaleTimeString('de-DE')}</span>
            </div>
          )}
        </div>

        {/* INNER TABS */}
        <div style={{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:20,gap:0}}>
          {(['overview','resolve','codes','data'] as AdminTab[]).map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              padding:'10px 18px',fontSize:13,fontWeight:600,cursor:'pointer',
              color:tab===t?'var(--accent)':'var(--muted)',
              borderBottom:tab===t?'2px solid var(--accent)':'2px solid transparent',
              background:'transparent',border:'none',borderTop:'none',borderLeft:'none',borderRight:'none',
              fontFamily:'Barlow,sans-serif',marginBottom:'-1px',transition:'color .2s',
            }}>
              {t==='overview'?'📊 Übersicht':t==='resolve'?'✅ Auflösen':t==='codes'?'🎟 Codes':'📋 Daten'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <>
            <div className="card">
              <div className="card-title">🧪 Test-Teilnehmer</div>
              <p style={{fontSize:13,color:'var(--muted)',marginBottom:14}}>Füge Dummy-Teilnehmer hinzu um das System zu testen.</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {[1,5,10,30].map(n => (
                  <button key={n} className="btn btn-ghost btn-sm" onClick={()=>addBulkDemo(n)} disabled={loading}>
                    + {n} zufällige
                  </button>
                ))}
                <button className="btn btn-danger btn-sm" onClick={clearParticipants} disabled={loading}>
                  🗑 Teilnehmer löschen
                </button>
                <button className="btn btn-danger btn-sm" onClick={clearAll} disabled={loading}>
                  💣 Alles löschen
                </button>
              </div>
            </div>

            {/* TOP 10 preview */}
            {participantCount > 0 && (
              <div className="card">
                <div className="card-title">Top Teilnehmer</div>
                <div className="lb-row lb-header" style={{background:'transparent',border:'none',padding:'4px 16px'}}>
                  <div>#</div><div>Name</div>
                  <div style={{textAlign:'right'}}>Pkt</div>
                  <div style={{textAlign:'center'}}>✓</div>
                  <div style={{textAlign:'center'}}>Tipps</div>
                </div>
                {(data?.participants ?? []).slice(0,10).map((p,i) => (
                  <div key={p.id} className={`lb-row ${i===0?'gold':i===1?'silver':i===2?'bronze':''}`} style={{fontSize:14}}>
                    <div className="lb-rank" style={{fontSize:16}}>{i+1}</div>
                    <div className="lb-name" style={{fontSize:14}}>{p.name}</div>
                    <div className="lb-pts" style={{fontSize:18}}>{p.points}</div>
                    <div className="lb-correct" style={{fontSize:12}}>{p.correct}</div>
                    <div className="lb-q">{Object.keys(p.answers??{}).length}/8</div>
                  </div>
                ))}
                {participantCount > 10 && (
                  <p style={{fontSize:12,color:'var(--muted)',textAlign:'center',marginTop:8}}>
                    … und {participantCount-10} weitere
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* RESOLVE TAB */}
        {tab === 'resolve' && (
          <div className="card">
            <div className="card-title">Richtige Antworten eintragen</div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>
              {isLive ? 'Live-Modus aktiv – Antworten werden automatisch gesetzt. Du kannst trotzdem manuell überschreiben.' : 'Trage die korrekten Antworten ein. Punkte werden sofort neu berechnet.'}
            </p>
            {QUESTIONS.map(q => {
              const current = manualAnswers[q.id]
              const resolved = current != null && current !== ''
              return (
                <div key={q.id} style={{
                  background:'var(--surface2)', borderRadius:8, padding:14, marginBottom:10,
                  border:`1px solid ${resolved?'rgba(0,214,127,.3)':'var(--border)'}`,
                }}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                    <div>
                      <span style={{fontSize:11,color:'var(--muted)',fontWeight:600}}>F{q.id} · {q.points}Pkt</span>
                      <div style={{fontSize:15,fontWeight:600,marginTop:2}}>{q.text}</div>
                    </div>
                    {resolved && <span className="badge badge-resolved">✓ {current}</span>}
                  </div>

                  {q.type === 'score' && (
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                      <div className="score-wrap">
                        <input type="number" min={0} max={30} className="score-box" style={{width:52,fontSize:20}}
                          placeholder="0" value={manualAnswers[q.id]?.split(':')[0]??''}
                          onChange={e=>setManualAnswers(p=>({...p,[q.id]:e.target.value+':'+(p[q.id]?.split(':')[1]??'')}))}
                        />
                        <span className="score-colon">:</span>
                        <input type="number" min={0} max={30} className="score-box" style={{width:52,fontSize:20}}
                          placeholder="0" value={manualAnswers[q.id]?.split(':')[1]??''}
                          onChange={e=>setManualAnswers(p=>({...p,[q.id]:(p[q.id]?.split(':')[0]??'')+':'+e.target.value}))}
                        />
                      </div>
                      <button className="btn btn-green btn-sm" onClick={()=>setAnswer(q.id, manualAnswers[q.id]??'')} disabled={loading}>
                        ✓ Setzen
                      </button>
                    </div>
                  )}

                  {(q.type==='yn') && (
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                      <div className="option-grid" style={{flex:1}}>
                        {(q.options??[]).map(opt=>(
                          <button key={opt}
                            className={`option-btn ${manualAnswers[q.id]===opt?'selected':''}`}
                            onClick={()=>setAnswer(q.id,opt)} style={{fontSize:13,padding:'8px'}}
                          >{opt}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.type==='number' && (
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <input type="number" min={0} max={99} className="score-box" style={{width:70,fontSize:20}}
                        placeholder="0" value={manualAnswers[q.id]??''}
                        onChange={e=>setManualAnswers(p=>({...p,[q.id]:e.target.value}))}
                      />
                      <button className="btn btn-green btn-sm" onClick={()=>setAnswer(q.id, manualAnswers[q.id]??'')} disabled={loading}>
                        ✓ Setzen
                      </button>
                    </div>
                  )}

                  {q.type==='scorer' && (
                    <div>
                      <p style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>Mehrere Torschützen auswählbar — Gäste bekommen Punkte wenn ihr Tipp dabei ist.</p>
                      <div className="ms-grid" style={{marginBottom:8}}>
                        {(q.options??[]).filter(o=>o!=='Keiner').map(opt=>{
                          const sel = (manualAnswers[q.id]??'').split(',').map(s=>s.trim()).includes(opt)
                          return (
                            <button key={opt}
                              className={`ms-btn ${sel?'selected':''}`}
                              style={{fontSize:12,padding:'6px 10px'}}
                              onClick={()=>{
                                const cur=(manualAnswers[q.id]??'').split(',').filter(Boolean)
                                const next=cur.includes(opt)?cur.filter(v=>v!==opt):[...cur,opt]
                                setManualAnswers(p=>({...p,[q.id]:next.join(',')}))
                              }}
                            >{opt}</button>
                          )
                        })}
                        <button
                          className={`ms-btn ${(manualAnswers[q.id]??'')==='Keiner'?'selected':''}`}
                          style={{fontSize:12,padding:'6px 10px',fontStyle:'italic'}}
                          onClick={()=>setManualAnswers(p=>({...p,[q.id]:'Keiner'}))}
                        >Keiner</button>
                      </div>
                      <button className="btn btn-green btn-sm" onClick={()=>setAnswer(q.id, manualAnswers[q.id]??'')} disabled={loading}>
                        ✓ Setzen
                      </button>
                    </div>
                  )}

                  {q.type==='minute' && (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <input type="number" min={1} max={120} className="score-box" style={{width:70,fontSize:20}}
                          placeholder="23"
                          value={manualAnswers[q.id]==='Kein Tor' ? '' : (manualAnswers[q.id]??'')}
                          disabled={manualAnswers[q.id]==='Kein Tor'}
                          onChange={e=>setManualAnswers(p=>({...p,[q.id]:e.target.value}))}
                        />
                        <span style={{fontSize:13,color:'var(--muted)'}}>. Minute</span>
                        <button className="btn btn-green btn-sm" onClick={()=>setAnswer(q.id, manualAnswers[q.id]??'')} disabled={loading}>
                          ✓ Setzen
                        </button>
                      </div>
                      <button
                        className={`option-btn ${manualAnswers[q.id]==='Kein Tor'?'selected':''}`}
                        style={{maxWidth:160,fontSize:13,padding:'7px'}}
                        onClick={()=>{
                          const next = manualAnswers[q.id]==='Kein Tor' ? '' : 'Kein Tor'
                          setManualAnswers(p=>({...p,[q.id]:next}))
                          if(next==='Kein Tor') setAnswer(q.id,'Kein Tor')
                        }}
                      >Kein Tor im Spiel</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* CODES TAB */}
        {tab === 'codes' && (
          <>
            <div className="card">
              <div className="card-title">🎟 Teilnahme-Codes</div>
              <p style={{fontSize:13,color:'var(--muted)',marginBottom:14}}>
                Jeder Gast braucht einen einmaligen Code um teilzunehmen. Wenn keine Codes hinterlegt sind, ist die Teilnahme offen für alle.
              </p>
              <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>generateCodes(50)}>✨ 50 Codes generieren</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>generateCodes(100)}>✨ 100 Codes generieren</button>
                <button className="btn btn-ghost btn-sm" onClick={()=>generateCodes(300)}>✨ 300 Codes generieren</button>
              </div>
              <textarea
                className="form-input"
                style={{minHeight:200,fontFamily:'monospace',fontSize:13,letterSpacing:'1px'}}
                placeholder={'Code pro Zeile, z.B.:\nTIGER42\nLION99\nEAGLE01'}
                value={codesText}
                onChange={e=>setCodesText(e.target.value)}
              />
              <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap',alignItems:'center'}}>
                <button className="btn btn-primary" onClick={saveCodes} disabled={loading}>
                  💾 Codes speichern
                </button>
                <button className="btn btn-danger btn-sm" onClick={resetUsedCodes}>
                  🔄 Verwendete zurücksetzen
                </button>
                <span style={{fontSize:12,color:'var(--muted)'}}>
                  {codesText.split('\n').filter(Boolean).length} Codes · {data?.usedCodes?.length ?? 0} verwendet
                </span>
              </div>
            </div>
            {(data?.codes?.length ?? 0) > 0 && (
              <div className="card">
                <div className="card-title">Status</div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:13}}>
                  <span style={{color:'var(--muted)'}}>Gesamt: <b style={{color:'var(--text)'}}>{data?.codes?.length}</b></span>
                  <span style={{color:'var(--muted)'}}>Verwendet: <b style={{color:'var(--accent)'}}>{data?.usedCodes?.length ?? 0}</b></span>
                  <span style={{color:'var(--muted)'}}>Verfügbar: <b style={{color:'var(--green)'}}>{(data?.codes?.length ?? 0) - (data?.usedCodes?.length ?? 0)}</b></span>
                </div>
                <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6,maxHeight:200,overflowY:'auto'}}>
                  {data?.codes?.map(c => (
                    <span key={c} style={{
                      padding:'3px 10px', borderRadius:20, fontFamily:'monospace', fontSize:12, fontWeight:700,
                      background: data?.usedCodes?.includes(c) ? 'rgba(221,0,0,.1)' : 'var(--green-dim)',
                      color: data?.usedCodes?.includes(c) ? '#ff6060' : 'var(--green)',
                      border: `1px solid ${data?.usedCodes?.includes(c) ? 'rgba(221,0,0,.3)' : 'rgba(0,214,127,.3)'}`,
                      textDecoration: data?.usedCodes?.includes(c) ? 'line-through' : 'none',
                    }}>{c}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* DATA TAB */}
        {tab === 'data' && (
          <div className="card">
            <div className="card-title">Rohdaten ({participantCount} Teilnehmer)</div>
            <div style={{overflowX:'auto',fontSize:12}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
                <thead>
                  <tr style={{color:'var(--muted)',borderBottom:'1px solid var(--border)'}}>
                    <th style={{padding:'6px 8px',textAlign:'left'}}>Name</th>
                    <th style={{padding:'6px 8px',textAlign:'center'}}>Pkt</th>
                    <th style={{padding:'6px 8px',textAlign:'center'}}>✓</th>
                    {QUESTIONS.map(q=><th key={q.id} style={{padding:'6px 8px',textAlign:'center'}}>F{q.id}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {(data?.participants??[]).map(p=>(
                    <tr key={p.id} style={{borderTop:'1px solid var(--border)'}}>
                      <td style={{padding:'6px 8px',fontWeight:500}}>{p.name}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',color:'var(--accent)',fontWeight:700}}>{p.points}</td>
                      <td style={{padding:'6px 8px',textAlign:'center',color:'var(--green)'}}>{p.correct}</td>
                      {QUESTIONS.map(q=>(
                        <td key={q.id} style={{padding:'6px 8px',textAlign:'center',color:'var(--muted)',maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {p.answers?.[q.id]??'–'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {participantCount===0 && <p style={{color:'var(--muted)',padding:16}}>Keine Daten</p>}
            </div>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
