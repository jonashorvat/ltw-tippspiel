'use client'
// app/guest/page.tsx
import { useState, useCallback } from 'react'
import { QUESTIONS } from '@/lib/types'

type Step = 'name' | 'form' | 'done'

const DEMO_NAMES = ['Maxim','Lena','Tom','Sarah','Kevin','Anna','Florian','Maria','Ben','Julia','Chris','Laura','David','Eva','Nico','Mia','Jan','Sophie','Felix','Hannah']

function randomAnswer(q: typeof QUESTIONS[0]): string {
  if (q.type === 'score') {
    return `${Math.floor(Math.random()*6)}:${Math.floor(Math.random()*4)}`
  }
  if (q.type === 'yn') {
    return Math.random() > 0.5 ? 'Ja' : 'Nein'
  }
  if (q.type === 'number') {
    if (q.id === 5) return String(Math.floor(Math.random()*8)+1)
    if (q.id === 6) return String(Math.floor(Math.random()*15)+8)
    return String(Math.floor(Math.random()*10))
  }
  if (q.type === 'multiselect') {
    const opts = q.options ?? []
    const count = Math.floor(Math.random()*3)+1
    const shuffled = [...opts].sort(() => Math.random()-.5)
    return shuffled.slice(0,count).join(',')
  }
  return ''
}

