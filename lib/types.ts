// lib/types.ts

export type QuestionType = 'score' | 'yn' | 'number' | 'multiselect'

export interface Question {
  id: number
  text: string
  type: QuestionType
  points: number        // exact match
  pointsPartial?: number // partial credit (tendenz for score, ±tolerance for number)
  tolerance?: number    // for number type: ±N still gets pointsPartial
  options?: string[]    // for multiselect
}

export interface Participant {
  id: string
  name: string
  answers: Record<number, string> // questionId -> answer string
  points: number
  correct: number
  submittedAt: number
}

export interface MatchResult {
  source: 'live' | 'manual'
  answers: Record<number, string | null> // questionId -> correct answer (null = not resolved)
  lastUpdated: number
  matchStatus?: string // '1H' | 'HT' | '2H' | 'FT' etc.
  liveScore?: { home: number; away: number }
  halfScore?: { home: number; away: number }
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'Wie lautet der Endstand?',
    type: 'score',
    points: 3,
    pointsPartial: 1,
  },
  {
    id: 2,
    text: 'Wie steht es zur Halbzeit?',
    type: 'score',
    points: 3,
    pointsPartial: 1,
  },
  {
    id: 3,
    text: 'Gibt es eine Rote Karte?',
    type: 'yn',
    points: 2,
    options: ['Ja', 'Nein'],
  },
  {
    id: 4,
    text: 'Gibt es einen Elfmeter im Spiel?',
    type: 'yn',
    points: 2,
    options: ['Ja', 'Nein'],
  },
  {
    id: 5,
    text: 'Anzahl Ecken Deutschland',
    type: 'number',
    points: 2,
    pointsPartial: 1,
    tolerance: 1,
  },
  {
    id: 6,
    text: 'Anzahl Fouls insgesamt',
    type: 'number',
    points: 2,
    pointsPartial: 1,
    tolerance: 2,
  },
  {
    id: 7,
    text: 'Welcher Deutscher schießt mindestens 1 Tor?',
    type: 'multiselect',
    points: 2,
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
      'Kein Tor Deutschland',
    ],
  },
  {
    id: 8,
    text: 'Fällt ein Tor in den ersten 10 Minuten?',
    type: 'yn',
    points: 2,
    options: ['Ja', 'Nein'],
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
        points += q.points
        correct++
      } else {
        // Tendenz
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
    } else if (q.type === 'multiselect') {
      // answer = comma-separated list of selected players
      const selected = answer.split(',').map(s => s.trim()).filter(Boolean)
      const correct_list = result.split(',').map(s => s.trim()).filter(Boolean)
      // At least one match
      const hasMatch = selected.some(s => correct_list.includes(s))
      if (hasMatch) { points += q.points; correct++ }
    } else {
      // yn
      if (answer.trim().toLowerCase() === result.trim().toLowerCase()) {
        points += q.points
        correct++
      }
    }
  })

  return { points, correct }
}
