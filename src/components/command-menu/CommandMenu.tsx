import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command as CommandPrimitive } from 'cmdk';
import { useCommandStore } from '@/lib/state/slices/commandSlice';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { CommandItem } from './CommandItem';
import { getRegisteredCommands } from '@/lib/core/commandRegistry';
import { canPerformAction } from '@/lib/core/permissions';
import { Command } from '@/types/command';

export function CommandMenu() {
  // Local state to store available commands (fetched from registry, not from store)
  const [availableCommands, setAvailableCommands] = useState<Command[]>([]);
  
  // Get command menu state and actions from store
  const isOpen = useCommandStore(state => state.isOpen);
  const query = useCommandStore(state => state.query);
  const recentCommandIds = useCommandStore(state => state.recentCommandIds);
  const setQuery = useCommandStore(state => state.setQuery);
  const closeMenu = useCommandStore(state => state.closeMenu);
  const openMenu = useCommandStore(state => state.openMenu);
  const toggleMenu = useCommandStore(state => state.toggleMenu);
  const addRecentCommand = useCommandStore(state => state.addRecentCommand);
  
  // Get context from useInteractionContext
  const { 
    activeContextKey, 
    activeAgentId, 
    activeIntentPrediction 
  } = useInteractionContext();
  
  // Fetch commands when menu opens or context changes
  useEffect(() => {
    if (isOpen && activeContextKey) {
      // Get registered commands for this context
      const commands = getRegisteredCommands(activeContextKey);
      
      // Filter commands based on permissions
      const filteredCommands = commands.filter(command => {
        // Skip commands that require a different agent
        if (command.requiredAgentId && command.requiredAgentId !== activeAgentId) {
          return false;
        }
        
        // Check capability permission if specified
        if (command.requiredCapability) {
          return canPerformAction(command.requiredCapability, {
            agentId: activeAgentId,
            contextKey: activeContextKey
          });
        }
        
        return true;
      });
      
      setAvailableCommands(filteredCommands);
    }
  }, [isOpen, activeContextKey, activeAgentId]);
  
  // Reset query when menu opens/closes
  useEffect(() => {
    if (!isOpen && query) {
      setQuery('');
    }
  }, [isOpen, query, setQuery]);
  
  // Set up keyboard shortcuts - Cmd+K / Ctrl+K to open, Escape to close
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      } else if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        toggleMenu();
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [closeMenu, toggleMenu]);
  
  // Derive recommended commands based on intent prediction
  const recommendedCommandsList = useMemo(() => {
    if (!activeIntentPrediction || !availableCommands.length) return [];
    
    // Filter commands based on intent match in tags or command name
    return availableCommands
      .filter(cmd => {
        const matchesTags = cmd.tags?.some(tag => 
          tag.toLowerCase().includes(activeIntentPrediction.toLowerCase())
        );
        const matchesLabel = cmd.label.toLowerCase().includes(activeIntentPrediction.toLowerCase());
        const matchesCommand = cmd.command?.toLowerCase().includes(activeIntentPrediction.toLowerCase());
        
        return matchesTags || matchesLabel || matchesCommand;
      })
      .slice(0, 5); // Limit to 5 recommendations
  }, [activeIntentPrediction, availableCommands]);
  
  // Map recent command IDs to actual command objects
  const recentCommandsList = useMemo(() => {
    if (!availableCommands.length) return [];
    
    return recentCommandIds
      .map(id => availableCommands.find(cmd => cmd.id === id))
      .filter(Boolean) // Remove undefined values
      .slice(0, 5); // Limit to 5 recent commands
  }, [recentCommandIds, availableCommands]);
  
  // Create a set of IDs for commands already displayed
  const displayedCommandIds = useMemo(() => {
    const displayedIds = new Set<string>();
    
    // Add recommended and recent command IDs to the set
    recommendedCommandsList.forEach(cmd => displayedIds.add(cmd.id));
    recentCommandsList.forEach(cmd => displayedIds.add(cmd.id));
    
    return displayedIds;
  }, [recommendedCommandsList, recentCommandsList]);
  
  // Filter general commands based on query and exclude already displayed commands
  const filteredGeneralCommands = useMemo(() => {
    if (!availableCommands.length) return [];
    
    // Start with all commands not already displayed in other sections
    let commands = availableCommands.filter(cmd => !displayedCommandIds.has(cmd.id));
    
    // Apply query filter if query exists
    if (query) {
      const normalizedQuery = query.toLowerCase();
      commands = commands.filter(command => {
        return (
          command.label.toLowerCase().includes(normalizedQuery) ||
          (command.command && command.command.toLowerCase().includes(normalizedQuery)) ||
          (command.tags && command.tags.some(tag => tag.toLowerCase().includes(normalizedQuery)))
        );
      });
    }
    
    return commands;
  }, [query, availableCommands, displayedCommandIds]);
  
  // Handle command execution
  const handleSelect = (id: string) => {
    const command = availableCommands.find(cmd => cmd.id === id);
    if (command) {
      command.handler({ contextKey: activeContextKey });
      addRecentCommand(id);
      setQuery('');
      closeMenu();
    }
  };
  
  // Don't render when closed
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/50 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeMenu}
      />
      
      {/* Command menu */}
      <motion.div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <CommandPrimitive 
          label="Command Menu"
          shouldFilter={false} // Handle filtering manually
        >
          {/* Header with active agent */}
          <div className="flex items-center px-3 pt-3 pb-2">
            <AgentChipDisplay size="sm" />
          </div>
          
          {/* Search input */}
          <div className="border-b border-[var(--border-default)] px-3 pb-3">
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search commands..."
              className="w-full bg-[var(--bg-muted)] py-2 px-3 rounded-md outline-none placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--agent-color-primary)]"
              autoFocus
            />
          </div>
          
          <CommandPrimitive.List className="max-h-[300px] overflow-y-auto py-2">
            {/* Empty state */}
            {availableCommands.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--text-muted)]">
                Loading commands...
              </div>
            ) : filteredGeneralCommands.length === 0 && 
               recommendedCommandsList.length === 0 && 
               recentCommandsList.length === 0 ? (
              <CommandPrimitive.Empty className="py-6 text-center text-sm text-[var(--text-muted)]">
                No commands found.
              </CommandPrimitive.Empty>
            ) : null}
            
            {/* Recommended commands (if search is empty) */}
            {!query && recommendedCommandsList.length > 0 && (
              <CommandPrimitive.Group heading="Recommended">
                {recommendedCommandsList.map(cmd => (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    onSelect={() => handleSelect(cmd.id)}
                    isRecommended
                  />
                ))}
              </CommandPrimitive.Group>
            )}
            
            {/* Recent commands (if search is empty) */}
            {!query && recentCommandsList.length > 0 && (
              <CommandPrimitive.Group heading="Recent">
                {recentCommandsList.map(cmd => (
                  <CommandItem
                    key={cmd.id} 
                    command={cmd}
                    onSelect={() => handleSelect(cmd.id)}
                  />
                ))}
              </CommandPrimitive.Group>
            )}
            
            {/* Filtered general commands */}
            {filteredGeneralCommands.length > 0 && (
              <CommandPrimitive.Group heading={query ? "Results" : "All Commands"}>
                {filteredGeneralCommands.map(cmd => (
                  <CommandItem
                    key={cmd.id}
                    command={cmd}
                    onSelect={() => handleSelect(cmd.id)}
                  />
                ))}
              </CommandPrimitive.Group>
            )}
          </CommandPrimitive.List>
          
          {/* Footer with key hints */}
          <div className="border-t border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-muted)] flex justify-between">
            <span>Navigate: ↑↓</span>
            <span>Select: ↵</span>
            <span>Close: Esc</span>
          </div>
        </CommandPrimitive>
      </motion.div>
    </AnimatePresence>
  );
}