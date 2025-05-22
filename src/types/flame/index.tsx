/**
 * Re-exported First Flame payload types for shared use across the app.
 * Keeping these in @/types avoids pulling in the full module when only
 * the network payload definitions are required.
 */
export type {
  FlameStatusPayload,
  FlameStatusResponse,
} from '@flame';
