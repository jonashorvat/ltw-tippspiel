// app/api/admin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getResults, saveResults, getParticipants, saveParticipants, clearAll,
  setDataSource, getDataSource, getCodes, saveCodes, getUsedCodes } from '@/lib/kv'
import { calcPoints, QUESTIONS } from '@/lib/types'
import type { MatchResult } from '@/lib/types'

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? 'ltw-admin-2024'

function auth(req: NextRequest): boolean {
  const key = req.headers.get('x-admin-key') ?? req.nextUrl.searchParams.get('key')
  return key === ADMIN_SECRET
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [results, participants, source, codes, usedCodes] = await Promise.all([
    getResults(), getParticipants(), getDataSource(), getCodes(), getUsedCodes()
  ])
  return NextResponse.json({ results, participants, source, codes, usedCodes })
}

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { action } = body

  if (action === 'set-source') {
    await setDataSource(body.source)
    return NextResponse.json({ ok: true })
  }

  if (action === 'set-codes') {
    const codes: string[] = (body.codes as string[]).map((c: string) => c.trim().toUpperCase()).filter(Boolean)
    await saveCodes(codes)
    return NextResponse.json({ ok: true })
  }

  if (action === 'reset-used-codes') {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '',
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '',
    })
    await redis.del('tippspiel:usedcodes')
    return NextResponse.json({ ok: true })
  }

  if (action === 'set-answer') {
    const { questionId, answer } = body
    const results = await getResults()
    results.answers[questionId] = answer
    results.lastUpdated = Date.now()
    await saveResults(results)
    await recalcAll(results)
    return NextResponse.json({ ok: true })
  }

  if (action === 'set-results') {
    const newResults: MatchResult = {
      source: body.source ?? 'manual',
      answers: body.answers ?? {},
      lastUpdated: Date.now(),
      matchStatus: body.matchStatus,
      liveScore: body.liveScore,
      halfScore: body.halfScore,
    }
    await saveResults(newResults)
    await recalcAll(newResults)
    return NextResponse.json({ ok: true })
  }

  if (action === 'add-participant') {
    const { name, answers } = body
    const results = await getResults()
    const { points, correct } = calcPoints(answers ?? {}, results.answers)
    const p = { id: crypto.randomUUID(), name, answers: answers ?? {}, points, correct, submittedAt: Date.now() }
    const all = await getParticipants()
    all.push(p)
    await saveParticipants(all)
    return NextResponse.json({ ok: true, participant: p })
  }

  if (action === 'clear') {
    await clearAll()
    return NextResponse.json({ ok: true })
  }

  if (action === 'clear-participants') {
    await saveParticipants([])
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function recalcAll(results: MatchResult) {
  const participants = await getParticipants()
  const updated = participants.map(p => {
    const { points, correct } = calcPoints(p.answers, results.answers)
    return { ...p, points, correct }
  })
  await saveParticipants(updated)
}
