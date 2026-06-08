// app/api/results/route.ts
import { NextResponse } from 'next/server'
import { getParticipants, getResults } from '@/lib/kv'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [participants, results] = await Promise.all([getParticipants(), getResults()])
    const sorted = [...participants].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))
    return NextResponse.json({ participants: sorted, results })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
