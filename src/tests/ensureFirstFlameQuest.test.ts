import { describe, it, expect, vi } from 'vitest';
import { getOrCreateFirstFlame } from '@supabase-shared/db/firstFlame.ts';

function createMockSupabase() {
  let quest: any = null;
  const insertMock = vi.fn();
  return {
    insertMock,
    from() {
      const query: any = {};
      query.select = () => query;
      query.eq = () => query;
      query.maybeSingle = async () => ({ data: quest, error: null });
      query.insert = (payload: any) => {
        insertMock();
        if (!quest) {
          quest = {
            id: '11111111-1111-1111-1111-111111111111',
            slug: payload.slug,
            title: payload.title,
            type: payload.type,
          };
        }
        return query;
      };
      query.single = async () => ({ data: quest, error: null });
      return query;
    },
  };
}

describe('getOrCreateFirstFlame', () => {
  it('returns same quest id when called twice', async () => {
    const sb = createMockSupabase();
    const first = await getOrCreateFirstFlame(sb as any);
    const second = await getOrCreateFirstFlame(sb as any);
    expect(first.id).toBe(second.id);
    expect(sb.insertMock).toHaveBeenCalledTimes(1);
  });
});
