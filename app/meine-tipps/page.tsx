'use client'
// app/meine-tipps/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { QUESTIONS } from '@/lib/types'
import type { Participant, MatchResult } from '@/lib/types'

interface ApiData {
  participants: Participant[]
  results: MatchResult
}

function getStatus(qId: number, answer: string, result: string | null | undefined): 'pending' | 'correct' | 'partial' | 'wrong' {
  if (result === null || result === undefined) return 'pending'
  const q = QUESTIONS.find(q => q.id === qId)
  if (!q) return 'wrong'

  if (q.type === 'score') {
    const norm = (s: string) => s.replace(/\s/g, '')
    if (norm(answer) === norm(result)) return 'correct'
    const [ra, rb] = result.split(':').map(Number)
    const [aa, ab] = answer.split(':').map(Number)
    if (!isNaN(ra) && !isNaN(aa)) {
      const rT = ra > rb ? 1 : ra < rb ? -1 : 0
      const aT = aa > ab ? 1 : aa < ab ? -1 : 0
      if (rT === aT) return 'partial'
    }
    return 'wrong'
  }

  if (q.type === 'number') {
    const r = parseInt(result), a = parseInt(answer)
    if (!isNaN(r) && !isNaN(a)) {
      if (r === a) return 'correct'
      if (Math.abs(r - a) <= (q.tolerance ?? 0)) return 'partial'
    }
    return 'wrong'
  }

  if (q.type === 'scorer') {
    const scorers = result.split(',').map(s => s.trim()).filter(Boolean)
    const noGoal = scorers.length === 0 || (scorers.length === 1 && scorers[0] === 'Keiner')
    if (answer === 'Keiner' && noGoal) return 'correct'
    if (answer !== 'Keiner' && scorers.includes(answer)) return 'correct'
    return 'wrong'
  }

  if (q.type === 'minute') {
    if (result === 'Kein Tor' && answer === 'Kein Tor') return 'correct'
    if (result !== 'Kein Tor' && answer !== 'Kein Tor') {
      const r = parseInt(result), a = parseInt(answer)
      if (!isNaN(r) && !isNaN(a)) {
        if (r === a) return 'correct'
        if (Math.abs(r - a) <= (q.tolerance ?? 5)) return 'partial'
      }
    }
    return 'wrong'
  }

  // yn
  if (answer.trim().toLowerCase() === result.trim().toLowerCase()) return 'correct'
  return 'wrong'
}

function getPointsEarned(qId: number, answer: string, result: string | null | undefined): number {
  if (!result) return 0
  const q = QUESTIONS.find(q => q.id === qId)
  if (!q) return 0
  const status = getStatus(qId, answer, result)
  if (status === 'correct') return q.id === 10 && result === 'Kein Tor' ? 4 : q.points
  if (status === 'partial') return q.pointsPartial ?? 0
  return 0
}

function formatResult(qId: number, result: string | null | undefined): string {
  if (result === null || result === undefined) return '–'
  const q = QUESTIONS.find(q => q.id === qId)
  if (!q) return result
  if (q.type === 'minute' && result !== 'Kein Tor') return result + '. Min'
  if (q.type === 'number' && qId === 9) return result + '%'
  return result
}

function formatAnswer(qId: number, answer: string): string {
  if (!answer) return '–'
  const q = QUESTIONS.find(q => q.id === qId)
  if (!q) return answer
  if (q.type === 'minute' && answer !== 'Kein Tor') return answer + '. Min'
  if (q.type === 'number' && qId === 9) return answer + '%'
  return answer
}

const STATUS_ICON: Record<string, string> = {
  correct: '✅',
  partial: '🟡',
  wrong: '❌',
  pending: '⏳',
}

const STATUS_COLOR: Record<string, string> = {
  correct: 'var(--green)',
  partial: '#FFCE00',
  wrong: '#ff6060',
  pending: 'var(--muted)',
}

