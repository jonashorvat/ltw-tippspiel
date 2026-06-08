// lib/kv.ts
import { kv } from '@vercel/kv'
import type { Participant, MatchResult } from './types'

const PARTICIPANTS_KEY = 'tippspiel:participants'
const RESULTS_KEY = 'tippspiel:results'
const DATA_SOURCE_KEY = 'tippspiel:datasource' // 'live' | 'manual'

export async function getParticipants(): Promise<Participant[]> {
  const data = await kv.get<Participant[]>(PARTICIPANTS_KEY)
  return data ?? []
}

export async function saveParticipants(participants: Participant[]): Promise<void> {
  await kv.set(PARTICIPANTS_KEY, participants)
}

export async function addParticipant(p: Participant): Promise<void> {
  const all = await getParticipants()
  all.push(p)
  await saveParticipants(all)
}

export async function getResults(): Promise<MatchResult> {
  const data = await kv.get<MatchResult>(RESULTS_KEY)
  return data ?? {
    source: 'manual',
    answers: {},
    lastUpdated: Date.now(),
  }
}

export async function saveResults(r: MatchResult): Promise<void> {
  await kv.set(RESULTS_KEY, r)
}

export async function getDataSource(): Promise<'live' | 'manual'> {
  const s = await kv.get<string>(DATA_SOURCE_KEY)
  return s === 'live' ? 'live' : 'manual'
}

export async function setDataSource(source: 'live' | 'manual'): Promise<void> {
  await kv.set(DATA_SOURCE_KEY, source)
}

export async function clearAll(): Promise<void> {
  await kv.del(PARTICIPANTS_KEY)
  await kv.del(RESULTS_KEY)
  await kv.del(DATA_SOURCE_KEY)
}
