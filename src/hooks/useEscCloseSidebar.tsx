// src/hooks/useEscCloseSidebar.ts
import { useEffect, RefObject } from 'react';

interface UseEscCloseSidebarProps {
  isMobile: boolean;
  isSidebarOpen: boolean;
  isSidebarMinimized: boolean; // Only relevant if not isMobile
  toggleSidebarOpen: () => void;
  focusRef?: RefObject<HTMLElement>; // Optional ref to focus after closing on desktop
}

/**
 * Custom hook to handle closing the sidebar with the Escape key.
 *
 * - On mobile: Closes the sidebar if it's open.
 * - On desktop: Closes the sidebar if it's open and not minimized (i.e., fully expanded).
 * - Optionally focuses a specified element after closing on desktop.
 */
export const useEscCloseSidebar = ({
  isMobile,
  isSidebarOpen,
  isSidebarMinimized,
  toggleSidebarOpen,
  focusRef,
}: UseEscCloseSidebarProps): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      // Ignore if modifier keys are pressed (e.g., Cmd+Esc)
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return;
      }

      let shouldClose = false;
      if (isMobile) {
        // On mobile, if the sidebar is open, Escape should close it.
        if (isSidebarOpen) {
          shouldClose = true;
        }
      } else {
        // On desktop, if the sidebar is open AND fully expanded (not minimized/rail), Escape should close it.
        // If it's in rail mode, Escape typically shouldn't close it to tray, but this can be adjusted.
        if (isSidebarOpen && !isSidebarMinimized) {
          shouldClose = true;
        }
      }

      if (shouldClose) {
        event.preventDefault(); // Prevent any default Escape key behavior (e.g., exiting fullscreen)
        toggleSidebarOpen();

        // On desktop, if a focusRef is provided, focus it after closing.
        // This is useful for returning focus to the toggle button.
        if (!isMobile && focusRef?.current) {
          // Use queueMicrotask to ensure focus happens after potential DOM updates from toggleSidebarOpen.
          queueMicrotask(() => {
            focusRef.current?.focus();
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobile, isSidebarOpen, isSidebarMinimized, toggleSidebarOpen, focusRef]);
};