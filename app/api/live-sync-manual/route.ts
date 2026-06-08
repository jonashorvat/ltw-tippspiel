// app/api/live-sync-manual/route.ts
// Manually triggered from Admin panel — no cron needed
import { NextRequest, NextResponse } from 'next/server'
import { getResults, saveResults, getParticipants, saveParticipants, getDataSource } from '@/lib/kv'
import { fetchLiveData } from '@/lib/apifootball'
import { calcPoints } from '@/lib/types'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'ltw-admin-2024'

export async function POST(req: NextRequest) {
  const key = req.headers.get('x-admin-key')
  if (key !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const source = await getDataSource()
  if (source !== 'live') {
    return NextResponse.json({ ok: false, error: 'Datenquelle ist nicht auf Live gestellt' })
  }

  const liveData = await fetchLiveData()
  if (!liveData) {
    return NextResponse.json({ ok: false, error: 'Keine Live-Daten verfügbar – API Key oder Match-ID prüfen' })
  }

  const existing = await getResults()
  const merged = {
    ...existing,
    source: 'live' as const,
    answers: { ...existing.answers, ...liveData.answers },
    matchStatus: liveData.matchStatus,
    liveScore: liveData.liveScore,
    halfScore: liveData.halfScore,
    lastUpdated: Date.now(),
  }
  await saveResults(merged)

  // Recalc all participants
  const participants = await getParticipants()
  const updated = participants.map(p => {
    const { points, correct } = calcPoints(p.answers, merged.answers)
    return { ...p, points, correct }
  })
  await saveParticipants(updated)

  return NextResponse.json({
    ok: true,
    matchStatus: liveData.matchStatus,
    liveScore: liveData.liveScore,
    answersUpdated: Object.keys(liveData.answers),
  })
}
