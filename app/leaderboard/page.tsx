'use client'
// app/leaderboard/page.tsx
import { useState, useEffect, useCallback } from 'react'
import type { Participant, MatchResult } from '@/lib/types'
import { QUESTIONS } from '@/lib/types'

interface ApiData {
  participants: Participant[]
  results: MatchResult
}

const STATUS_LABEL: Record<string, string> = {
  NS: 'Nicht gestartet', '1H': '1. Halbzeit', HT: 'Halbzeit', '2H': '2. Halbzeit',
  FT: 'Abgepfiffen', ET: 'Verlängerung', P: 'Elfmeterschießen',
}

const PRIZES: Record<number, { emoji: string; label: string; color: string; border: string; bg: string }> = {
  1: { emoji: '🧥', label: 'Pulli',         color: '#FFD700', border: 'rgba(255,215,0,.5)',   bg: 'rgba(255,215,0,.12)' },
  2: { emoji: '👕', label: 'Shirt',          color: '#C0C0D8', border: 'rgba(192,192,216,.5)', bg: 'rgba(192,192,216,.1)' },
  3: { emoji: '🧦', label: 'Socken',         color: '#CD7F32', border: 'rgba(205,127,50,.5)',  bg: 'rgba(205,127,50,.1)' },
  4: { emoji: '🏷️', label: '50% Rabatt',    color: '#00d67f', border: 'rgba(0,214,127,.4)',   bg: 'rgba(0,214,127,.1)' },
  5: { emoji: '🏷️', label: '25% Rabatt',    color: '#00d67f', border: 'rgba(0,214,127,.3)',   bg: 'rgba(0,214,127,.08)' },
}
  const [data, setData] = useState<ApiData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [myName, setMyName] = useState<string>('')

  // Load saved name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tippspiel_name')
    if (saved) setMyName(saved)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/results', { cache: 'no-store' })
      if (res.ok) {
        setData(await res.json())
        setLastUpdate(new Date())
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const resolved = QUESTIONS.filter(q => data?.results?.answers?.[q.id] != null).length
  const total = QUESTIONS.length
  const participants = data?.participants ?? []
  const liveScore = data?.results?.liveScore
  const matchStatus = data?.results?.matchStatus
  const statusLabel = matchStatus ? STATUS_LABEL[matchStatus] ?? matchStatus : 'Warte auf Spiel...'

  // Find own rank
  const myRank = myName ? participants.findIndex(p => p.name.toLowerCase() === myName.toLowerCase()) : -1
  const myParticipant = myRank >= 0 ? participants[myRank] : null

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <nav className="topnav">
        <div className="nav-logo">
          <span className="nav-logo-text">LightTheWorld</span>
          <div className="nav-logo-divider" />
          <span className="nav-logo-sub">LIVE <span>RANGLISTE</span></span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {matchStatus && ['1H','2H','ET'].includes(matchStatus) && (
            <><div className="live-dot"/><span style={{fontSize:12,color:'var(--muted)'}}>Live</span></>
          )}
          {lastUpdate && (
            <span style={{fontSize:11,color:'var(--muted)'}}>
              {lastUpdate.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
          )}
        </div>
      </nav>

      {/* MATCH STATUS BAR */}
      <div className="match-header" style={{padding:'16px 16px 14px'}}>
        <div className="match-teams-row" style={{marginBottom:6}}>
          <div style={{textAlign:'center'}}>
            <div className="match-flag">🇩🇪</div>
            <div className="match-teamname">Deutschland</div>
          </div>
          {liveScore ? (
            <div className="match-live-score">{liveScore.home} : {liveScore.away}</div>
          ) : (
            <div className="match-vs">VS</div>
          )}
          <div style={{textAlign:'center'}}>
            <div className="match-flag">🇨🇼</div>
            <div className="match-teamname">Curaçao</div>
          </div>
        </div>
        <div className="match-status-row">
          {['1H','2H','ET'].includes(matchStatus ?? '') && <div className="live-dot" />}
          <span>{statusLabel}</span>
          <span>·</span>
          <span>{participants.length} Teilnehmer</span>
          <span>·</span>
          <span>{resolved}/{total} Fragen aufgelöst</span>
        </div>
      </div>

      {/* MY POSITION BANNER — shown when own name is saved */}
      {myParticipant && (
        <div style={{
          background:'linear-gradient(135deg,rgba(255,206,0,.18),rgba(255,206,0,.06))',
          borderBottom:'1px solid rgba(255,206,0,.3)',
          padding:'12px 20px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexWrap:'wrap', gap:8,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:20}}>👤</span>
            <div>
              <div style={{fontSize:12,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px'}}>Deine Position</div>
              <div style={{fontWeight:700,fontSize:16}}>{myParticipant.name}</div>
            </div>
          </div>
          <div style={{display:'flex',gap:20,alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:28,fontWeight:900,color:'var(--accent)',lineHeight:1}}>{myParticipant.points}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>Punkte</div>
            </div>
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:'Barlow Condensed,sans-serif',fontSize:28,fontWeight:900,lineHeight:1}}>#{myRank+1}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>Platz</div>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS */}
      <div style={{padding:'12px 16px 0',maxWidth:700,margin:'0 auto'}}>
        <div className="progress-bar">
          <div className="progress-fill" style={{width:`${(resolved/total)*100}%`}} />
        </div>
        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
          {QUESTIONS.map(q => (
            <span key={q.id} style={{
              fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:600,
              background: data?.results?.answers?.[q.id] != null ? 'var(--green-dim)' : 'var(--surface)',
              color: data?.results?.answers?.[q.id] != null ? 'var(--green)' : 'var(--muted)',
              border: `1px solid ${data?.results?.answers?.[q.id] != null ? 'rgba(0,214,127,.3)' : 'var(--border)'}`,
            }}>F{q.id}</span>
          ))}
        </div>
      </div>

      {/* LEADERBOARD */}
      <div style={{maxWidth:700,margin:'16px auto',padding:'0 16px 40px'}}>
        {participants.length === 0 ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'var(--muted)'}}>
            <div style={{fontSize:40,marginBottom:12}}>⏳</div>
            <div style={{fontSize:16}}>Noch keine Tipps abgegeben</div>
          </div>
        ) : (
          <>
            <div className="lb-row lb-header" style={{background:'transparent',border:'none',padding:'4px 16px'}}>
              <div>#</div><div>Name</div>
              <div style={{textAlign:'right'}}>Punkte</div>
              <div style={{textAlign:'center'}}>Richtig</div>
              <div style={{textAlign:'center'}}>Tipps</div>
            </div>
            {participants.map((p, i) => {
              const isMe = myName && p.name.toLowerCase() === myName.toLowerCase()
              const rankClass = i===0?'gold':i===1?'silver':i===2?'bronze':''
              const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
              const answeredCount = Object.keys(p.answers ?? {}).length
              const prize = PRIZES[i+1]
              return (
                <div key={p.id} className={`lb-row ${rankClass}`} style={isMe ? {
                  border:'2px solid var(--accent)',
                  background:'linear-gradient(135deg,rgba(255,206,0,.2),rgba(255,206,0,.08))',
                  transform:'scale(1.02)',
                  boxShadow:'0 0 20px rgba(255,206,0,.15)',
                } : prize ? {
                  background: prize.bg,
                  borderColor: prize.border,
                } : {}}>
                  <div className="lb-rank">{medal ?? (i+1)}</div>
                  <div className="lb-name" style={{display:'flex',flexDirection:'column',gap:3}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      {p.name}
                      {isMe && <span style={{fontSize:11,color:'var(--accent)',fontWeight:700}}>← DU</span>}
                    </div>
                    {prize && (
                      <span style={{
                        display:'inline-flex',alignItems:'center',gap:4,
                        fontSize:11,fontWeight:700,
                        color: prize.color,
                        background: prize.bg,
                        border:`1px solid ${prize.border}`,
                        borderRadius:20,padding:'1px 8px',
                        width:'fit-content',
                      }}>
                        {prize.emoji} {prize.label}
                      </span>
                    )}
                  </div>
                  <div className="lb-pts">{p.points}</div>
                  <div className="lb-correct">{p.correct}✓</div>
                  <div className="lb-q">{answeredCount}/10</div>
                </div>
              )
            })}
          </>
        )}

        {/* PRIZES LEGEND */}
        <div style={{marginTop:24,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 20px'}}>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--muted)',marginBottom:12}}>🎁 Preise</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {Object.entries(PRIZES).map(([rank, prize]) => (
              <div key={rank} style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{
                  fontFamily:'Barlow Condensed,sans-serif',fontWeight:900,fontSize:16,
                  width:24,textAlign:'center',color:prize.color,
                }}>{rank === '1' ? '🥇' : rank === '2' ? '🥈' : rank === '3' ? '🥉' : `#${rank}`}</span>
                <span style={{fontSize:13,fontWeight:600,color:prize.color}}>{prize.emoji} {prize.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
