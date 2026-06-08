// lib/kv.ts
import { Redis } from '@upstash/redis'
import type { Participant, MatchResult } from './types'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '',
})

const PARTICIPANTS_KEY = 'tippspiel:participants'
const RESULTS_KEY = 'tippspiel:results'
const DATA_SOURCE_KEY = 'tippspiel:datasource'
const CODES_KEY = 'tippspiel:codes'
const USED_CODES_KEY = 'tippspiel:usedcodes'

// ---- PARTICIPANTS ----
export async function getParticipants(): Promise<Participant[]> {
  const data = await redis.get<Participant[]>(PARTICIPANTS_KEY)
  return data ?? []
}
export async function saveParticipants(participants: Participant[]): Promise<void> {
  await redis.set(PARTICIPANTS_KEY, participants)
}
export async function addParticipant(p: Participant): Promise<void> {
  const all = await getParticipants()
  all.push(p)
  await saveParticipants(all)
}

// ---- RESULTS ----
export async function getResults(): Promise<MatchResult> {
  const data = await redis.get<MatchResult>(RESULTS_KEY)
  return data ?? { source: 'manual', answers: {}, lastUpdated: Date.now() }
}
export async function saveResults(r: MatchResult): Promise<void> {
  await redis.set(RESULTS_KEY, r)
}

// ---- DATA SOURCE ----
export async function getDataSource(): Promise<'live' | 'manual'> {
  const s = await redis.get<string>(DATA_SOURCE_KEY)
  return s === 'live' ? 'live' : 'manual'
}
export async function setDataSource(source: 'live' | 'manual'): Promise<void> {
  await redis.set(DATA_SOURCE_KEY, source)
}

// ---- CODES ----
export async function getCodes(): Promise<string[]> {
  const data = await redis.get<string[]>(CODES_KEY)
  return data ?? []
}
export async function saveCodes(codes: string[]): Promise<void> {
  await redis.set(CODES_KEY, codes)
}
export async function getUsedCodes(): Promise<string[]> {
  const data = await redis.get<string[]>(USED_CODES_KEY)
  return data ?? []
}
export async function markCodeUsed(code: string): Promise<void> {
  const used = await getUsedCodes()
  if (!used.includes(code)) {
    used.push(code)
    await redis.set(USED_CODES_KEY, used)
  }
}
export async function isCodeValid(code: string): Promise<{ valid: boolean; reason?: string }> {
  const [codes, usedCodes] = await Promise.all([getCodes(), getUsedCodes()])
  if (codes.length === 0) return { valid: true } // no codes set = open access
  const normalised = code.trim().toUpperCase()
  if (!codes.map(c => c.toUpperCase()).includes(normalised)) {
    return { valid: false, reason: 'Ungültiger Code' }
  }
  if (usedCodes.map(c => c.toUpperCase()).includes(normalised)) {
    return { valid: false, reason: 'Code bereits verwendet' }
  }
  return { valid: true }
}

// ---- CLEAR ----
export async function clearAll(): Promise<void> {
  await redis.del(PARTICIPANTS_KEY)
  await redis.del(RESULTS_KEY)
  await redis.del(DATA_SOURCE_KEY)
  await redis.del(USED_CODES_KEY)
}
