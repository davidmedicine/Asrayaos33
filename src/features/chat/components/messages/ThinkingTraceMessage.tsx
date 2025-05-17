// === File: src/features/chat/components/messages/ThinkingTraceMessage.tsx ===

// Description: Component for rendering agent thinking traces from stream events, with enhanced styling and accessibility.



import React from 'react';

import { motion } from 'framer-motion'; // Added for animations

import { cn } from '@/lib/utils';

import { StreamEvent } from '@/types';

import { AsrayaAgentId } from '@/types/agent';

import { getAgentData } from '@/lib/core/agentRegistry'; // Import agent data utility



// --- Helper: Step Type Icons ---



// Provides accessible icons for different thinking step types.

// TODO: Replace emojis with a proper Icon component library (e.g., lucide-react)

const StepTypeIcon = ({ stepType }: { stepType: string }) => {

  const iconMap: Record<string, { icon: string; label: string }> = {

    thought: { icon: '🧠', label: 'Thought' },

    action: { icon: '⚙️', label: 'Action' },

    observation: { icon: '👁️', label: 'Observation' },

    response: { icon: '💬', label: 'Response Generation' },

    tool_code: { icon: '💻', label: 'Tool: Code Execution' }, // Example tool step

    tool_search: { icon: '🔍', label: 'Tool: Search' }, // Example tool step

  };

  const { icon, label } = iconMap[stepType] || { icon: '🔄', label: 'Processing Step' };



  return <span title={label}>{icon}</span>;

};



// --- Component Props ---



interface ThinkingTraceMessageProps {

  event: StreamEvent;

  globalActiveAgentId?: AsrayaAgentId | string; // Allow string for flexibility if IDs aren't strictly AsrayaAgentId type

  isDebug?: boolean;

  className?: string;

}



// --- Component Implementation ---



export const ThinkingTraceMessage = React.memo(({

  event,

  globalActiveAgentId,

  isDebug = false,

  className

}: ThinkingTraceMessageProps) => {

  // Extract data from event metadata

  const agentName = event.part.metadata?.agentName || globalActiveAgentId || 'unknown';

  const stepType = event.part.metadata?.stepType || 'thought';

  const text = event.part.text || '';



  // Determine if this trace is from the globally active agent

  const isActiveAgent = agentName === globalActiveAgentId;



  // Get agent-specific data (color, symbol)

  const traceAgentData = getAgentData(agentName, globalActiveAgentId || 'oracle'); // Provide fallback if needed

  const traceAgentColorVar = traceAgentData.colorPrimary; // CSS variable for the agent's primary color

  const traceAgentSymbol = traceAgentData.symbol;



  // Data attributes for potential future styling/grouping

  const dataAttributes = {

    'data-agent-name': agentName,

    'data-step-type': stepType,

    'data-agent-color': isActiveAgent ? 'primary' : 'muted', // For potential CSS targeting

    'data-step': stepType, // Duplicate for convenience? Or remove data-step-type

  };



  return (

    <motion.div

      // Animation on entry

      initial={{ opacity: 0, y: 5 }}

      animate={{ opacity: 1, y: 0 }}

      transition={{ duration: 0.2, ease: 'easeOut' }}

      // Base styling and layout

      className={cn(

        'group relative pl-8 pr-3 py-2 text-sm rounded-md my-1 transition-colors',

        'bg-[var(--bg-surface)]', // Base background

        'border-l-2', // Left border width

        'hover:bg-[var(--bg-hover)]', // Hover background

        'text-[var(--text-muted)] italic', // Default text style for traces

        // Apply opacity based on whether the agent is active

        isActiveAgent ? 'opacity-100' : 'opacity-80 hover:opacity-100', // Slightly dimmed if not active

        className // Merge with external classes

      )}

      // Apply dynamic border color using inline style

      style={{ borderColor: traceAgentColorVar }}

      {...dataAttributes} // Spread data attributes

    >

      {/* Optional Accent Glow (subtle visual enhancement) */}

      <div

        className="absolute left-0 top-0 bottom-0 w-[3px] opacity-50 rounded-l-sm pointer-events-none"

        style={{ backgroundColor: traceAgentColorVar }}

        aria-hidden="true"

      />



      {/* Step type icon */}

      <div className="absolute left-2 top-[9px] text-base leading-none opacity-70 group-hover:opacity-100 transition-opacity">

         <StepTypeIcon stepType={stepType} />

      </div>



      {/* Agent name label (visible on hover or if not active agent or debug mode) */}

      {(!isActiveAgent || isDebug) && (

        <div className={cn(

          'absolute top-1 right-2 text-[10px] px-1.5 py-0.5 rounded font-medium z-10', // Ensure badge is above content

          // Use agent color for active agent badge, muted for others

          isActiveAgent

            ? 'bg-[var(--agent-color-primary-transparent)] text-[var(--agent-color-primary)]'

            // Use a standard muted style for non-active agent traces

            : 'bg-[var(--bg-muted)] text-[var(--text-muted)]',

          // Control visibility

          isDebug ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity duration-150'

        )}>

          {agentName} {isDebug && traceAgentSymbol ? traceAgentSymbol : ''}

        </div>

      )}



      {/* Thinking content with accessibility attributes */}

      <div

        className="whitespace-pre-wrap break-words"

        role="note" // Semantic role for assistive tech

        aria-label={`Agent thinking trace by ${agentName}, type ${stepType}`} // Describe content for screen readers

      >

        {text}

      </div>



      {/* Debug information (only visible in debug mode) */}

      {isDebug && (

        <div className="mt-2 text-[10px] bg-[var(--bg-muted)] p-1.5 rounded leading-tight">

          <div>Agent: {agentName} {traceAgentSymbol ?? ''}</div>

          <div>TaskId: {event.taskId}</div>

          <div>Type: {event.type}</div>

          <div>Step: {stepType}</div>

          <div>Timestamp: {new Date(event.timestamp).toLocaleTimeString()}</div>

          {event.part.metadata && Object.keys(event.part.metadata).length > 0 && (

            <div>Metadata: <pre className="inline whitespace-pre-wrap">{JSON.stringify(event.part.metadata, null, 2)}</pre></div>

          )}

        </div>

      )}

    </motion.div>

  );

});



ThinkingTraceMessage.displayName = 'ThinkingTraceMessage';



// TODO (Styling - Brief 3.X): Refine border style, active agent highlight (e.g., brighter background?), thinking dots animation?.

// TODO (UX - Brief 5.3): Consider agent-specific animations or more distinct visual cues beyond color.

// TODO: Replace emoji icons in StepTypeIcon with a proper Icon component library.