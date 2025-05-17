/**
 * channelSlice.ts – stub implementation that satisfies all selectors
 * and UI while you wire the real backend later.
 */

import { StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { StoreState } from '@/lib/state/store';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
export interface ChannelData {
  id: string;
  name: string;
  type: 'public' | 'private' | 'secret';
  coherence?: number;
}

export type ChannelMembershipStatus = 'member' | 'pending' | 'not_member';

export interface ChannelSlice {
  /* ----- state ---------------------------------------------------- */
  channels: Map<string, ChannelData>;
  channelMembership: Map<string, ChannelMembershipStatus>;
  activeChannelId: string | null;
  isLoadingChannels: boolean;
  errorLoadingChannels: string | null;

  /* ----- actions -------------------------------------------------- */
  setActiveChannelId: (id: string | null) => void;
  setChannels: (list: ChannelData[]) => void;
  loadWorkspaceChannels: () => Promise<void>;
  joinChannel: (id: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Initial state                                                       */
/* ------------------------------------------------------------------ */
const initState: Omit<
  ChannelSlice,
  | 'setActiveChannelId'
  | 'setChannels'
  | 'loadWorkspaceChannels'
  | 'joinChannel'
> = {
  channels: new Map(),
  channelMembership: new Map(),
  activeChannelId: null,
  isLoadingChannels: false,
  errorLoadingChannels: null,
};

/* ------------------------------------------------------------------ */
/* Mock data (replace with API later)                                  */
/* ------------------------------------------------------------------ */
const mockChannels: ChannelData[] = [
  { id: 'gen', name: 'general', type: 'public', coherence: 78 },
  { id: 'dev', name: 'development', type: 'public', coherence: 92 },
  { id: 'ux', name: 'design‑ux', type: 'private', coherence: 83 },
];

const mockMembership = new Map<string, ChannelMembershipStatus>([
  ['gen', 'member'],
  ['dev', 'member'],
  ['ux', 'not_member'],
]);

/* ------------------------------------------------------------------ */
/* Slice creator                                                       */
/* ------------------------------------------------------------------ */
export const createChannelSlice: StateCreator<
  StoreState,
  [['zustand/devtools', never]],
  [],
  ChannelSlice
> = devtools((set, get) => ({
  ...initState,

  /* ---- trivial setters ------------------------------------------ */
  setActiveChannelId: (id) =>
    set({ activeChannelId: id }, false, '[channel] setActiveChannelId'),

  setChannels: (list) =>
    set(
      (s) => {
        const map = new Map<string, ChannelData>();
        list.forEach((c) => map.set(c.id, c));
        return {
          channels: map,
          /* clear active id if it disappeared */
          activeChannelId:
            s.activeChannelId && !map.has(s.activeChannelId)
              ? null
              : s.activeChannelId,
        };
      },
      false,
      '[channel] setChannels',
    ),

  /* ---- async actions (mock) ------------------------------------- */
  loadWorkspaceChannels: async () => {
    set({ isLoadingChannels: true, errorLoadingChannels: null }, false, '[channel] load start');

    try {
      // simulate latency
      await new Promise((r) => setTimeout(r, 500));

      get().setChannels(mockChannels);
      set({ channelMembership: new Map(mockMembership) }, false, '[channel] load membership');

      set({ isLoadingChannels: false }, false, '[channel] load success');
    } catch (e: any) {
      set(
        { isLoadingChannels: false, errorLoadingChannels: String(e) },
        false,
        '[channel] load error',
      );
      throw e; // so the caller hook can display error
    }
  },

  joinChannel: async (id) => {
    if (get().channelMembership.get(id) !== 'not_member') return;

    // optimistic state
    set(
      (s) => {
        s.channelMembership.set(id, 'pending');
      },
      false,
      '[channel] join → pending',
    );

    try {
      await new Promise((r) => setTimeout(r, 500)); // fake network

      set(
        (s) => {
          s.channelMembership.set(id, 'member');
        },
        false,
        '[channel] join → success',
      );
    } catch (e) {
      // rollback
      set(
        (s) => {
          s.channelMembership.set(id, 'not_member');
        },
        false,
        '[channel] join → error',
      );
      throw e;
    }
  },
}));
