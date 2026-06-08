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

export default function LeaderboardPage() {
  const [data, setData] = useState<ApiData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

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
              Aktualisiert {lastUpdate.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
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
            <div className="match-live-score">
              {liveScore.home} : {liveScore.away}
            </div>
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
              const rankClass = i===0?'gold':i===1?'silver':i===2?'bronze':''
              const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':null
              const answeredCount = Object.keys(p.answers ?? {}).length
              return (
                <div key={p.id} className={`lb-row ${rankClass}`}>
                  <div className="lb-rank">{medal ?? (i+1)}</div>
                  <div className="lb-name">{p.name}</div>
                  <div className="lb-pts">{p.points}</div>
                  <div className="lb-correct">{p.correct}✓</div>
                  <div className="lb-q">{answeredCount}/8</div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
