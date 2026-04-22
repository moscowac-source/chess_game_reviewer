import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { vercelInngestFunctions } from '@/lib/inngest/vercel-functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: vercelInngestFunctions,
})
