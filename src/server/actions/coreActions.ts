// src/server/actions/coreActions.ts
'use server'; // Mark this file as containing Server Actions

import { UserInfo } from '@/lib/state/slices/coreSlice'; // Assuming UserInfo type is exported from coreSlice or a types file

// Define the expected return structure for core data
// Adjust this based on what coreSlice actually needs
interface CoreDataResult {
  success: boolean;
  user: UserInfo | null;
  // Add other core data fields needed, e.g.:
  // notificationsCount: number;
  // settings: Record<string, any>;
  error?: string;
}

/**
 * PLACEHOLDER SERVER ACTION
 * Simulates fetching essential core application data.
 * In a real implementation, this would fetch data from a database (using Drizzle/Supabase)
 * or other backend services based on the authenticated user.
 *
 * @returns A promise resolving to the core application data (currently mock data).
 */
export async function loadCoreDataAction(): Promise<CoreDataResult> {
  console.log('[Server Action Placeholder] loadCoreDataAction called');

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // --- Mock Data ---
  // Replace this with actual data fetching logic later
  const mockUser: UserInfo = {
    id: 'user-mock-123',
    name: 'Asraya User',
    email: 'user@example.com',
    // Add other relevant user fields if needed by coreSlice
  };

  // Simulate success
  return {
    success: true,
    user: mockUser,
    // notificationsCount: 0,
    // settings: {},
  };

  /*
  // Simulate failure (example)
  return {
    success: false,
    user: null,
    error: 'Failed to load core data (Simulated Error)',
  };
  */
}

// Add other core-related server actions here later if needed