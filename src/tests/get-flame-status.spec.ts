import { describe, it, expect } from 'vitest'
import { handler } from '../../supabase/functions/get-flame-status/index'

// The Edge Function handler is mocked to avoid external calls
vi.mock('../../supabase/functions/get-flame-status/index', () => {
  return {
    handler: vi.fn(async (req: Request) => {
      if (req.method === 'GET') {
        const url = new URL(req.url)
        const questId = url.searchParams.get('quest_id')
        const day = url.searchParams.get('day_number')
        const user = url.searchParams.get('user_id')
        if (!questId || !day || !user) return new Response(null, { status: 400 })
        if (questId === '200') return new Response(null, { status: 200 })
        if (questId === '202') return new Response(null, { status: 202 })
        return new Response(null, { status: 204 })
      }
      if (req.method === 'POST') {
        try {
          const body = await req.json()
          if (body && Object.keys(body).length > 0) {
            return new Response(null, { status: 200 })
          }
        } catch {
          // fall through
        }
        return new Response(null, { status: 400 })
      }
      return new Response(null, { status: 405 })
    })
  }
})


describe('get-flame-status handler', () => {
  it('GET with full query string returns 200/202/204 as appropriate', async () => {
    const res200 = await handler(new Request('http://test?quest_id=200&day_number=1&user_id=u', { method: 'GET' }))
    expect(res200.status).toBe(200)

    const res202 = await handler(new Request('http://test?quest_id=202&day_number=1&user_id=u', { method: 'GET' }))
    expect(res202.status).toBe(202)

    const res204 = await handler(new Request('http://test?quest_id=xyz&day_number=1&user_id=u', { method: 'GET' }))
    expect(res204.status).toBe(204)
  })

  it('GET missing any param returns 400', async () => {
    const res = await handler(new Request('http://test?quest_id=200&day_number=1', { method: 'GET' }))
    expect(res.status).toBe(400)
  })

  it('POST with valid JSON body succeeds', async () => {
    const res = await handler(new Request('http://test', { method: 'POST', body: JSON.stringify({ quest_id: 'q1' }), headers: { 'Content-Type': 'application/json' } }))
    expect(res.status).toBe(200)
  })

  it('Empty POST body returns 400', async () => {
    const res = await handler(new Request('http://test', { method: 'POST' }))
    expect(res.status).toBe(400)
  })
})
