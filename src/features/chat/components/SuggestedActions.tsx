// === File: src/features/chat/components/SuggestedActions.tsx ===
// Description: Action suggestions component for quests, refactored to use configuration and incorporating UX/a11y improvements.
// v1.17 - Corrected Syntax Error

'use client'; // Added "use client" as components with hooks/event handlers need it

import React from 'react';''
import { Button } from '@/components/ui/Button'; // Ensure this path and export are correct
import { Tooltip } from '@/components/ui/Tooltip'; // Ensure this path and export are correct
import { cn } from '@/lib/utils';
import type { AsrayaAgentId } from '@/types/agent'; // Use type import
import type { QuestSuggestionInput } from '@/types/quest'; // Import the correct type from centralized types

// --- Static Configuration for Suggested Actions ---
// Defines the default appearance and behavior for different action types.
interface SuggestionConfig {
    label: string; // Default display text for the button
    explanation: string; // Default tooltip explanation
    icon?: string; // Default icon identifier (e.g., 'code', 'search')
    className?: string; // Additional base CSS classes for the button
}

// --- Configuration Map ---
// Maps action identifier strings (from QuestSuggestionInput.action) to their configuration.
// TODO: Expand with all planned action types and refine defaults.
const SUGGESTED_ACTION_CONFIG: Record<string, SuggestionConfig> = {
    'generate_code': {
        label: 'Generate Code',
        explanation: 'Suggests generating code based on the current context.',
        icon: 'code',
    },
    'install_dependency': {
        label: 'Install Dependency',
        explanation: 'Suggests installing a package or library.',
        icon: 'package',
    },
    'define_personas': {
        label: 'Define Personas',
        explanation: 'Create detailed personas representing key audience segments.',
        icon: 'users',
    },
    'analyze_competitors': {
        label: 'Analyze Competitors',
        explanation: 'Research content strategies of top competitors.',
        icon: 'search',
    },
    'aggregate_research': {
        label: 'Aggregate Research',
        explanation: 'Compile and organize all research findings.',
        icon: 'file-text',
    },
    'generate_insights': {
        label: 'Generate Insights',
        explanation: 'Analyze patterns and extract key insights.',
        icon: 'lightbulb',
    },
    'explore_more_sources': {
        label: 'Explore Sources',
        explanation: 'Expand research to include more diverse sources.',
        icon: 'compass',
    },
    'create-artifact': {
        label: 'Create Artifact',
        explanation: 'Suggests creating a new artifact (e.g., file, document).',
        icon: 'package',
    },
    'train-agent': {
        label: 'Train Agent',
        explanation: 'Suggests initiating a training session for an agent.',
        icon: 'users', // Consider a more specific icon later, e.g., BrainCircuit
    },
    'start-collab': {
        label: 'Start Collaboration',
        explanation: 'Suggests inviting others or starting a collaborative session.',
        icon: 'users',
    },
    'explore-topic': {
        label: 'Explore Topic',
        explanation: 'Suggests exploring a related topic further.',
        icon: 'compass',
    },
    'default_action': { // Fallback configuration for unknown action types
        label: 'Suggest Action',
        explanation: 'A generic suggested action based on context.',
        icon: 'lightbulb', // Changed default to lightbulb
    },
};

// --- Icon Helper Function ---
// Maps icon identifier strings to actual icon elements (using emojis as placeholders).
function getActionIcon(iconName?: string): React.ReactNode {
    if (!iconName) return '💡'; // Default icon if none specified

    // TODO: Replace emojis with a proper SVG/Font Icon library implementation (e.g., lucide-react).
    const iconMap: Record<string, string> = {
        code: '💻',
        package: '📦',
        database: '🗃️',
        users: '👥',
        search: '🔍',
        'file-text': '📄',
        lightbulb: '💡',
        compass: '🧭',
        sparkles: '✨', // Added from previous example
        BrainCircuit: '🧠', // Added from previous example
    };
    const icon = iconMap[iconName] || '🔄'; // Default fallback icon for unknown names

    // Warn in development if an icon name isn't recognized
    if (icon === '🔄' && process.env.NODE_ENV === 'development') {
        console.warn(`[SuggestedActions] Unknown icon key: "${iconName}". Using fallback.`);
    }
    return icon;
}

// --- Component Props Interface ---
interface SuggestedActionsProps {
    /** Array of suggestion data objects using the central QuestSuggestionInput type. */
    suggestions: QuestSuggestionInput[];
    /** The ID of the current quest, needed for context when an action is clicked. */
    questId: string;
    /** The ID of the currently globally active agent, used for highlighting mismatches. */
    globalActiveAgentId?: AsrayaAgentId | string;
    /** Callback function triggered when a suggestion button is clicked. Passes the full suggestion object. */
    onActionClick?: (suggestion: QuestSuggestionInput, questId: string, args?: Record<string, any>) => void;
    /** If true, displays a loading indicator instead of the suggestions. */
    loading?: boolean;
    /** If true, disables all suggestion buttons. */
    disabled?: boolean;
    /** Optional CSS class name to apply to the main container div. */
    className?: string;
}

