// lib/apifootball.ts
// Pulls live match data from API-Football and maps it to our answer format

const API_KEY = process.env.API_FOOTBALL_KEY ?? ''
const MATCH_ID = process.env.MATCH_ID ?? ''
const BASE = 'https://v3.football.api-sports.io'

interface ApiFixture {
  fixture: { status: { short: string; elapsed: number | null } }
  goals: { home: number | null; away: number | null }
  score: {
    halftime: { home: number | null; away: number | null }
    fulltime: { home: number | null; away: number | null }
  }
  statistics?: Array<{
    team: { id: number; name: string }
    statistics: Array<{ type: string; value: number | string | null }>
  }>
}

interface ApiEvent {
  time: { elapsed: number }
  team: { id: number; name: string }
  player: { name: string }
  type: string   // 'Card' | 'Goal' | 'subst'
  detail: string // 'Red Card' | 'Yellow Card' | 'Normal Goal' | 'Penalty' etc.
}

function getStat(stats: ApiFixture['statistics'], teamName: string, type: string): number {
  if (!stats) return 0
  const team = stats.find(s => s.team.name.toLowerCase().includes(teamName.toLowerCase()))
  if (!team) return 0
  const stat = team.statistics.find(s => s.type === type)
  return Number(stat?.value ?? 0)
}

export async function fetchLiveData(): Promise<{
  answers: Record<number, string>
  matchStatus: string
  liveScore: { home: number; away: number }
  halfScore: { home: number; away: number }
} | null> {
  if (!API_KEY || !MATCH_ID) return null

  try {
    // Fetch fixture + statistics
    const [fixtureRes, eventsRes] = await Promise.all([
      fetch(`${BASE}/fixtures?id=${MATCH_ID}&statistics=true`, {
        headers: { 'x-apisports-key': API_KEY },
        next: { revalidate: 0 },
      }),
      fetch(`${BASE}/fixtures/events?fixture=${MATCH_ID}`, {
        headers: { 'x-apisports-key': API_KEY },
        next: { revalidate: 0 },
      }),
    ])

    const fixtureData = await fixtureRes.json()
    const eventsData = await eventsRes.json()

    const fix: ApiFixture = fixtureData.response?.[0]
    const events: ApiEvent[] = eventsData.response ?? []

    if (!fix) return null

    const status = fix.fixture.status.short // '1H','HT','2H','FT','NS' etc.
    const elapsed = fix.fixture.status.elapsed ?? 0

    const homeGoals = fix.goals.home ?? 0
    const awayGoals = fix.goals.away ?? 0
    const htHome = fix.score.halftime.home ?? 0
    const htAway = fix.score.halftime.away ?? 0
    const ftHome = fix.score.fulltime.home ?? homeGoals
    const ftAway = fix.score.fulltime.away ?? awayGoals

    // --- Q3: Red card? ---
    const hasRedCard = events.some(e => e.type === 'Card' && e.detail === 'Red Card')

    // --- Q4: Penalty? ---
    const hasPenalty = events.some(e =>
      e.detail?.toLowerCase().includes('penalty') ||
      e.detail?.toLowerCase().includes('elfmeter')
    )

    // --- Q5: Corners Germany ---
    const cornersDE = getStat(fix.statistics, 'germany', 'Corner Kicks')

    // --- Q6: Total fouls ---
    const foulsHome = getStat(fix.statistics, 'germany', 'Fouls')
    const foulsAway = getStat(fix.statistics, 'cura', 'Fouls') // Curaçao
    const totalFouls = foulsHome + foulsAway

    // --- Q7: Scorers Germany ---
    const deScorers = events
      .filter(e =>
        e.type === 'Goal' &&
        e.team.name.toLowerCase().includes('germany') &&
        !e.detail?.toLowerCase().includes('own goal')
      )
      .map(e => {
        const last = e.player.name.split(' ').pop() ?? e.player.name
        return last
      })
    const scorersAnswer = deScorers.length > 0
      ? [...new Set(deScorers)].join(',')
      : 'Kein Tor Deutschland'

    // --- Q8: Goal in first 10 min? ---
    const earlyGoal = events.some(e => e.type === 'Goal' && e.time.elapsed <= 10)

    const answers: Record<number, string> = {}

    // Only set answers when data is actually available
    // Q2 halftime — available after HT
    if (['HT', '2H', 'ET', 'P', 'FT', 'AET', 'PEN'].includes(status)) {
      answers[2] = `${htHome}:${htAway}`
    }

    // Q1 fulltime — only when FT
    if (['FT', 'AET', 'PEN'].includes(status)) {
      answers[1] = `${ftHome}:${ftAway}`
    }

    // Live answers (available as soon as events happen)
    if (elapsed > 0 || ['FT','AET','PEN'].includes(status)) {
      answers[3] = hasRedCard ? 'Ja' : 'Nein'
      answers[4] = hasPenalty ? 'Ja' : 'Nein'
      answers[5] = String(cornersDE)
      answers[6] = String(totalFouls)
      answers[7] = scorersAnswer
      answers[8] = earlyGoal ? 'Ja' : 'Nein'
    }

    return {
      answers,
      matchStatus: status,
      liveScore: { home: homeGoals, away: awayGoals },
      halfScore: { home: htHome, away: htAway },
    }
  } catch (err) {
    console.error('API-Football error:', err)
    return null
  }
}
