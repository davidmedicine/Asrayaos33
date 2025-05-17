// === File: asrayaos3.4/src/lib/utils.ts ===

/**
 * utils.ts
 * Common utility functions for the application.
 * Includes class merging, debounce, sleep, math, formatting, generation,
 * environment checks, and safe local storage access.
 * (v10.6 - Enhanced)
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class values into a single string with Tailwind CSS awareness.
 * Uses clsx for conditional classes and tailwind-merge to resolve conflicts.
 * @param inputs Class values to combine.
 * @returns A merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Creates a debounced function that delays invoking the provided function
 * until after `delay` milliseconds have elapsed since the last time
 * the debounced function was invoked.
 * @param fn The function to debounce.
 * @param delay The number of milliseconds to delay.
 * @returns The new debounced function.
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      fn(...args);
      timeout = null; // Allow garbage collection
    }, delay);
  };
}

/**
 * Returns a promise that resolves after the specified time in milliseconds.
 * Useful for async operations, simulations, or simple delays.
 * @param ms Milliseconds to sleep.
 */
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Constrains a number within the inclusive lower and upper bounds.
 * @param value The number to clamp.
 * @param min The lower bound.
 * @param max The upper bound.
 * @returns The clamped number.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Formats a date string or Date object into a human-readable string.
 * @param dateInput ISO date string or Date object.
 * @param options Intl.DateTimeFormatOptions to customize the output format.
 * @returns Formatted date string, or an empty string if input is invalid.
 */
export function formatDate(
  dateInput: string | Date | undefined | null,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    // Add time options if needed: hour: 'numeric', minute: '2-digit'
  }
): string {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    // Check if date is valid after parsing/creation
    if (isNaN(date.getTime())) {
        return ''; // Return empty for invalid dates
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  } catch (error) {
      console.error("Error formatting date:", error);
      return ''; // Return empty string on formatting error
  }
}

/**
 * Truncates a string to a maximum length and adds ellipsis (...) if needed.
 * Note: Basic implementation using slice, may not be accurate for multibyte characters.
 * Consider Intl.Segmenter for complex i18n scenarios. (Suggestion #3)
 * @param str The string to truncate.
 * @param maxLength The maximum length of the returned string (including ellipsis).
 * @returns The truncated string.
 */
export function truncateString(str: string | null | undefined, maxLength: number): string {
  if (!str) return '';
  if (maxLength <= 3) return '...'; // Handle edge case where maxLength is too small
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Generates a simple random string ID, optionally prefixed.
 * Useful for non-critical, client-side temporary IDs. For globally unique IDs, use uuidv4.
 * @param prefix Optional prefix for the ID.
 * @param length Optional desired length of the random part (default 8).
 * @returns A generated string ID.
 */
export function generateId(prefix = '', length = 8): string { // (Suggestion #1)
  const randomPart = Math.random().toString(36).substring(2, 2 + Math.max(1, length)); // Ensure length >= 1
  return `${prefix}${randomPart}`;
}

/**
 * Generates a random hexadecimal string of a specified length.
 * @param length Desired length of the hex string (default 8).
 * @returns A random hex string.
 */
export function randomHex(length = 8): string { // (Suggestion #4)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // Use crypto for better randomness if available
        const bytes = new Uint8Array(Math.ceil(length / 2));
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').slice(0, length);
    } else {
        // Fallback to Math.random (less secure)
        console.warn("Crypto API not available, using Math.random for randomHex (less secure).");
        return [...Array(length)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
    }
}

/**
 * Generates a Version 4 UUID (Universally Unique Identifier).
 * Uses the standard crypto.randomUUID() method.
 * @returns A UUID string.
 */
export function uuidv4(): string { // (Suggestion #4)
    if (typeof crypto === 'undefined' || !crypto.randomUUID) {
        // Fallback or error for environments without crypto.randomUUID
        console.error("crypto.randomUUID() not available. Cannot generate UUID v4.");
        // Consider a polyfill or alternative library like 'uuid' if needed in such environments
        // For now, return a less unique fallback or throw error
        return `fallback-${generateId()}-${Date.now()}`;
    }
    return crypto.randomUUID();
}


/**
 * A function that performs no operation. Useful as a default callback.
 */
export const noop = (): void => {}; // (Suggestion #2)

/**
 * Checks if a value is considered empty.
 * Empty values include: null, undefined, empty string, empty array, empty object.
 * @param val The value to check.
 * @returns True if the value is empty, false otherwise.
 */
export function isEmpty(val: any): boolean { // (Suggestion #2)
  if (val == null) { // Checks for null and undefined
    return true;
  }
  if (typeof val === 'string' && val.trim().length === 0) {
    return true;
  }
  if (Array.isArray(val) && val.length === 0) {
    return true;
  }
  if (typeof val === 'object' && Object.keys(val).length === 0) {
    // Note: This doesn't check for Map or Set emptiness, add if needed
    return true;
  }
  return false;
}


/**
 * Checks if the code is currently running in a browser environment.
 * @returns True if running in a browser, false otherwise (e.g., SSR).
 */
export const isClient = (): boolean => typeof window !== 'undefined';

/**
 * Provides safe access to localStorage with SSR checks and error handling.
 */
export const safeLocalStorage = {
  /** Safely retrieves an item from localStorage. */
  get: <T>(key: string, defaultValue: T): T => {
    if (!isClient()) return defaultValue;
    try {
      const item = localStorage.getItem(key);
      // Add check for 'undefined' string which JSON.parse turns into undefined
      return item !== null && item !== 'undefined' ? JSON.parse(item) : defaultValue;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') { // Dev-only log
        console.error(`Error reading localStorage key "${key}":`, error);
      }
      return defaultValue;
    }
  },
  /** Safely sets an item in localStorage. */
  set: <T>(key: string, value: T): void => {
    if (!isClient()) return;
    try {
      // Prevent storing literal undefined
      if (value === undefined) {
          localStorage.removeItem(key);
      } else {
          localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
       if (process.env.NODE_ENV === 'development') { // Dev-only log
         console.error(`Error setting localStorage key "${key}":`, error);
       }
    }
  },
  /** Safely removes an item from localStorage. */
  remove: (key: string): void => {
    if (!isClient()) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
       if (process.env.NODE_ENV === 'development') { // Dev-only log
        console.error(`Error removing localStorage key "${key}":`, error);
       }
    }
  }
};

// Ensure file ends with a newline