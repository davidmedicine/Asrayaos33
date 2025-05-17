// === File: asrayaos3.4/src/lib/core/commandRegistry.ts ===

/**
 * commandRegistry.ts
 * Central registry for defining and retrieving commands based on context.
 */

import { Command, CommandDefinition, CommandScope } from '@/types/command';

// Use a Map for efficient storage and retrieval by command ID
const commandRegistry = new Map<string, Command>();

/**
 * Register a command with the registry
 */
export function registerCommand(command: Command): void {
  if (!command.id) {
    console.error("Cannot register command: Missing ID", command);
    return;
  }
  if (commandRegistry.has(command.id)) {
      console.warn(`Command registry: Overwriting command with ID "${command.id}"`);
  }
  commandRegistry.set(command.id, command);
}

/**
 * Register multiple commands at once
 */
export function registerCommands(commands: Command[]): void {
  commands.forEach(registerCommand);
}

/**
 * Unregister a command by ID
 */
export function unregisterCommand(commandId: string): void {
  if (commandRegistry.has(commandId)) {
    commandRegistry.delete(commandId);
  } else {
    console.warn(`Command registry: Attempted to unregister non-existent command ID "${commandId}"`);
  }
}

/**
 * Get a specific command by ID
 */
export function getCommand(commandId: string): Command | undefined {
  return commandRegistry.get(commandId);
}

/**
 * Get all registered commands, filtered by context if provided.
 * If no contextKey is given, returns only 'global' commands.
 * If contextKey is given, returns 'global' commands PLUS commands matching the specific context scope.
 */
export function getRegisteredCommands(contextKey?: string | null): Command[] {
  const allCommands = Array.from(commandRegistry.values());

  // CORRECTED: Handle the case where no context key is provided
  if (!contextKey) {
    // Return only commands explicitly scoped as 'global'
    return allCommands.filter(cmd => {
      // Skip commands without a defined scope
      if (!cmd.scope) {
          return false;
      }
      // Ensure cmd.scope is treated as an array
      const cmdScopes: CommandScope[] = Array.isArray(cmd.scope)
        ? cmd.scope
        : [cmd.scope];
      // Check if 'global' is included in the command's scopes
      return cmdScopes.includes('global');
    });
  }

  // --- Logic for when contextKey IS provided ---

  // Determine current scope type from contextKey (e.g., 'chat' from 'asraya:chat:agent123')
  const currentScope: CommandScope = (contextKey.split(':')[1] as CommandScope); // Assuming valid format

  // Filter commands based on 'global' scope OR matching the derived currentScope
  return allCommands.filter(cmd => {
    // Skip commands without a defined scope
    if (!cmd.scope) {
        return false;
    }
    // Ensure cmd.scope is always treated as an array
    const cmdScopes: CommandScope[] = Array.isArray(cmd.scope)
      ? cmd.scope
      : [cmd.scope];

    // Check if command is global OR matches the current context scope type
    return cmdScopes.includes('global') || cmdScopes.includes(currentScope);
  });
}

/**
 * Load commands from feature modules at initialization
 * Call this once during app startup
 */
export function initializeCommandRegistry(): void {
  // Placeholder for actual command loading from feature modules
  console.log("Command registry initialized (placeholder - implement actual command loading)");
}

// Example Usage (for testing or demonstration):
/*
const testCmdGlobal: Command = { id: 'cmd-global', name: 'Global Test', scope: 'global', execute: () => console.log('Global Executed') };
const testCmdChat: Command = { id: 'cmd-chat', name: 'Chat Test', scope: 'chat', execute: () => console.log('Chat Executed') };
const testCmdMemory: Command = { id: 'cmd-memory', name: 'Memory Test', scope: 'memory', execute: () => console.log('Memory Executed') };
const testCmdMulti: Command = { id: 'cmd-multi', name: 'Multi Test', scope: ['chat', 'global'], execute: () => console.log('Multi Executed') };
const testCmdNone: Command = { id: 'cmd-none', name: 'No Scope Test', execute: () => console.log('No Scope Executed') }; // Test command with no scope

registerCommands([testCmdGlobal, testCmdChat, testCmdMemory, testCmdMulti, testCmdNone]);

console.log("--- Command Registry Tests ---");
console.log("Commands for null context:", getRegisteredCommands(null).map(c => c.id)); // CORRECTED EXPECT: ['cmd-global', 'cmd-multi']
console.log("Commands for undefined context:", getRegisteredCommands(undefined).map(c => c.id)); // CORRECTED EXPECT: ['cmd-global', 'cmd-multi']
console.log("Commands for 'asraya:chat:agent123':", getRegisteredCommands('asraya:chat:agent123').map(c => c.id)); // Expect: ['cmd-global', 'cmd-chat', 'cmd-multi']
console.log("Commands for 'asraya:memory:abc':", getRegisteredCommands('asraya:memory:abc').map(c => c.id)); // Expect: ['cmd-global', 'cmd-memory']
console.log("Commands for 'asraya:other:xyz':", getRegisteredCommands('asraya:other:xyz').map(c => c.id)); // Expect: ['cmd-global', 'cmd-multi'] (assuming 'other' scope exists and is in cmd-multi) -> Still Expect: ['cmd-global'] if 'other' isn't matched by any specific command scope
*/