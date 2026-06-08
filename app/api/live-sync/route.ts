// app/api/live-sync/route.ts
// Called by Vercel Cron every 60s during the match
import { NextRequest, NextResponse } from 'next/server'
import { getResults, saveResults, getParticipants, saveParticipants, getDataSource } from '@/lib/kv'
import { fetchLiveData } from '@/lib/apifootball'
import { calcPoints } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Vercel cron auth
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const source = await getDataSource()
  if (source !== 'live') {
    return NextResponse.json({ skipped: true, reason: 'source is manual' })
  }

  const liveData = await fetchLiveData()
  if (!liveData) {
    return NextResponse.json({ skipped: true, reason: 'no live data' })
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

  // Recalc participants
  const participants = await getParticipants()
  const updated = participants.map(p => {
    const { points, correct } = calcPoints(p.answers, merged.answers)
    return { ...p, points, correct }
  })
  await saveParticipants(updated)

  return NextResponse.json({ ok: true, matchStatus: liveData.matchStatus, answersSet: Object.keys(liveData.answers) })
}
