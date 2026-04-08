'use client'

import { useEffect, useState } from 'react'
import { ReviewBoard } from '@/components/ReviewBoard'
import type { ReviewOutcome } from '@/lib/fsrs-engine'

interface SessionCard {
  cardId: string
  fen: string
  correctMove: string
  classification: string
  isNew: boolean
}

interface ReviewSession {
  cards: SessionCard[]
  totalDue: number
  newCardsToday: number
}

export default function ReviewPage() {
  const [queue, setQueue] = useState<SessionCard[]>([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/review/session')
      .then((r) => r.json())
      .then((session: ReviewSession) => {
        setQueue(session.cards)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div data-testid="loading">Loading…</div>
  }

  const current = queue[index]

  if (!current) {
    return (
      <div data-testid="completion">
        <p>Session complete</p>
      </div>
    )
  }

  async function handleResult(outcome: ReviewOutcome) {
    await fetch(`/api/review/cards/${current.cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    })
    setIndex((i) => i + 1)
  }

  return (
    <div>
      <div data-testid="progress">{queue.length - index} remaining</div>
      <ReviewBoard
        fen={current.fen}
        correctMove={current.correctMove}
        onResult={handleResult}
      />
    </div>
  )
}
