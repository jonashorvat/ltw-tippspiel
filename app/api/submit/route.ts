// app/api/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { addParticipant, getParticipants, getResults, isCodeValid, markCodeUsed } from '@/lib/kv'
import { calcPoints } from '@/lib/types'
import type { Participant } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, answers, code } = body as { name: string; answers: Record<number, string>; code?: string }

    if (!name?.trim()) return NextResponse.json({ error: 'Name fehlt' }, { status: 400 })

    // Validate code if system is active
    const codeCheck = await isCodeValid(code ?? '')
    if (!codeCheck.valid) {
      return NextResponse.json({ error: codeCheck.reason ?? 'Ungültiger Code' }, { status: 403 })
    }

    // Check duplicate name
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

    // Mark code as used
    if (code?.trim()) await markCodeUsed(code.trim())

    return NextResponse.json({ success: true, participant })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
