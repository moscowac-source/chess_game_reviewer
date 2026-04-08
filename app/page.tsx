'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ModeCounts {
  standard: number
  recent: number
  mistakes: number
  brilliancies: number
}

const MODES = [
  {
    id: 'standard' as const,
    label: 'Daily Review',
    description: 'Your full FSRS queue — all cards due today.',
  },
  {
    id: 'recent' as const,
    label: 'Recent Games',
    description: 'Cards from games played in the last 7 days.',
  },
  {
    id: 'mistakes' as const,
    label: 'Mistakes to Master',
    description: 'Drill the positions where you went wrong.',
  },
  {
    id: 'brilliancies' as const,
    label: 'Back to Brilliancies',
    description: 'Revisit positions where you found the best move.',
  },
]

export default function HomePage() {
  const [counts, setCounts] = useState<ModeCounts | null>(null)

  useEffect(() => {
    fetch('/api/review/counts')
      .then((r) => r.json())
      .then((data: ModeCounts) => setCounts(data))
  }, [])

  return (
    <main>
      <h1>Chess Improver</h1>
      <p>Choose a review mode to start.</p>
      <div>
        {MODES.map(({ id, label, description }) => (
          <Link key={id} href={`/review?mode=${id}`}>
            <div data-testid={`mode-${id}`}>
              <strong>{label}</strong>
              <p>{description}</p>
              <span>{counts ? counts[id] : '…'}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
