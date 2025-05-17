/**
 * ChannelListVirtuoso — virtualised list for the “Channels” tab.
 *
 * ✔ Rows fill the full width of the panel (no jiggle / glow artefacts)
 * ✔ Callbacks passed exactly as onClick(id) / onJoin(id)
 * ✔ Robust loading / error / empty states
 * ✔ Uses the new Map‑tolerant channel selectors (2025‑04‑22 revision)
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { ChannelListItem, type ChannelData } from './ChannelListItem';

import {
  useActiveChannelId,
  useChannelById,
  useChannelMembershipStatus,
  useJoinChannel,
  useSetActiveChannelId,
  useChannelsList,
  useIsLoadingChannels,
  useLoadWorkspaceChannels,
} from '@/lib/state/slices/channelSelectors';

/* -------------------------------------------------------------------------- */
/* Lightweight presentational states                                          */
/* -------------------------------------------------------------------------- */

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
    <p className="text-sm text-[var(--text-muted)]">{message}</p>
  </div>
);

const LoadingState = () => (
  <div className="flex h-full flex-col items-center justify-center p-4 text-center">
    <div
      role="status"
      className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-[var(--agent-color-primary)] border-t-transparent"
    />
    <p className="text-sm text-[var(--text-muted)]">Loading channels…</p>
  </div>
);

const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) => (
  <div className="flex h-full flex-col items-center justify-center p-4 text-center text-red-500">
    <p className="mb-3">{message}</p>
    <button
      onClick={onRetry}
      className="rounded border border-current px-3 py-1 text-sm hover:bg-red-500 hover:text-white"
    >
      Retry
    </button>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Row wrapper (memoised)                                                     */
/* -------------------------------------------------------------------------- */

const ChannelRow = memo(({ channelId }: { channelId: string }) => {
  const channel      = useChannelById(channelId);
  const membership   = useChannelMembershipStatus(channelId);
  const activeId     = useActiveChannelId();
  const join         = useJoinChannel();
  const setActiveId  = useSetActiveChannelId();

  // First SSR/CSR pass might not have the channel yet
  if (!channel) return null;

  return (
    <ChannelListItem
      /* layout helpers to keep every row aligned */
      className="block w-full overflow-hidden rounded-md"
      channel={channel}
      isActive={activeId === channel.id}
      membershipStatus={membership}
      onClick={() => setActiveId(channel.id)} // ✅ signature matches ChannelListItem
      onJoin={() => join(channel.id)}         // ✅ signature matches ChannelListItem
    />
  );
});
ChannelRow.displayName = 'ChannelRow';

/* -------------------------------------------------------------------------- */
/* Main list component                                                        */
/* -------------------------------------------------------------------------- */

export const ChannelListVirtuoso: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  /* Zustand selectors (Map‑safe thanks to latest `channelSelectors`) */
  const channels      = useChannelsList();
  const isLoading     = useIsLoadingChannels();
  const loadChannels  = useLoadWorkspaceChannels();

  /* Single wrapped loader with basic error handling */
  const load = useCallback(async () => {
    setError(null);
    try {
      await loadChannels(); // ← slice action (AbortSignal optional inside slice)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load channels');
    }
  }, [loadChannels]);

  /* Trigger first fetch on mount */
  useEffect(() => { load(); }, [load]);

  /* Guarded render states */
  if (isLoading)             return <LoadingState />;
  if (error)                 return <ErrorState message={error} onRetry={load} />;
  if (channels.length === 0) return <EmptyState message="No channels yet" />;

  /* Virtualised list */
  return (
    <Virtuoso<ChannelData>
      data={channels}
      /* Virtuoso v4 prop names */
      increaseViewportBy={{ main: 200, reverse: 100 }}
      itemContent={(_, ch) => <ChannelRow key={ch.id} channelId={ch.id} />}
      className="custom-scrollbar h-full p-2"
    />
  );
};

ChannelListVirtuoso.displayName = 'ChannelListVirtuoso';
