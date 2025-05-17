/**
 * command.ts
 * TypeScript definitions related to the Command Menu (v10.6).
 */

import { CapabilityId } from '@/lib/core/permissions';

/**
 * The context in which a command is executed
 */
export interface CommandContext {
  contextKey?: string | null; // e.g., 'asraya:chat:agent123'
  data?: Record<string, any>; // Flexible payload for additional context
}

/**
 * Type for command scope
 */
export type CommandScope = 'global' | 'chat' | 'world' | 'memory' | 'settings' | 'community' | string;

/**
 * Possible command result types for execution, especially for async/LangGraph commands
 */
export type CommandResult =
  | { type: 'text'; value: string }
  | { type: 'stream'; value: AsyncIterable<string> }
  | { type: 'json'; value: Record<string, any> }
  | { type: 'file'; value: Blob | File }
  | { type: 'error'; message: string }
  | { type: 'redirect'; target: string } // For navigation/routing changes
  | { type: 'stateUpdate'; payload: any }; // For state changes

/**
 * Command definition
 */
export interface CommandDefinition {
  // Core identification 
  id: string; // Unique identifier
  label: string; // Display text in menu
  trigger?: string; // Shorthand to invoke the command, e.g., '/help'
  
  // Handler and execution options
  handler: (context: CommandContext) => void | Promise<void | CommandResult>;
  isAsync?: boolean; // Whether command execution is asynchronous (default = false)
  cooldownSeconds?: number; // Optional cooldown to rate-limit this command
  
  // UI presentation
  icon?: React.ReactNode | string; // React component, element or icon name
  description?: string; // Longer description for help text
  group?: string; // Optional group/category name for menu organization
  weight?: number; // Lower = higher priority for sorting (default = 100)
  hidden?: boolean; // If command should be hidden from UI but callable (default = false)
  disabledReason?: string; // Message explaining why command is unavailable (for UI tooltips)
  
  // Categorization and discovery  
  scope?: CommandScope | CommandScope[]; // Where this command is available (default = 'global')
  tags?: string[]; // Additional tags for filtering/grouping
  keyboardShortcut?: string[]; // E.g. ['⌘', 'K'] or ['Ctrl', 'K']
  aliases?: string[]; // Alternative terms for fuzzy search
  exampleUsage?: string[]; // Example usages for documentation/hints
  
  // Input handling
  expectsInput?: boolean; // Whether command expects additional input (default = false)
  placeholder?: string; // Placeholder text for input commands
  inputType?: 'text' | 'textarea' | 'select' | 'file' | 'date' | 'tags' | 'custom' | string;
  renderInputUI?: () => React.ReactNode; // Optional custom input UI component
  
  // Security and permissions
  requiredAgentId?: string; // If command requires a specific agent
  requiredCapability?: CapabilityId; // If command requires a specific capability
  
  // User confirmation
  requiresConfirmation?: boolean; // Whether to show confirmation dialog (default = false)
  confirmationMessage?: string; // Custom confirmation message
  
  // Extensibility
  meta?: Record<string, any>; // Optional catch-all for plugin metadata
}

/**
 * Backward compatibility alias
 */
export type Command = CommandDefinition;