export default function MeineTippsPage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [myName, setMyName] = useState<string>('')
  const [nameInput, setNameInput] = useState<string>('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('tippspiel_name')
    if (saved) setMyName(saved)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/results', { cache: 'no-store' })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const me = data?.participants?.find(p => p.name.toLowerCase() === myName.toLowerCase())
  const myRank = data?.participants ? data.participants.findIndex(p => p.name.toLowerCase() === myName.toLowerCase()) + 1 : 0
  const results = data?.results?.answers ?? {}
  const resolvedCount = QUESTIONS.filter(q => results[q.id] != null).length

  const handleSearch = () => {
    if (!nameInput.trim()) return
    setMyName(nameInput.trim())
    localStorage.setItem('tippspiel_name', nameInput.trim())
    setSearching(false)
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)'}}>
      <nav className="topnav">
        <div className="nav-logo">
          <span className="nav-logo-text">LightTheWorld</span>
          <div className="nav-logo-divider" />
          <span className="nav-logo-sub">MEINE <span>TIPPS</span></span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <a href="/leaderboard" className="btn btn-ghost btn-sm">🏆 Rangliste</a>
        </div>
      </nav>

      <div className="container" style={{paddingTop:24}}>

        {/* NAME NOT SET */}
        {(!myName || searching) && (
          <div className="card">
            <div className="card-title">👤 Wer bist du?</div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:14}}>
              Gib deinen Namen ein um deine Tipps und Punkte zu sehen.
            </p>
            <div style={{display:'flex',gap:8}}>
              <input
                className="form-input"
                placeholder="Dein Name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleSearch()}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleSearch}>Suchen</button>
            </div>
          </div>
        )}

        {/* NAME SET BUT NOT FOUND */}
        {myName && !searching && !me && data && (
          <div className="card" style={{textAlign:'center',padding:'32px 20px'}}>
            <div style={{fontSize:40,marginBottom:12}}>🔍</div>
            <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>"{myName}" nicht gefunden</div>
            <p style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>
              Hast du schon einen Tipp abgegeben?
            </p>
            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
              <a href="/guest" className="btn btn-primary btn-sm">Jetzt tippen</a>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearching(true); setNameInput('') }}>
                Anderen Namen suchen
              </button>
            </div>
          </div>
        )}

        {/* FOUND — show tips */}
        {myName && !searching && me && (
          <>
            {/* HEADER */}
            <div className="card" style={{marginBottom:16}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontSize:13,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>Deine Auswertung</div>
                  <div style={{fontSize:24,fontWeight:700}}>{me.name}</div>
                </div>
                <div style={{display:'flex',gap:16}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:36,fontWeight:900,color:'var(--accent)',lineHeight:1}}>{me.points}</div>
                    <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>Punkte</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:36,fontWeight:900,lineHeight:1}}>#{myRank}</div>
                    <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>Platz</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:36,fontWeight:900,color:'var(--green)',lineHeight:1}}>{me.correct}</div>
                    <div style={{fontSize:11,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>Richtig</div>
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div style={{marginTop:16}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginBottom:6}}>
                  <span>{resolvedCount} von {QUESTIONS.length} Fragen aufgelöst</span>
                  <span>{me.points} / 55 Punkte</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${(me.points/55)*100}%`}} />
                </div>
              </div>
            </div>

            {/* LEGEND */}
            <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
              {(['correct','partial','wrong','pending'] as const).map(s => (
                <span key={s} style={{fontSize:12,color:'var(--muted)',display:'flex',alignItems:'center',gap:4}}>
                  {STATUS_ICON[s]} {s==='correct'?'Richtig':s==='partial'?'Teilpunkte':s==='wrong'?'Falsch':'Ausstehend'}
                </span>
              ))}
            </div>

            {/* QUESTIONS TABLE */}
            {QUESTIONS.map(q => {
              const answer = me.answers?.[q.id]
              const result = results[q.id]
              const status = answer ? getStatus(q.id, answer, result) : 'pending'
              const earned = answer ? getPointsEarned(q.id, answer, result) : 0
              const isPending = result === null || result === undefined

              return (
                <div key={q.id} className="card" style={{
                  marginBottom:10,
                  borderColor: isPending ? 'var(--border)' : STATUS_COLOR[status] === 'var(--muted)' ? 'var(--border)' : `${STATUS_COLOR[status]}44`,
                  background: isPending ? 'var(--surface)' : status === 'correct' ? 'rgba(0,214,127,.05)' : status === 'partial' ? 'rgba(255,206,0,.05)' : status === 'wrong' ? 'rgba(255,96,96,.05)' : 'var(--surface)',
                  padding:'14px 16px',
                }}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'start'}}>
                    <div>
                      <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>
                        Frage {q.id} · max. {q.id === 10 ? 6 : q.points} Pkt
                      </div>
                      <div style={{fontSize:15,fontWeight:600,marginBottom:10}}>{q.text}</div>

                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        <div style={{background:'var(--surface2)',borderRadius:8,padding:'8px 12px'}}>
                          <div style={{fontSize:10,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>Dein Tipp</div>
                          <div style={{fontSize:14,fontWeight:600,color: answer ? 'var(--text)' : 'var(--muted)'}}>
                            {answer ? formatAnswer(q.id, answer) : '–'}
                          </div>
                        </div>
                        <div style={{background:'var(--surface2)',borderRadius:8,padding:'8px 12px'}}>
                          <div style={{fontSize:10,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>Ergebnis</div>
                          <div style={{fontSize:14,fontWeight:600,color: isPending ? 'var(--muted)' : 'var(--text)'}}>
                            {isPending ? '⏳ Offen' : formatResult(q.id, result)}
                          </div>
                        </div>
                      </div>

                      {/* Scorer: show all actual scorers */}
                      {q.type === 'scorer' && !isPending && result && result !== 'Keiner' && (
                        <div style={{marginTop:8,fontSize:12,color:'var(--muted)'}}>
                          Torschützen: {result.split(',').join(', ')}
                        </div>
                      )}

                      {/* Partial points explanation */}
                      {status === 'partial' && (
                        <div style={{marginTop:8,fontSize:12,color:'#FFCE00'}}>
                          🟡 {q.type==='score' ? 'Tendenz richtig' : `±${q.tolerance} Toleranz`} → +{q.pointsPartial} Pkt
                        </div>
                      )}
                    </div>

                    {/* POINTS BADGE */}
                    <div style={{
                      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                      minWidth:52,padding:'8px',borderRadius:10,
                      background: isPending ? 'var(--surface2)' : status==='correct' ? 'rgba(0,214,127,.15)' : status==='partial' ? 'rgba(255,206,0,.15)' : 'rgba(255,96,96,.1)',
                      border: `1px solid ${isPending ? 'var(--border)' : STATUS_COLOR[status]+'44'}`,
                    }}>
                      <div style={{fontSize:22,lineHeight:1}}>{STATUS_ICON[status]}</div>
                      <div style={{
                        fontFamily:'Barlow Condensed,sans-serif',fontSize:22,fontWeight:900,
                        color: isPending ? 'var(--muted)' : STATUS_COLOR[status],
                        lineHeight:1,marginTop:4,
                      }}>
                        {isPending ? '?' : `+${earned}`}
                      </div>
                      <div style={{fontSize:10,color:'var(--muted)'}}>Pkt</div>
                    </div>
                  </div>
                </div>
              )
            })}

            <button className="btn btn-ghost btn-sm" style={{marginTop:8}} onClick={() => { setSearching(true); setNameInput('') }}>
              Anderen Teilnehmer suchen
            </button>
          </>
        )}
      </div>
    </div>
  )
}
