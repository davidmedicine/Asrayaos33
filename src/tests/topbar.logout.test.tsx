import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Topbar from '@/components/layout/Topbar';
import { supabase } from '@/lib/supabase_client/client';

// Mock the supabase client
vi.mock('@/lib/supabase_client/client', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock zustand store
vi.mock('@/lib/state/store', () => ({
  useStore: () => ({
    user: { name: 'Test User', avatarUrl: null },
    isSidebarOpen: false,
    isSidebarMinimized: false,
    toggleSidebarOpen: vi.fn(),
    toggleSidebarMini: vi.fn(),
  }),
}));

// Mock window.location
const originalLocation = window.location;

describe('Topbar Logout Functionality', () => {
  beforeEach(() => {
    // Mock window.location.href
    delete window.location;
    window.location = { ...originalLocation, href: '' };
    
    // Reset mocks before each test
    vi.clearAllMocks();
  });
  
  it('renders the logout button when user is logged in', () => {
    render(<Topbar />);
    const logoutButton = screen.getByTestId('logout-button');
    expect(logoutButton).toBeInTheDocument();
    expect(logoutButton).toHaveAttribute('aria-label', 'Sign out');
  });
  
  it('calls supabase.auth.signOut and redirects to login page when logout button is clicked', async () => {
    render(<Topbar />);
    const logoutButton = screen.getByTestId('logout-button');
    
    // Click the logout button
    fireEvent.click(logoutButton);
    
    // Verify signOut was called
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    
    // Wait for the async function to complete
    await vi.waitFor(() => {
      // Verify redirection
      expect(window.location.href).toBe('/login');
    });
  });
  
  it('redirects to home page on signOut error', async () => {
    // Mock signOut to reject
    vi.mocked(supabase.auth.signOut).mockRejectedValueOnce(new Error('Sign out failed'));
    
    // Spy on console.error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<Topbar />);
    const logoutButton = screen.getByTestId('logout-button');
    
    // Click the logout button
    fireEvent.click(logoutButton);
    
    // Wait for the async function to complete
    await vi.waitFor(() => {
      // Verify error handling
      expect(consoleSpy).toHaveBeenCalled();
      expect(window.location.href).toBe('/');
    });
    
    // Restore console.error
    consoleSpy.mockRestore();
  });
  
  // Restore original window.location after all tests
  afterAll(() => {
    window.location = originalLocation;
  });
});