export default function GuestPage() {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [answers, setAnswers] = useState<Record<number,string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submittedName, setSubmittedName] = useState('')

  const setAnswer = (id: number, val: string) => setAnswers(prev => ({ ...prev, [id]: val }))

  const toggleMulti = (id: number, val: string) => {
    const current = (answers[id] ?? '').split(',').filter(Boolean)
    const idx = current.indexOf(val)
    const next = idx >= 0 ? current.filter(v => v !== val) : [...current, val]
    setAnswer(id, next.join(','))
  }

  const randomizeAll = () => {
    const all: Record<number,string> = {}
    QUESTIONS.forEach(q => { all[q.id] = randomAnswer(q) })
    setAnswers(all)
  }

  const randomizeSingle = (q: typeof QUESTIONS[0]) => {
    setAnswer(q.id, randomAnswer(q))
  }

  const handleStart = () => {
    if (!name.trim()) { setError('Bitte gib deinen Namen ein.'); return }
    setError('')
    setStep('form')
  }

  const handleSubmit = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), answers }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Fehler beim Absenden'); setLoading(false); return }
      setSubmittedName(name.trim())
      setStep('done')
    } catch {
      setError('Netzwerkfehler – bitte nochmal versuchen.')
    }
    setLoading(false)
  }

  const reset = () => {
    setStep('name'); setName(''); setAnswers({}); setError(''); setSubmittedName('')
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* NAV */}
      <nav className="topnav">
        <div className="nav-logo">
          <span className="nav-logo-text">LightTheWorld</span>
          <div className="nav-logo-divider" />
          <span className="nav-logo-sub">TIPP<span>SPIEL</span></span>
        </div>
        <a href="/leaderboard" className="btn btn-ghost btn-sm">🏆 Rangliste</a>
      </nav>

      {/* MATCH HEADER */}
      <div className="match-header">
        <div className="match-teams-row">
          <div style={{textAlign:'center'}}>
            <div className="match-flag">🇩🇪</div>
            <div className="match-teamname">Deutschland</div>
          </div>
          <div className="match-vs">VS</div>
          <div style={{textAlign:'center'}}>
            <div className="match-flag">🇨🇼</div>
            <div className="match-teamname">Curaçao</div>
          </div>
        </div>
      </div>

      <div className="container" style={{paddingTop:24}}>
        {/* NAME STEP */}
        {step === 'name' && (
          <div className="card">
            <div className="card-title">👤 Dein Name</div>
            <div className="form-group">
              <label className="form-label">Wie heißt du?</label>
              <input
                className="form-input"
                placeholder="Vorname reicht"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key==='Enter' && handleStart()}
                autoFocus
              />
            </div>
            {error && <p style={{color:'#ff6060',fontSize:13,marginBottom:12}}>{error}</p>}
            <button className="btn btn-primary btn-block" onClick={handleStart}>
              Weiter zu den Fragen →
            </button>
            <div style={{marginTop:12,display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const n = DEMO_NAMES[Math.floor(Math.random()*DEMO_NAMES.length)]+' '+(Math.floor(Math.random()*99)+1)
                setName(n)
              }}>🎲 Zufallsname</button>
            </div>
          </div>
        )}

        {/* FORM STEP */}
        {step === 'form' && (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
              <div style={{fontSize:18,fontWeight:600}}>Hey {name}! 👋</div>
              <button className="btn btn-ghost btn-sm" onClick={randomizeAll}>
                🎲 Alle zufällig tippen
              </button>
            </div>

            {QUESTIONS.map((q) => (
              <div className="card" key={q.id} style={{marginBottom:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <div style={{fontSize:11,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>
                      Frage {q.id} · {q.points} Punkt{q.points!==1?'e':''}
                      {q.pointsPartial ? ` (Tendenz: ${q.pointsPartial} Pkt)` : ''}
                    </div>
                    <div style={{fontSize:16,fontWeight:600}}>{q.text}</div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{marginLeft:8,flexShrink:0}}
                    onClick={() => randomizeSingle(q)}
                    title="Zufällig tippen"
                  >🎲</button>
                </div>

                {/* SCORE */}
                {q.type === 'score' && (
                  <div className="score-wrap">
                    <input
                      type="number" min={0} max={30} className="score-box"
                      placeholder="0"
                      value={answers[q.id]?.split(':')[0] ?? ''}
                      onChange={e => {
                        const b = answers[q.id]?.split(':')[1] ?? ''
                        setAnswer(q.id, e.target.value+':'+b)
                      }}
                    />
                    <span className="score-colon">:</span>
                    <input
                      type="number" min={0} max={30} className="score-box"
                      placeholder="0"
                      value={answers[q.id]?.split(':')[1] ?? ''}
                      onChange={e => {
                        const a = answers[q.id]?.split(':')[0] ?? ''
                        setAnswer(q.id, a+':'+e.target.value)
                      }}
                    />
                    <span style={{fontSize:13,color:'var(--muted)',marginLeft:4}}>🇩🇪 : 🇨🇼</span>
                  </div>
                )}

                {/* YN / RADIO */}
                {q.type === 'yn' && (
                  <div className="option-grid">
                    {(q.options ?? []).map(opt => (
                      <button
                        key={opt}
                        className={`option-btn ${answers[q.id]===opt ? 'selected' : ''}`}
                        onClick={() => setAnswer(q.id, opt)}
                      >{opt}</button>
                    ))}
                  </div>
                )}

                {/* NUMBER */}
                {q.type === 'number' && (
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <input
                      type="number" min={0} max={50} className="score-box"
                      placeholder="0"
                      value={answers[q.id] ?? ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                    />
                    {q.tolerance && (
                      <span style={{fontSize:12,color:'var(--muted)'}}>±{q.tolerance} = {q.pointsPartial} Pkt</span>
                    )}
                  </div>
                )}

                {/* MULTISELECT */}
                {q.type === 'multiselect' && (
                  <div className="ms-grid">
                    {(q.options ?? []).map(opt => {
                      const sel = (answers[q.id] ?? '').split(',').includes(opt)
                      return (
                        <button
                          key={opt}
                          className={`ms-btn ${sel ? 'selected' : ''}`}
                          onClick={() => toggleMulti(q.id, opt)}
                        >{opt}</button>
                      )
                    })}
                  </div>
                )}

                {answers[q.id] && (
                  <div style={{marginTop:8,fontSize:12,color:'var(--green)'}}>
                    ✓ {q.type==='multiselect' ? answers[q.id].split(',').join(', ') : answers[q.id]}
                  </div>
                )}
              </div>
            ))}

            {error && <p style={{color:'#ff6060',fontSize:13,marginBottom:12}}>{error}</p>}

            <button
              className="btn btn-primary btn-block"
              style={{padding:'14px',fontSize:16,marginBottom:20}}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Wird gesendet…' : '✅ Tipps abschicken'}
            </button>
          </>
        )}

        {/* DONE STEP */}
        {step === 'done' && (
          <div style={{textAlign:'center',padding:'48px 16px'}}>
            <div style={{fontSize:64,marginBottom:16}}>🎉</div>
            <h1 style={{fontSize:36,marginBottom:8}}>Tipp abgegeben!</h1>
            <p style={{color:'var(--muted)',fontSize:15,marginBottom:24}}>
              Viel Glück, {submittedName}!<br />
              Verfolge die Rangliste live auf dem Bildschirm.
            </p>
            <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
              <a href="/leaderboard" className="btn btn-primary">🏆 Zur Rangliste</a>
              <button className="btn btn-ghost" onClick={reset}>Nächster Teilnehmer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
