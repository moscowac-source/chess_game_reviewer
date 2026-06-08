import { renderHook, waitFor, act } from '@testing-library/react'
import { useFetchJson } from '@/hooks/use-fetch-json'

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as unknown as Response
}

function failResponse(status: number): Response {
  return { ok: false, status, json: async () => ({}) } as unknown as Response
}

const identity = <T,>(raw: unknown) => raw as T

afterEach(() => {
  jest.restoreAllMocks()
})

describe('useFetchJson', () => {
  it('starts in a loading state', () => {
    global.fetch = jest.fn().mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useFetchJson('/x', identity))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('resolves with data when the request succeeds and validation passes', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse({ n: 42 }))
    const { result } = renderHook(() => useFetchJson('/x', identity))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ n: 42 })
    expect(result.current.error).toBeNull()
  })

  it('sets error when the request fails with a non-ok status', async () => {
    global.fetch = jest.fn().mockResolvedValue(failResponse(500))
    const { result } = renderHook(() => useFetchJson('/x', identity))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).not.toBeNull()
  })

  it('sets error when validation returns null', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse({ bogus: true }))
    const { result } = renderHook(() => useFetchJson('/x', () => null))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).not.toBeNull()
    expect(result.current.data).toBeNull()
  })

  it('sets error when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderHook(() => useFetchJson('/x', identity))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error?.message).toBe('network down')
  })

  // #69: a 401 during a session-cookie refresh is transient — retry once.
  it('retries once on a 401 and resolves when the retry succeeds', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(failResponse(401))
      .mockResolvedValueOnce(okResponse({ n: 7 }))
    global.fetch = fetchMock
    const { result } = renderHook(() => useFetchJson('/x', identity))
    await waitFor(() => expect(result.current.data).toEqual({ n: 7 }))
    expect(result.current.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up and sets error after a second consecutive 401', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(failResponse(401))
      .mockResolvedValueOnce(failResponse(401))
    global.fetch = fetchMock
    const { result } = renderHook(() => useFetchJson('/x', identity))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).not.toBeNull()
    expect(result.current.data).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry on a non-401 failure', async () => {
    const fetchMock = jest.fn().mockResolvedValue(failResponse(500))
    global.fetch = fetchMock
    const { result } = renderHook(() => useFetchJson('/x', identity))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).not.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('refetch triggers another request', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(okResponse({ n: 1 }))
      .mockResolvedValueOnce(okResponse({ n: 2 }))
    global.fetch = fetchMock
    const { result } = renderHook(() => useFetchJson('/x', identity))
    await waitFor(() => expect(result.current.data).toEqual({ n: 1 }))
    act(() => { result.current.refetch() })
    await waitFor(() => expect(result.current.data).toEqual({ n: 2 }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
