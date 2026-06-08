// lib/types.ts

export type QuestionType = 'score' | 'yn' | 'number' | 'scorer' | 'minute'

export interface Question {
  id: number
  text: string
  type: QuestionType
  points: number
  pointsPartial?: number
  tolerance?: number
  options?: string[]
}

export interface Participant {
  id: string
  name: string
  answers: Record<number, string>
  points: number
  correct: number
  submittedAt: number
}

export interface MatchResult {
  source: 'live' | 'manual'
  answers: Record<number, string | null>
  lastUpdated: number
  matchStatus?: string
  liveScore?: { home: number; away: number }
  halfScore?: { home: number; away: number }
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Wie lautet der Endstand?',
    type: 'score',
    points: 5,
    pointsPartial: 2,
  },
  {
    id: 2,
    text: 'Wie steht es zur Halbzeit?',
    type: 'score',
    points: 4,
    pointsPartial: 2,
  },
  {
    id: 3,
    text: 'Gibt es eine Rote Karte?',
    type: 'yn',
    points: 3,
    options: ['Ja', 'Nein'],
  },
  {
    id: 4,
    text: 'Gibt es einen Elfmeter im Spiel?',
    type: 'yn',
    points: 3,
    options: ['Ja', 'Nein'],
  },
  {
    id: 5,
    text: 'Anzahl Ecken Deutschland',
    type: 'number',
    points: 3,
    pointsPartial: 1,
    tolerance: 1,
  },
  {
    id: 6,
    text: 'Anzahl Fouls insgesamt',
    type: 'number',
    points: 3,
    pointsPartial: 1,
    tolerance: 3,
  },
  {
    id: 7,
    text: 'Welcher Deutsche schießt mindestens 1 Tor?',
    type: 'scorer',
    points: 4,
    options: [
      'Kai Havertz',
      'Leroy Sané',
      'Leon Goretzka',
      'Florian Wirtz',
      'Joshua Kimmich',
      'Jamal Musiala',
      'Deniz Undav',
      'Nick Woltemade',
      'Antonio Rüdiger',
      'Pascal Groß',
      'Felix Nmecha',
      'Aleksandar Pavlović',
      'David Raum',
      'Jonathan Tah',
      'Nadiem Amiri',
      'Jamie Leweling',
      'Forzan Ouedraogo',
      'Waldemar Anton',
      'Nathaniel Brown',
      'Nico Schlotterbeck',
      'Angelo Stiller',
      'Malick Thiaw',
      'Maximilian Beier',
      'Keiner',
    ],
  },
  {
    id: 8,
    text: 'Fällt ein Tor in den ersten 10 Minuten?',
    type: 'yn',
    points: 3,
    options: ['Ja', 'Nein'],
  },
  {
    id: 9,
    text: 'Gibt es eine Gelbe Karte für Deutschland?',
    type: 'yn',
    points: 2,
    options: ['Ja', 'Nein'],
  },
  {
    id: 10,
    text: 'In welcher Minute fällt das erste Tor?',
    type: 'minute',
    points: 4,
    pointsPartial: 2,
    tolerance: 5,
  },
]

export function calcPoints(
  answers: Record<number, string>,
  results: Record<number, string | null>
): { points: number; correct: number } {
  let points = 0
  let correct = 0

  QUESTIONS.forEach((q) => {
    const result = results[q.id]
    const answer = answers[q.id]
    if (result === null || result === undefined || !answer) return

    if (q.type === 'score') {
      const norm = (s: string) => s.replace(/\s/g, '')
      if (norm(answer) === norm(result)) {
        points += q.points; correct++
      } else {
        const [ra, rb] = result.split(':').map(Number)
        const [aa, ab] = answer.split(':').map(Number)
        if (!isNaN(ra) && !isNaN(aa)) {
          const rTend = ra > rb ? 1 : ra < rb ? -1 : 0
          const aTend = aa > ab ? 1 : aa < ab ? -1 : 0
          if (rTend === aTend) points += q.pointsPartial ?? 0
        }
      }
    } else if (q.type === 'number') {
      const r = parseInt(result)
      const a = parseInt(answer)
      if (!isNaN(r) && !isNaN(a)) {
        if (r === a) { points += q.points; correct++ }
        else if (Math.abs(r - a) <= (q.tolerance ?? 0)) points += q.pointsPartial ?? 0
      }
    } else if (q.type === 'scorer') {
      // result = comma-separated actual scorers (admin sets multiple)
      // answer = single player name chosen by guest (or 'Keiner')
      const scorers = result.split(',').map(s => s.trim()).filter(Boolean)
      const noGoal = scorers.length === 0 || (scorers.length === 1 && scorers[0] === 'Keiner')
      if (answer === 'Keiner' && noGoal) {
        points += q.points; correct++
      } else if (answer !== 'Keiner' && scorers.includes(answer)) {
        points += q.points; correct++
      }
    } else if (q.type === 'minute') {
      // result: minute number as string, or 'Kein Tor'
      // answer: minute number as string, or 'Kein Tor'
      if (result === 'Kein Tor' && answer === 'Kein Tor') {
        points += 3; correct++
      } else if (result !== 'Kein Tor' && answer !== 'Kein Tor') {
        const r = parseInt(result)
        const a = parseInt(answer)
        if (!isNaN(r) && !isNaN(a)) {
          if (r === a) { points += q.points; correct++ }
          else if (Math.abs(r - a) <= (q.tolerance ?? 5)) points += q.pointsPartial ?? 0
        }
      }
    } else {
      // yn
      if (answer.trim().toLowerCase() === result.trim().toLowerCase()) {
        points += q.points; correct++
      }
    }
  })

  return { points, correct }
}
