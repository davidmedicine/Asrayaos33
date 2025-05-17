2. Context Views

TypeScript

// === File: features/chat/components/ChatListPanel.tsx ===
// [Paste full code from v10.6 pseudocode]
// Description: Panel displaying a list of chat conversations. Uses useInteractionContext for active highlighting. Fetches data via Zustand (hydrated server-side/realtime).
TypeScript

// === File: features/chat/components/ChatThreadPanel.tsx ===
// [Paste full code from v10.6 pseudocode - Includes context menu, highlight artifact creation, directive handling]
// Description: Panel displaying messages within a single chat conversation. Uses useLangGraphStream, useCreateArtifact, useContextMenu, useActionDirectiveHandler, canPerformAction.

import { Panel } from '@/components/panels/Panel';
import { InputBar } from '@/components/input-bar/InputBar';
import { useChatStore } from '@/lib/state/slices/chatSlice';
import { useLangGraphStream } from '@/lib/langgraph/hooks/useLangGraphStream';
import { useCreateArtifact } from '@/hooks/useCreateArtifact';
import { useParams } from 'next/navigation';
import { MessageBubble } from './MessageBubble';
import { useContextMenu } from '@/hooks/useContextMenu';
import { useActionDirectiveHandler } from '@/lib/core/actionDirectiveHandler';
import { canPerformAction } from '@/lib/core/permissions';
import { useInteractionContext } from '@/hooks/useInteractionContext';
import { useEffect, useRef } from 'react';

export function ChatThreadPanel() {
  const params = useParams();
  const agentId = params.agentId as string;
  const contextKey = `asraya:chat:${agentId}`;

  const messages = useChatStore(state => state.getMessages(agentId));
  const { streamState, submitMessage, streamEvents } = useLangGraphStream(agentId);
  const { showContextMenu } = useContextMenu();
  const { triggerArtifactCreationWithModal } = useCreateArtifact();
  const { handleDirective } = useActionDirectiveHandler();
  const { activeAgent } = useInteractionContext();
  const messageListRef = useRef<HTMLDivElement>(null); // For scrolling

  // Note: Initial messages likely fetched server-side (RSC) using Drizzle query.
  // Zustand updated via Supabase Realtime.

  // Scroll to bottom when new messages arrive or stream starts/ends
  useEffect(() => {
      if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      }
  }, [messages, streamState]);

  // Handle incoming action directives
  useEffect(() => { /* ... (streamEvents listener calling handleDirective) ... */ }, [streamEvents, handleDirective]);

  const handleMessageContextMenu = (event: React.MouseEvent, message: any) => { /* ... (checks canPerformAction, shows menu with Save Artifact option) ... */ };
  const handleHighlight = (selectedText: string, messageId: string) => { /* ... (checks canPerformAction, calls triggerArtifactCreationWithModal) ... */ };

  return (
    <Panel id="chat-thread" className="flex flex-col" title={`Chat with ${activeAgent?.persona.name ?? 'Agent'}`}>
      <div ref={messageListRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"> {/* Added scroll-smooth */}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id} message={msg}
            onContextMenu={(e) => handleMessageContextMenu(e, msg)}
            onHighlight={(text) => handleHighlight(text, msg.id)}
          />
        ))}
        {/* Streaming indicator */}
        {(streamState === 'thinking' || streamState === 'streaming') && (
            <div className="flex justify-center items-center gap-2 text-sm text-text-muted italic py-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                Agent is responding...
            </div>
        )}
      </div>
      <InputBar contextKey={contextKey} onSubmit={submitMessage} />
    </Panel>
  );
}
TypeScript

// === File: features/chat/components/MessageBubble.tsx ===
// [Paste full code from v10.6 pseudocode - Includes context menu/highlight handlers concept]
// Description: Renders a single message bubble. Needs text selection detection logic.
// GSAP Opportunity: If message is marked as a key insight, use SplitText for animated reveal.
TypeScript

// === File: features/community/components/ChannelListPanel.tsx ===
// [Structure similar to ChatListPanel, using communityStore state]
// Description: Panel listing community channels or threads. Fetches data via Zustand (hydrated server-side/realtime).
TypeScript

