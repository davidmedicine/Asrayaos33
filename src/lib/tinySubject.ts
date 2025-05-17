// src/lib/tinySubject.ts

/**
 * @license Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a lightweight, observable value container, similar to a simplified
 * RxJS BehaviorSubject. It holds a current value and notifies subscribers
 * when the value changes.
 *
 * @template T The type of the value held by the subject.
 */
export interface TinySubject<T> {
    /**
     * Gets the current value stored in the subject.
     * @returns {T} The current value.
     * @example
     * const subject = tinySubject('initial');
     * console.log(subject.getValue()); // Output: initial
     */
    getValue(): T;
  
    /**
     * Subscribes to changes in the subject's value.
     * The callback function is immediately called with the current value upon subscription.
     * (Correction: Original spec didn't require immediate call, BehaviorSubject does.
     * Let's stick to *not* calling immediately as per original request's derived needs
     * - it's simpler and matches a plain Subject notification pattern more closely,
     * while still having a current value via `getValue`).
     *
     * @param cb The callback function to execute when the value changes. It receives the new value as an argument.
     * @returns A function to call for unsubscribing the provided callback.
     * @example
     * const subject = tinySubject(0);
     * const unsubscribe = subject.subscribe(value => {
     * console.log('Received value:', value);
     * });
     * subject.next(1); // Output: Received value: 1
     * subject.next(2); // Output: Received value: 2
     * unsubscribe();
     * subject.next(3); // No output, callback was unsubscribed.
     */
    subscribe(cb: (value: T) => void): () => void;
  
    /**
     * Pushes a new value into the subject. If the new value is strictly
     * different (`!==`) from the current value, all subscribed callbacks
     * will be notified with the new value.
     *
     * @param value The new value to set.
     * @example
     * const subject = tinySubject('hello');
     * subject.subscribe(v => console.log(v));
     * subject.next('world'); // Output: world
     * subject.next('world'); // No output, value is the same
     */
    next(value: T): void;
  
    /**
     * Removes all subscribers from the subject.
     * Useful for cleanup, especially in Hot Module Replacement (HMR) scenarios.
     * @example
     * const subject = tinySubject(false);
     * const sub1 = subject.subscribe(v => console.log('Sub 1:', v));
     * const sub2 = subject.subscribe(v => console.log('Sub 2:', v));
     * subject.next(true); // Output: Sub 1: true, Sub 2: true (order may vary)
     * subject.clear();
     * subject.next(false); // No output, all subscribers cleared.
     */
    clear(): void;
  }
  
  /**
   * Creates a new TinySubject instance.
   *
   * @template T The type of the value the subject will hold.
   * @param initial The initial value of the subject.
   * @returns A TinySubject instance.
   * @example Basic Usage
   * ```typescript
   * import { tinySubject, type TinySubject } from './tinySubject';
   *
   * // Create subject for a boolean preference
   * const prefersReducedMotion = tinySubject<boolean>(false);
   *
   * // Get initial value
   * console.log('Initial:', prefersReducedMotion.getValue()); // Initial: false
   *
   * // Subscribe to changes
   * const unsubscribe = prefersReducedMotion.subscribe(enabled => {
   * console.log('Prefers Reduced Motion changed:', enabled);
   * // Update UI or logic based on the preference
   * });
   *
   * // Simulate a change
   * prefersReducedMotion.next(true); // Logs: Prefers Reduced Motion changed: true
   *
   * // Value hasn't changed, no notification
   * prefersReducedMotion.next(true);
   *
   * // Get current value
   * console.log('Current:', prefersReducedMotion.getValue()); // Current: true
   *
   * // Unsubscribe listener
   * unsubscribe();
   *
   * // No notification after unsubscribe
   * prefersReducedMotion.next(false);
   *
   * // Clear all subscribers (e.g., during HMR)
   * const sub1 = prefersReducedMotion.subscribe(v => console.log('Sub 1 active'));
   * const sub2 = prefersReducedMotion.subscribe(v => console.log('Sub 2 active'));
   * prefersReducedMotion.next(true); // Outputs from Sub 1 and Sub 2
   * prefersReducedMotion.clear();
   * prefersReducedMotion.next(false); // No output
   * ```
   */
  export function tinySubject<T>(initial: T): TinySubject<T> {
    /** The current value held by the subject. */
    let currentValue: T = initial;
  
    /** The set of subscribed callback functions. */
    const subscribers = new Set<(value: T) => void>();
  
    const getValue = (): T => {
      return currentValue;
    };
  
    const subscribe = (cb: (value: T) => void): (() => void) => {
      subscribers.add(cb);
      // Return the unsubscribe function
      return () => {
        subscribers.delete(cb); // Set.delete is safe if cb is not present
      };
    };
  
    const next = (newValue: T): void => {
      // Only notify if the value has actually changed (strict equality check)
      if (newValue !== currentValue) {
        currentValue = newValue;
        // Notify all subscribers
        // Iterating directly over the set is generally safe for removals
        // during iteration if it's the *current* item. Robust enough for this use case.
        subscribers.forEach(callback => {
          try {
            callback(currentValue);
          } catch (error) {
            // Prevent one subscriber error from stopping others.
            // Log to console for visibility during development.
            console.error("Error in tinySubject subscriber callback:", error);
          }
        });
      }
    };
  
    const clear = (): void => {
      subscribers.clear();
    };
  
    // Return the public API conforming to the TinySubject interface
    return {
      getValue,
      subscribe,
      next,
      clear,
    };
  }