// --- SuggestedActions Component ---
export const SuggestedActions = React.memo(({
    suggestions,
    questId,
    globalActiveAgentId,
    onActionClick,
    loading = false,
    disabled = false,
    className
}: SuggestedActionsProps) => { // Opening brace for the arrow function body

    // Handle empty suggestions or loading state
    if ((!suggestions || suggestions.length === 0) && !loading) {
        return null;
    }

    // *** Start of the main return statement ***
    return (
        <div className={cn(
            'flex flex-col gap-y-2 md:flex-row md:flex-wrap md:gap-2', // Layout classes
            className // Merge external classes
        )}>
            {loading ? (
                // --- Loading State Indicator ---
                <div className="w-full flex items-center justify-center py-4">
                    <div className="h-5 w-5 rounded-full border-2 border-[var(--border-muted)] border-t-[var(--agent-color-primary)] animate-spin" />
                    <span className="ml-2 text-sm text-[var(--text-muted)]">Loading suggestions...</span>
                </div>
            ) : (
                // --- Render Suggestions ---
                suggestions.map((suggestion) => {
                    // Configuration lookup with fallback
                    const config = SUGGESTED_ACTION_CONFIG[suggestion.action] || SUGGESTED_ACTION_CONFIG['default_action'];
                    if (!config) {
                        if (process.env.NODE_ENV === 'development') {
                            console.warn(`[SuggestedActions] Config missing for action "${suggestion.action}" & no default found.`);
                        }
                        return null; // Should ideally not happen with default_action defined
                    }

                    // Determine final display properties
                    const finalLabel = suggestion.label || config.label;
                    const finalIcon = suggestion.icon || config.icon;
                    const finalExplanation = suggestion.explanation || config.explanation;

                    // Agent mismatch check
                    const agentMismatch = suggestion.preferredAgentId && globalActiveAgentId && suggestion.preferredAgentId !== globalActiveAgentId;
                    // Log mismatch in dev
                    if (agentMismatch && process.env.NODE_ENV === 'development') {
                        console.warn(`[SuggestedActions] Agent mismatch for "${finalLabel}" (ID: ${suggestion.id}). Preferred: ${suggestion.preferredAgentId}, Active: ${globalActiveAgentId}`);
                    }

                    // Confidence styling
                    // TODO (Styling): Refine confidence visuals
                    const confidenceClass = suggestion.confidence && suggestion.confidence >= 0.9
                        ? 'border-green-500' // Example: Use actual theme variable like var(--color-success)
                        : suggestion.confidence && suggestion.confidence >= 0.7
                            ? 'border-yellow-500' // Example: Use var(--color-warning)
                            : 'border-[var(--border-muted)]';

                    // Tool call hint
                    const isToolCall = suggestion.reason?.toLowerCase().includes('using tool');

                    // ARIA tooltip linkage
                    const tooltipId = `suggestion-tooltip-${suggestion.id}`;
                    const tooltipContentText = suggestion.reason || finalExplanation;

                    return (
                        <React.Fragment key={suggestion.id}> {/* Key on the Fragment */}
                            <Tooltip
                                content={
                                    <div className="max-w-xs p-2 text-xs space-y-1">
                                        {tooltipContentText && <p>{tooltipContentText}</p>}
                                        {agentMismatch && (
                                            <div className="text-xs bg-[var(--color-warning-bg)] text-[var(--color-warning)] p-1 rounded mt-1">
                                                Preferred agent: <span className="font-medium">{suggestion.preferredAgentId}</span>
                                            </div>
                                        )}
                                        {suggestion.confidence !== undefined && (
                                            <p className="opacity-70 mt-1">
                                                Confidence: {Math.round(suggestion.confidence * 100)}%
                                            </p>
                                        )}
                                    </div>
                                }
                            >
                                <Button
                                    variant={agentMismatch ? "outline" : "default"}
                                    size="sm"
                                    className={cn(
                                        "w-full justify-start text-left",
                                        "md:w-auto md:min-w-[10rem]",
                                        agentMismatch && "border-dashed !border-[var(--color-warning)]",
                                        "border-l-4", // Confidence indicator border
                                        confidenceClass,
                                        config.className // Base class from config
                                    )}
                                    onClick={() => onActionClick?.(suggestion, questId, suggestion.args)}
                                    disabled={disabled || loading}
                                    aria-label={finalLabel}
                                    aria-describedby={tooltipContentText ? tooltipId : undefined}
                                >
                                    {finalIcon && (
                                        <span className="mr-2 text-[var(--text-muted)] shrink-0" aria-hidden="true">
                                            {getActionIcon(finalIcon)}
                                        </span>
                                    )}
                                    <span className="truncate flex-1">{finalLabel}</span>
                                    {isToolCall && (
                                        <span className="ml-1 text-xs shrink-0" title="Involves tool use" aria-hidden="true">🛠️</span>
                                    )}
                                    {agentMismatch && (
                                        <span className="ml-1 text-[var(--color-warning)] shrink-0" aria-hidden="true">⚠️</span>
                                    )}
                                </Button>
                            </Tooltip>
                            {/* Hidden description for screen readers */}
                            {tooltipContentText && (
                                <div id={tooltipId} className="sr-only">
                                    {tooltipContentText}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })
            )}
        </div> // End of main return div
    ); // *** End of the main return statement ***

}); // *** CORRECTED: Closing brace and parenthesis for React.memo wrapper ***

SuggestedActions.displayName = 'SuggestedActions';

// --- TODOs ---
// TODO (Action - Brief 4.3): Connect onActionClick prop to state action dispatchers based on the suggestion.action identifier and suggestion.args.
// TODO (Tool Integration - Brief 5.1): Ensure tool usage is correctly handled/displayed during/after action execution.
// TODO (Agent Switch UX - Brief 5.2): Implement full agent switching UX potentially triggered by clicking a mismatched suggestion.
// TODO (Agent Variant Hook): Future enhancement: Fetch agent theme data based on `suggestion.preferredAgentId` and apply agent-specific visual styles.
// TODO (Icons): Replace placeholder emoji icons in getActionIcon with a proper SVG/Font Icon library.