// === File: features/community/components/ThreadPanel.tsx ===
// [Structure similar to ChatThreadPanel, using communityStore state]
// Description: Panel displaying messages within a community thread.
// Note: Submission likely uses Server Action -> Drizzle unless agents participate.
TypeScript

// === File: features/world/components/WorldCanvasPanel.tsx ===
// [Paste full code from v10.3 pseudocode, ensuring interaction triggers useCreateArtifact]
// Description: Panel rendering the 3D world view using Three.js. Checks permissions before artifact creation.
// Note: Uses useThreeJsScene hook for managing Three.js setup and interactions.
TypeScript

// === File: features/world/components/WorldSidebarPanel.tsx ===
// [Paste full code from v10.3 pseudocode]
// Description: Sidebar providing context/details for the World view. Uses useWorldState.
TypeScript

// === File: features/memory/components/MemoryBrowser.tsx ===
// [Paste full code from v10.6 pseudocode - Includes link badge and Tooltip]
// Description: Panel for Browse, searching, filtering artifacts. Fetches data via Zustand (hydrated server-side/realtime). Badge uses artifact metadata.
TypeScript

// === File: features/memory/components/ArtifactViewer.tsx ===
// [Paste full code from v10.6 pseudocode - Includes ArtifactRelationDisplay]
// Description: Panel displaying the full content and metadata (including relations) of a selected artifact. Data fetched via Zustand/Drizzle.
TypeScript

// === File: features/memory/components/ArtifactRelationDisplay.tsx ===
// [Paste full code from v10.6 pseudocode - Renders linked artifacts]
// Description: Displays linked artifacts within the viewer. Might need to fetch linked artifact names.
3. Input Bar

TypeScript

// === File: components/input-bar/InputBar.tsx ===
// [Paste full code from v10.6 pseudocode - Refactored for useInteractionContext, draft handling]
// Description: Core text input component, aware of context, agent, state, draft. Integrates AgentChipDisplay, VoiceInputButton.
TypeScript

// === File: components/input-bar/AgentChipDisplay.tsx ===
// [Paste full code from v10.3 pseudocode - Uses MiniOrb]
// Description: Renders the small agent chip in the InputBar.
TypeScript

// === File: components/input-bar/VoiceInputButton.tsx ===
// [Paste full code from v10.6 pseudocode - Includes SpeechVisualizer placeholder, refined transcript handling]
// Description: Button within the InputBar to toggle voice input. Uses useVoiceInput.
TypeScript

// === File: components/input-bar/SpeechVisualizer.tsx ===
// [Paste full code from v10.5 pseudocode - Placeholder]
// Description: Visual feedback for voice input (e.g., waveform). Requires actual implementation (e.g., using Web Audio API).
TypeScript

// === File: hooks/useVoiceInput.ts ===
// [Paste full code from v10.5 pseudocode - Includes state machine, Web Speech API logic, post-dictation prompt note]
// Description: Hook to manage voice recording, transcription, and state. Updates voiceSlice.
4. Orb System

TypeScript

// === File: components/orb/OrbRenderer.tsx ===
// [Paste full code from v10.6 pseudocode - Uses useInteractionContext, includes pulse trigger concept]
// Description: Renders the main WebGL Orb visualization using Three.js. Reacts to agent and state.
TypeScript

// === File: components/orb/MiniOrb.tsx ===
// [Paste full code from v10.3 pseudocode - Simple CSS/SVG implementation]
// Description: A very small visual representation of the Orb state for UI elements like AgentChipDisplay.
TypeScript

// === File: components/orb/OrbFeedbackLayer.tsx ===
// [Paste full code from v10.6 pseudocode - Uses useInteractionContext]
// Description: Renders non-WebGL feedback related to the Orb (status text).
// GSAP Opportunity: Use SplitText or other GSAP animations for smoother text transitions.
TypeScript

// === File: hooks/useOrbRenderer.ts ===
// [Paste full code from v10.6 pseudocode - Includes triggerPulse, notes on GSAP for state changes/mood]
// Description: Hook encapsulating Three.js logic for Orb setup, animation, and state updates. Uses getOrbThemeProfile.
// GSAP Recommended: Use gsap.to() with premium eases for state transitions and pulse effects within this hook.