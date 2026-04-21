import { Inngest } from 'inngest'

export const inngest = new Inngest({ id: 'chess-improver' })

export type SyncRunEventData = {
  syncLogId: string
  userId: string
  username: string
  mode: 'historical' | 'incremental'
}
