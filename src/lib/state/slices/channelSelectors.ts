/**
 * Channel selectors & hooks
 * --------------------------------------------------------
 * • 100 % SSR‑safe – never touches window/document.
 * • Works whether `channels` is stored as a Map **or** a plain object
 *   (keeps runtime flexible while we migrate older persisted data).
 * • Guards against `undefined` so components don’t crash during the
 *   very first render before ChannelSlice hydrates.
 */

import { shallow } from 'zustand/shallow';
import { useStore } from '@/lib/state/store';

import type { ChannelData }                 from '@/types/channel';
import type { ChannelMembershipStatus }     from './channelSlice';

/* ------------------------------------------------------------------ */
/* 1 · Runtime helpers                                                */
/* ------------------------------------------------------------------ */

/** Convert whatever structure we get into a sorted array of channels */
const mapLikeToSortedArray = (src: unknown): ChannelData[] => {
  const arr: ChannelData[] =
    src instanceof Map
      ? Array.from(src.values())
      : Object.values(src as Record<string, ChannelData> ?? {});

  // Locale‑aware, case‑insensitive sort
  return arr.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

/** Generic “size” helper that tolerates Map | Record | undefined */
const mapLikeSize = (src: unknown): number =>
  src instanceof Map
    ? src.size
    : Object.keys(src as Record<string, unknown> ?? {}).length;

/** Unified lookup that works for Map | Record */
const mapLikeGet = <T>(
  src: unknown,
  key: string,
  fallback: T,
): T => {
  if (src instanceof Map) return (src.get(key) as T) ?? fallback;
  const rec = src as Record<string, T> | undefined;
  return rec?.[key] ?? fallback;
};

/* ------------------------------------------------------------------ */
/* 2 · State selector hooks                                           */
/* ------------------------------------------------------------------ */

/** Sorted list of channels (memoised with `shallow`) */
export const useChannelsList = (): ChannelData[] =>
  useStore(
    (s) => mapLikeToSortedArray(s.channels),
    shallow,
  );

/** Total channel count */
export const useChannelCount = (): number =>
  useStore((s) => mapLikeSize(s.channels));

/** Currently active channel ID (or `null`) */
export const useActiveChannelId = (): string | null =>
  useStore((s) => s.activeChannelId);

/** Fast lookup of a single channel by ID */
export const useChannelById = (id: string): ChannelData | undefined =>
  useStore((s) => mapLikeGet<ChannelData | undefined>(s.channels, id, undefined));

/** Membership status for a channel (defaults to `'not_member'`) */
export const useChannelMembershipStatus = (id: string): ChannelMembershipStatus =>
  useStore((s) =>
    mapLikeGet<ChannelMembershipStatus>(s.channelMembership, id, 'not_member'),
  );

/** Loading & error flags */
export const useIsLoadingChannels   = (): boolean => useStore((s) => s.isLoadingChannels);
export const useChannelLoadingError = (): string | null => useStore((s) => s.errorLoadingChannels);

/* ------------------------------------------------------------------ */
/* 3 · Action selector hooks                                          */
/* ------------------------------------------------------------------ */

export const useSetActiveChannelId    = () => useStore((s) => s.setActiveChannelId);
export const useJoinChannel           = () => useStore((s) => s.joinChannel);
export const useLoadWorkspaceChannels = () => useStore((s) => s.loadWorkspaceChannels);
