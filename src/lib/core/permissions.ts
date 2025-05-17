/**
 * permissions.ts
 * Utility functions to check user/agent permissions (v10.6)
 */

import { useCoreStore } from '@/lib/state/slices/coreSlice';
import { getPanelDefinition } from './layoutRegistry';

// Define capability ID type for type safety
export type CapabilityId = string;

// Define Agent Capability structure
export interface AgentCapability {
  id: CapabilityId; // e.g., 'suggestArtifact', 'runRitual'
  requiresScope?: 'chat' | 'world' | 'memory' | string; // Context where capability applies
  experimental?: boolean;
}

// Mapping from user-friendly action names to capability IDs
const actionToCapabilityMap: Record<string, CapabilityId | null> = {
  'createArtifact': 'suggestArtifact',
  'editArtifact': 'memory_edit',
  'deleteArtifact': 'memory_delete',
  'linkArtifacts': 'memory_link',
  'accessWorld': null, // Assume basic world access is default
  'createWorldObject': 'world_create',
  'editWorldObject': 'world_edit',
  'postCommunity': 'community_post',
  'suggestAction': 'suggest_actions',
  'runReflection': 'run_reflections',
  'configureAgent': 'configure_agents',
  'useCommand': null, // Assume commands might have their own permission checks
  'useCapability': null, // Internal action type for direct capability checks
  // Add more action mappings as needed
};

/**
 * Checks if the current user/agent can perform an action.
 */
export function canPerformAction(
  action: string,
  options?: {
    contextKey?: string | null;
    agentId?: string; // Specific agent performing action, defaults to active
    capabilityId?: CapabilityId; // Explicit capability to check
    // Other action-specific context
    artifactType?: string;
    targetId?: string;
  }
): boolean {
  // Non-reactive state access - suitable for utility functions
  const { userProfile, agents, activeAgentId } = useCoreStore.getState();

  // --- 1. Basic User Check ---
  if (!userProfile) return false; // Must be logged in

  // --- 2. Determine Target Agent ---
  const targetAgentId = options?.agentId ?? activeAgentId;
  const agent = targetAgentId ? agents.find(a => a.id === targetAgentId) : null;

  // --- 3. Determine Required Capability ---
  // If capabilityId is directly provided, use it
  // Otherwise, map the action string to a capability ID
  const requiredCapabilityId = options?.capabilityId ?? actionToCapabilityMap[action];

  // --- 4. Perform Capability Check (if required) ---
  if (requiredCapabilityId) {
    if (!agent) return false; // Action requires an agent, but none specified/found

    const agentCapabilities = agent.persona?.capabilities ?? [];
    
    // Find the capability in the agent's list
    const capability = agentCapabilities.find(c => 
      typeof c === 'string' 
        ? c === requiredCapabilityId 
        : c.id === requiredCapabilityId
    );

    if (!capability) return false; // Agent lacks the fundamental capability

    // Convert string capability to object if needed for further checks
    const capabilityObj = typeof capability === 'string' 
      ? { id: capability } as AgentCapability 
      : capability;

    // Check Scope
    if (capabilityObj.requiresScope) {
      const currentScope = options?.contextKey?.split(':')[1];
      if (!currentScope || capabilityObj.requiresScope !== currentScope) return false; // Wrong context
    }

    // Check Experimental Flag
    // Assuming settings access via userProfile or a similar approach
    const experimentalEnabled = userProfile.settings?.experimentalFeaturesEnabled ?? false;
    if (capabilityObj.experimental && !experimentalEnabled) return false;

    // Check User Override (Disabled Capabilities)
    const isDisabled = agent.config?.disabledCapabilities?.includes(requiredCapabilityId);
    if (isDisabled) return false;
  }

  // --- 5. Action-Specific Rules & Context Checks ---
  switch (action) {
    case 'createArtifact': {
      const contextMeta = options?.contextKey ? getPanelDefinition(options.contextKey) : null;
      if (contextMeta?.supportsArtifactCreation === false) return false;
      
      // If artifact type is specified, check if this type is supported
      if (options?.artifactType && Array.isArray(contextMeta?.supportsArtifactCreation)) {
        if (!contextMeta.supportsArtifactCreation.includes(options.artifactType)) return false;
      }
      break;
    }

    case 'configureAgent':
      // Example: Allow configuring own agent or if user has admin role
      if (targetAgentId !== userProfile.defaultAgentId && userProfile.role !== 'admin') return false;
      break;

    // Add checks for other actions as needed
  }

  // --- 6. Default Allow (if no checks failed) ---
  return true;
}

/**
 * Helper function to check if an agent has a specific capability
 */
export function agentHasCapability(
  agentId: string, 
  capabilityId: CapabilityId, 
  contextKey?: string | null
): boolean {
  // Directly checks if agent possesses the capability, including scope/experimental/override checks
  return canPerformAction('useCapability', { agentId, capabilityId, contextKey });
}