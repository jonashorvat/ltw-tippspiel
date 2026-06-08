// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { addParticipant, getParticipants, getResults } from '@/lib/kv'
import { calcPoints } from '@/lib/types'
import type { Participant } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, answers } = body as { name: string; answers: Record<number, string> }

    if (!name?.trim()) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })

    // Check duplicate
    const existing = await getParticipants()
    if (existing.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: 'Name bereits vergeben' }, { status: 409 })
    }

    const results = await getResults()
    const { points, correct } = calcPoints(answers, results.answers)

    const participant: Participant = {
      id: crypto.randomUUID(),
      name: name.trim(),
      answers,
      points,
      correct,
      submittedAt: Date.now(),
    }

    await addParticipant(participant)
    return NextResponse.json({ success: true, participant })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
