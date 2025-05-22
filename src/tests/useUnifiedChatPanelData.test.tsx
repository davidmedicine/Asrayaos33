import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useUnifiedChatPanelData } from '@/features/hub/components/leftpanel/useUnifiedChatPanelData';
import { seedFirstFlame } from '@/lib/temporal_client';
import { fetchQuestList } from '@/lib/api/quests';

vi.mock('@/lib/api/quests', () => ({
  fetchQuestList: vi.fn(async () => ({ data: [], serverTimestamp: '2024-01-01T00:00:00Z' })),
}));

vi.mock('@/features/hub/components/AuthContext', () => ({
  useAuth: () => ({
    session: null,
    user: null,
    userId: 'user-123',
    isLoadingAuth: false,
    authError: null,
    authEvent: null,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('@/lib/temporal_client', () => ({
  seedFirstFlame: vi.fn(),
}));

const setLastSynced = vi.fn();
const setActiveQuestId = vi.fn();
vi.mock('@/lib/state/slices/questslice', () => ({
  useQuestStore: (selector?: any) => {
    const state = { activeQuestId: null, setLastSynced };
    return selector ? selector(state) : state;
  },
  useSafeSetActiveQuestId: () => setActiveQuestId,
}));

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const qc = new QueryClient();
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
};

describe('useUnifiedChatPanelData', () => {
  it('bootstraps first flame when quest list is empty', async () => {
    const qc = new QueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const LocalWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { waitFor } = renderHook(() => useUnifiedChatPanelData({ panelId: 'p1' }), {
      wrapper: LocalWrapper,
    });

    await waitFor(() => expect(seedFirstFlame).toHaveBeenCalled());
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['list-quests'], exact: true });
    expect(fetchQuestList).toHaveBeenCalled();
  });
});
