import { ensureFirstFlameQuest } from '../firstFlame.ts'
import { FIRST_FLAME_SLUG } from '../../5dayquest/FirstFlame.ts'
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts'

interface Store { quests: Array<{ id: string; slug: string; title?: string; type?: string }> }

function createStub(store: Store) {
  return {
    from(table: string) {
      return new Query(table, store)
    }
  }
}

class Query {
  constructor(private table: string, private store: Store) {}
  private filterCol?: string
  private filterVal?: string
  select(_cols: string) { return this }
  eq(col: string, val: string) { this.filterCol = col; this.filterVal = val; return this }
  async maybeSingle<T>() {
    const row = this.store[this.table as keyof Store].find((r: any) => r[this.filterCol!] === this.filterVal)
    return { data: row ?? null, error: null } as { data: T | null, error: null }
  }
  insert(payload: any) {
    const row = { id: payload.id ?? 'generated-id', ...payload }
    this.store[this.table as keyof Store].push(row)
    const self = this
    return {
      select(_cols: string) {
        return {
          async single<T>() {
            return { data: row as T, error: null }
          }
        }
      }
    }
  }
}

Deno.test('returns existing quest without insert', async () => {
  const store: Store = { quests: [{ id: 'q1', slug: FIRST_FLAME_SLUG }] }
  const sb = createStub(store) as any
  const row = await ensureFirstFlameQuest(sb)
  assertEquals(row.id, 'q1')
  assertEquals(row.slug, FIRST_FLAME_SLUG)
  assertEquals(store.quests.length, 1)
})

Deno.test('inserts quest when missing', async () => {
  const store: Store = { quests: [] }
  const sb = createStub(store) as any
  const row = await ensureFirstFlameQuest(sb)
  assert(row.id)
  assertEquals(row.slug, FIRST_FLAME_SLUG)
  assertEquals(store.quests.length, 1)
})
