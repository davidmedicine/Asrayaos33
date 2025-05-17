'use client';

/**
 * This file serves as a bridge for the refactored PanelGroup component.
 * It's now organized into a directory structure with more focused files.
 * 
 * This file forwards all exports from the new structure to maintain
 * backward compatibility with any code that imports from this path.
 */

// Re-export everything from the new modular structure
export * from './PanelGroup/index';
export { default } from './PanelGroup/index';