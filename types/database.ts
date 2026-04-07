export type CardClassification = 'blunder' | 'mistake' | 'great' | 'brilliant'

export interface Card {
  id: string
  fen: string
  correct_move: string
  classification: CardClassification
  created_at: string
}

export type CardStateValue = 'new' | 'learning' | 'review' | 'relearning'

export interface CardState {
  id: string
  user_id: string
  card_id: string
  stability: number
  difficulty: number
  due_date: string
  review_count: number
  state: CardStateValue
}

export interface Game {
  id: string
  user_id: string
  pgn: string
  source: 'chess.com'
  played_at: string
  processed_at: string | null
}

export interface User {
  id: string
  email: string
  chess_com_username: string | null
  created_at: string
}

export type ReviewRating = 'easy' | 'good' | 'hard' | 'again'

export interface ReviewLog {
  id: string
  user_id: string
  card_id: string
  rating: ReviewRating
  reviewed_at: string
}

export type SyncMode = 'historical' | 'incremental'

export interface SyncLog {
  id: string
  user_id: string
  mode: SyncMode
  started_at: string
  completed_at: string | null
  games_processed: number
  cards_created: number
  error: string | null
}
