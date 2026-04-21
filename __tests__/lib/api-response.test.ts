/**
 * @jest-environment node
 */

import { apiError } from '@/lib/api-response'

describe('apiError', () => {
  it('returns a response with the given status and { error: message } body', async () => {
    const res = apiError(401, 'Unauthorized')
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('merges details into the response body alongside the error message', async () => {
    const res = apiError(400, 'Invalid input', { field: 'daily_new_limit', min: 4 })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body).toEqual({ error: 'Invalid input', field: 'daily_new_limit', min: 4 })
  })

  it('works for server errors', async () => {
    const res = apiError(500, 'Internal error')
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal error' })
  })
})
