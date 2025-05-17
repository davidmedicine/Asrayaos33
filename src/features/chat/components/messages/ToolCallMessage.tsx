// === File: src/features/chat/components/messages/ToolCallMessage.tsx ===

// Description: Component for rendering tool call steps from stream events.



import React from 'react';

import { motion } from 'framer-motion'; // Added for animations

import { cn } from '@/lib/utils';

import { StreamEvent } from '@/types';

import { AsrayaAgentId } from '@/types/agent';

import { getAgentData } from '@/lib/core/agentRegistry'; // Import agent data utility



// --- Component Props ---



interface ToolCallMessageProps {

  event: StreamEvent;

  globalActiveAgentId?: AsrayaAgentId | string;

  isDebug?: boolean;

  className?: string;

}



// --- Component Implementation ---



export const ToolCallMessage = React.memo(({

  event,

  globalActiveAgentId,

  isDebug = false,

  className

}: ToolCallMessageProps) => {

  // Extract data from event metadata and part

  const agentName = event.part.metadata?.agentName || globalActiveAgentId || 'unknown';

  const toolName = event.part.metadata?.toolName || 'unknown_tool';

  // Assuming tool input/output might be in 'text' or specific metadata fields

  // For simplicity, we'll primarily use 'text' if available, or fallback to metadata inspection in debug

  const text = event.part.text?.trim() || ''; // Trim whitespace

  const toolInput = event.part.metadata?.toolInput; // Optional: Extract specific input if needed



  // Determine if this trace is from the globally active agent

  const isActiveAgent = agentName === globalActiveAgentId;



  // Get agent-specific data (color, symbol)

  const traceAgentData = getAgentData(agentName, globalActiveAgentId || 'oracle'); // Provide fallback

  const traceAgentColorVar = traceAgentData.colorPrimary; // CSS variable for the agent's primary color

  const traceAgentSymbol = traceAgentData.symbol;

  const agentThemeClass = `theme-${agentName?.toLowerCase().replace(/[^a-z0-9]/g, '-') ?? 'default'}`; // Fallback theme class



  // Data attributes for potential future styling/grouping

  const dataAttributes = {

    'data-agent-name': agentName,

    'data-step-type': 'tool_call', // Specific step type

    'data-tool-name': toolName,

    'data-agent-color': isActiveAgent ? 'primary' : 'muted',

  };



  return (

    <motion.div

      // Animation on entry

      initial={{ opacity: 0, y: 5 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.2, ease: 'easeOut' }}

      // Base styling and layout, using logical properties for RTL support

      className={cn(

        'group relative ps-8 pe-3 py-2 text-sm rounded-md my-1 transition-colors font-mono', // Use monospace font for tool calls

        'bg-[var(--bg-muted)]', // Slightly different background from thinking trace

        'border-s-2', // Left border (start) width

        'hover:bg-[var(--bg-hover)]', // Hover background

        'text-[var(--text-muted)]', // Default text style

        // Apply opacity based on whether the agent is active

        isActiveAgent ? 'opacity-100' : 'opacity-80 hover:opacity-100', // Slightly dimmed if not active

        agentThemeClass, // Apply fallback theme class

        className // Merge with external classes

      )}

      // Apply dynamic border color using inline style, with fallback

      style={{ borderColor: traceAgentColorVar || 'var(--border-muted)' }}

      {...dataAttributes} // Spread data attributes

    >

      {/* Optional Accent Glow (subtle visual enhancement) */}

      <div

        className="absolute start-0 top-0 bottom-0 w-[3px] opacity-60 rounded-s-sm pointer-events-none"

        style={{ backgroundColor: traceAgentColorVar || 'var(--border-muted)' }}

        aria-hidden="true"

      />



      {/* Tool icon */}

      <div className="absolute start-2 top-[9px] text-base leading-none opacity-70 group-hover:opacity-100 transition-opacity" title={`Tool Call: ${toolName}`}>

        🛠️ {/* Generic Tool Icon - TODO: Could use specific icons based on toolName */}

      </div>



      {/* Agent name label (visible on hover or if not active agent or debug mode) */}

      {(!isActiveAgent || isDebug) && (

        <div className={cn(

          'absolute top-1 end-2 text-[10px] px-1.5 py-0.5 rounded font-medium z-10', // Use end-2 for RTL

          isActiveAgent

            ? 'bg-[var(--agent-color-primary-transparent)] text-[var(--agent-color-primary)]'

            : 'bg-[var(--bg-surface)] text-[var(--text-muted)]', // Use surface for contrast on muted bg

          isDebug ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-150'

        )}>

           {/* Add tooltip with agent description if available */}

          <span title={traceAgentData.description || agentName}>

              {agentName} {isDebug && traceAgentSymbol ? traceAgentSymbol : ''}

          </span>

        </div>

      )}



      {/* Tool Call content with accessibility attributes */}

      <div className="font-semibold text-xs mb-1 text-[var(--text-default)]">

        {toolName}

      </div>

      <div

        className="whitespace-pre-wrap break-words text-xs" // Smaller text for tool details

        role="log" // Semantic role for log-like entries

        aria-label={`Tool call by ${agentName}: ${toolName}`} // Describe content for screen readers

      >

         {/* Display text if available, otherwise indicate input */}

        {text || (toolInput ? `Input: ${JSON.stringify(toolInput)}` : '(No details provided)')}

      </div>



      {/* Debug information (only visible in debug mode) */}

      {isDebug && (

        <div className="mt-2 text-[10px] bg-[var(--bg-surface)] p-1.5 rounded leading-tight">

          <div>Agent: <span title={traceAgentData.description || agentName}>{agentName} {traceAgentSymbol ?? ''}</span></div>

          <div>Tool: {toolName}</div>

          <div>TaskId: {event.taskId}</div>

          <div>Timestamp: {new Date(event.timestamp).toLocaleTimeString()}</div>

          {toolInput && <div>Input: <pre className="inline whitespace-pre-wrap">{JSON.stringify(toolInput, null, 2)}</pre></div>}

          {/* Optionally show full metadata */}

          {event.part.metadata && Object.keys(event.part.metadata).length > 0 && (

            <div>Metadata: <pre className="inline whitespace-pre-wrap">{JSON.stringify(event.part.metadata, null, 2)}</pre></div>

          )}

        </div>

      )}

    </motion.div>

  );

});



ToolCallMessage.displayName = 'ToolCallMessage';



// TODO (Styling - Brief 3.X): Refine visual distinction from ThinkingTraceMessage (e.g., background, border style).

// TODO (Styling - Brief 3.X): Refine overall styling, icon appearance (maybe tool-specific icons?), etc.

// TODO (UX): Consider how to best display complex tool inputs/outputs, potentially collapsible sections.