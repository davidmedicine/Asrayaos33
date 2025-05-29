// Reminder: This component expects the app root (e.g. app/layout.tsx) to wrap everything in:
// const queryClient = new QueryClient();
// <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
  useLayoutEffect,
} from 'react';
import { flushSync } from 'react-dom';
import { shallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import { gsap } from '@/lib/gsapSetup';
import { useChat, type Message as VercelMessage } from 'ai/react';
// Import AI SDK 5.0 types and utilities (commented out until SDK is installed)
// import { defaultChatStore, zodSchema, streamText } from 'ai';
// import { type UIMessage, convertToModelMessages } from 'ai';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Panel } from '@/components/panels/Panel';
import { ChatInputBar } from '../../chat/components/ChatInputBar';
import { MessageRenderer, CombinedContentItem } from '../../chat/components/messages/MessageRenderer';
import { TypingIndicator } from '../../chat/components/TypingIndicator';
import { OracleOrb } from './oracleOrb';

import { useMediaQuery } from '@/hooks/useMediaQuery';

import { useQuestStore } from '@/lib/state/slices/questslice';
import { useAgentStore } from '@/lib/state/slices/agentSlice';
import { useDevToolsStore } from '@/lib/state/slices/devToolsSlice';
import { useContextStore } from '@/lib/state/slices/contextSlice';

import type { Quest } from '@/types/quest';
import type { ActiveConversationPanelProps } from './ActiveConversationPanel.types';
import { FIRST_FLAME_SLUG } from '@flame';
import type { FlameStatusResponse } from '@/types/flame';

import { fetchFlameStatus, invalidateFlameStatus } from '@/lib/api/quests';
import { getPanelMeta } from '@/lib/core/panelMetaRegistry';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useNotificationStore } from '@/lib/state/slices/notificationSlice';

const LoadingContextFallback = () => (
  <div className="text-xs text-[var(--text-muted)] italic text-center py-4 animate-pulse">
    Evoking ritual context...
  </div>
);

type UIPhase = 'oracle_awaiting' | 'oracle_awakening' | 'chat_active' | 'oracle_receding';

const ActiveConversationPanelComponent: React.FC<ActiveConversationPanelProps> = ({
  id,
  className,
  isActive,
  alwaysVisible,
  panelTitleId = "active-conversation-chamber-heading",
  isMobile,
}) => {
  const panelMeta = getPanelMeta('ActiveConversationPanel');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const animatedMessagesRef = useRef<Set<string>>(new Set());
  const seededChatForQuestRef = useRef<Record<string, boolean>>({});

  const { activeQuestId, quests, firstQuestJustCreated, setFirstQuestJustCreated } = useQuestStore(
    (state) => ({
      activeQuestId: state.activeQuestId,
      quests: state.quests,
      firstQuestJustCreated: state.firstQuestJustCreated,
      setFirstQuestJustCreated: state.setFirstQuestJustCreated,
    }),
    shallow
  );
  const globalActiveAgentId = useAgentStore(state => state.activeAgentId ?? 'oracle');
  const { isDebugModeEnabled: showDebugInfo, enableViewTransition: devToolsVTEnabled } = useDevToolsStore(
    (s) => ({ isDebugModeEnabled: s.isDebugModeEnabled, enableViewTransition: s.enableViewTransition }),
    shallow
  );
  const { setQuestContext: setZustandQuestContext, clearQuestContext } = useContextStore(
    (s) => ({ setQuestContext: s.setQuestContext, clearQuestContext: s.clearQuestContext }),
    shallow
  );
  const addToast = useNotificationStore(state => state.addToast);
  const processingTimerRef = useRef<NodeJS.Timeout>();

  const queryClient = useQueryClient();

  const activeConversation = useMemo((): Quest | null =>
    (quests ?? []).find((c) => c.id === activeQuestId) || null
  , [quests, activeQuestId]);

  const flameQuery = useQuery<FlameStatusResponse>({ // Changed from FlameStatusPayload
    queryKey: ['flameStatus', activeQuestId],
    enabled: Boolean(activeQuestId),
    queryFn: () => fetchFlameStatus(activeQuestId!),
    gcTime: 30 * 60_000,      // 30 minutes
    staleTime: 5 * 60_000,    // 5 minutes
    refetchInterval: (data) => data?.processing ? 1500 : false,
    onSuccess: (data) => {
      if (activeQuestId && data) {
        setZustandQuestContext(activeQuestId, {
          overallProgress: data.overallProgress,
          dayDefinition: data.dayDefinition,
        });
      }
    },
    onError: (error) => {
      console.error(`[ActiveConversationPanel] Error fetching flame status for ${activeQuestId}:`, error);
      if (activeQuestId) clearQuestContext(activeQuestId);
    }
  });

  const {
    messages: vercelMessages,
    input,
    handleInputChange,
    handleSubmit: handleVercelSubmitInternal,
    isLoading: isSendingMessage,
    error: chatErrorFromSDK,
    setMessages,
  } = useChat({
    api: '/api/chat',
    id: activeQuestId ?? undefined,
    initialMessages: [],
    body: {
      questId: activeQuestId,
      currentRitualDay: flameQuery.data?.overallProgress?.current_day_target,
    },
    onError: (err) => {
      console.error("[ActiveConversationPanel] Vercel AI SDK Error:", err);
    },
  });

  useEffect(() => {
    // Improved logic: Check if we need to seed chat, even if we're still loading but have dayDefinition
    if (activeQuestId && !seededChatForQuestRef.current[activeQuestId] && flameQuery.data?.dayDefinition) {
      const dayDef = flameQuery.data.dayDefinition;
      const openerParts: string[] = [];
      
      // Add narrative opening content first
      if (dayDef.narrativeOpening && dayDef.narrativeOpening.length > 0) {
        openerParts.push(...dayDef.narrativeOpening);
      }
      
      // Add oracle guidance prompt last for direct interaction framing
      if (dayDef.oracleGuidance?.interactionPrompt) {
        openerParts.push(dayDef.oracleGuidance.interactionPrompt);
      }
      
      const opener = openerParts.join('\n\n').trim();
      
      if (opener) {
        // Create system message with rich context and metadata
        const systemMessage = {
          id: `sys-seed-${activeQuestId}-${dayDef.ritualDay || 'init'}-${Date.now()}`,
          role: 'system',
          content: opener,
          createdAt: new Date(),
          // AI SDK 5.0 would add metadata like:
          // metadata: {
          //   ritualDay: dayDef.ritualDay,
          //   ritualStage: dayDef.ritualStage,
          //   theme: dayDef.theme
          // }
        };
        
        // Optional: Add specific ritual guidance if available
        const assistantWelcome = {
          id: `assistant-welcome-${activeQuestId}-${Date.now()}`,
          role: 'assistant',
          content: `Welcome to Day ${dayDef.ritualDay}: ${dayDef.title}. ${dayDef.subtitle}`,
          createdAt: new Date()
        };
        
        // Set initial messages
        setMessages([systemMessage, assistantWelcome]);
        
        console.log("[ActiveConversationPanel] Seeded chat messages for quest", { 
          questId: activeQuestId,
          dayNumber: dayDef.ritualDay,
          processing: flameQuery.data.processing
        });
      } else {
        setMessages([]);
      }
      
      // Mark this quest as seeded to prevent duplicate seeding
      seededChatForQuestRef.current[activeQuestId] = true;
      animatedMessagesRef.current.clear();
    }
  }, [activeQuestId, flameQuery.data, setMessages]);

  const [uiPhase, setUiPhase] = useState<UIPhase>('oracle_awaiting');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    if (flameQuery.data?.processing) {
      if (!processingTimerRef.current) {
        processingTimerRef.current = setTimeout(() => {
          addToast({ type: 'error', message: 'Processing took too long.' });
        }, 30_000);
      }
    } else if (processingTimerRef.current) {
      clearTimeout(processingTimerRef.current);
      processingTimerRef.current = undefined;
    }
    
    // Log the flame query state for debugging
    if (flameQuery.data) {
      console.log("[ActiveConversationPanel] Flame query data:", {
        processing: flameQuery.data.processing,
        hasOverallProgress: !!flameQuery.data.overallProgress,
        hasDayDefinition: !!flameQuery.data.dayDefinition,
        questId: activeQuestId
      });
    }
  }, [flameQuery.data, addToast, activeQuestId]);

  useLayoutEffect(() => {
    const canUseNativeVT = typeof document !== 'undefined' && 'startViewTransition' in document;
    const newPhase = (() => {
      // If we don't have an active quest ID, go to oracle_awaiting
      if (!activeQuestId) return 'oracle_awaiting';
      
      // Always check if we have a day definition first, even while loading
      // This prioritizes showing content as soon as possible
      if (flameQuery.data?.dayDefinition) {
        console.log("[ActiveConversationPanel] Have day definition", { 
          seeded: seededChatForQuestRef.current[activeQuestId],
          firstQuest: firstQuestJustCreated, 
          uiPhase,
          processing: flameQuery.data?.processing
        });
        
        // If we haven't seeded chat messages yet, do so and show oracle_awakening
        if (!seededChatForQuestRef.current[activeQuestId]) {
          // Message seeding is handled in the useEffect hook
          // Just trigger the appropriate UI phase
          seededChatForQuestRef.current[activeQuestId] = true;
          console.log("[ActiveConversationPanel] Showing oracle_awakening");
          return 'oracle_awakening';
        }
        
        // If this is the first quest just created, show the oracle awakening
        if (firstQuestJustCreated) return 'oracle_awakening';
        
        // If we're already in chat_active or oracle_receding, stay there
        if (uiPhase === 'chat_active' || uiPhase === 'oracle_receding') return uiPhase;
        
        // Otherwise, transition from oracle state to receding
        return (uiPhase.startsWith('oracle_')) ? 'oracle_receding' : 'chat_active';
      }
      
      // If we don't have a day definition but have seeded chat, use that
      if (seededChatForQuestRef.current[activeQuestId]) {
        console.log("[ActiveConversationPanel] No day definition but have seeded chat");
        // Stay in current UI phase if we're in chat_active or oracle_receding
        if (uiPhase === 'chat_active' || uiPhase === 'oracle_receding') return uiPhase;
        
        // Otherwise move to chat_active
        return 'chat_active';
      }
      
      // If we're still loading and don't have any data yet, stay in oracle_awaiting
      console.log("[ActiveConversationPanel] Awaiting data", {
        loading: flameQuery.isLoading,
        hasData: !!flameQuery.data,
        processing: flameQuery.data?.processing
      });
      
      // Default fallback to oracle_awaiting if we don't have enough data
      return 'oracle_awaiting';
    })();

    if (uiPhase !== newPhase) {
      if (devToolsVTEnabled && !prefersReducedMotion && canUseNativeVT &&
          ((uiPhase.startsWith('oracle_') && newPhase === 'chat_active') ||
           (uiPhase === 'chat_active' && newPhase.startsWith('oracle_')) ||
           (newPhase === 'oracle_receding'))) {
        document.startViewTransition(() => { flushSync(() => { setUiPhase(newPhase); }); });
      } else {
        setUiPhase(newPhase);
      }
    }
  }, [activeQuestId, firstQuestJustCreated, flameQuery.data, flameQuery.isLoading, uiPhase, devToolsVTEnabled, prefersReducedMotion]);

  const handleRecedeComplete = useCallback(() => setUiPhase('chat_active'), []);

  const handleSubmitMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isSendingMessage || !activeQuestId) return;
    
    // Track message submission start time for metadata
    const startTime = Date.now();
    
    // Record that this is no longer the first interaction
    if (firstQuestJustCreated) flushSync(() => setFirstQuestJustCreated(false));
    
    // Submit the message to the Vercel AI SDK
    handleVercelSubmitInternal(e);
    
    // For First Flame quests, invalidate flame status to refresh progress
    if (activeQuestId && activeConversation?.slug === FIRST_FLAME_SLUG) {
      // AI SDK 5.0 would add metadata here about the interaction
      // const messageMetadata = {
      //   messageType: 'ritual-interaction',
      //   dayNumber: flameQuery.data?.overallProgress?.current_day_target || 1,
      //   theme: flameQuery.data?.dayDefinition?.theme,
      //   responseTime: Date.now() - startTime
      // };
      
      // Give the server time to process before invalidating cache
      setTimeout(() => invalidateFlameStatus(queryClient, activeQuestId), 1200);
      
      console.log("[ActiveConversationPanel] Processing message for ritual quest", {
        questId: activeQuestId,
        processingTime: Date.now() - startTime
      });
    }
  };

  useLayoutEffect(() => {
    if (isActive && uiPhase === 'chat_active' && messagesEndRef.current) {
      const scrollBehavior = animatedMessagesRef.current.size > 0 && !prefersReducedMotion ? 'smooth' : 'auto';
      messagesEndRef.current.scrollIntoView({ behavior: scrollBehavior, block: 'end' });
    }
  }, [isActive, vercelMessages.length, uiPhase, prefersReducedMotion]);

  useLayoutEffect(() => {
    if (!isActive || uiPhase !== 'chat_active' || typeof window === 'undefined' || vercelMessages.length === 0 || prefersReducedMotion) {
      if (prefersReducedMotion) {
        vercelMessages.forEach(m => m.id && gsap.set(document.getElementById(`message-item-${m.id}`), { opacity: 1, y: 0 }));
      }
      return;
    }
    vercelMessages.forEach((message) => {
      if (message.id && !animatedMessagesRef.current.has(message.id)) {
        animatedMessagesRef.current.add(message.id);
        requestAnimationFrame(() => {
          const el = document.getElementById(`message-item-${message.id}`);
          if (el) gsap.from(el, { opacity: 0, y: 10, duration: 0.4, ease: 'power2.out' });
        });
      }
    });
    const currentIds = new Set(vercelMessages.map(m => m.id));
    animatedMessagesRef.current.forEach(id => !currentIds.has(id) && animatedMessagesRef.current.delete(id));
  }, [vercelMessages, isActive, uiPhase, prefersReducedMotion]);

  const combinedContentItems = useMemo((): CombinedContentItem[] =>
    vercelMessages.map((msg: VercelMessage) => ({
      type: 'message',
      message: {
        id: msg.id, clientGeneratedId: msg.id, conversationId: activeQuestId || '',
        senderId: msg.role === 'user' ? 'user' : (globalActiveAgentId || 'oracle'),
        senderType: msg.role === 'user' ? 'user' : 'agent',
        agentId: (msg.role === 'assistant' || msg.role === 'system') ? (globalActiveAgentId || 'oracle') : undefined,
        role: msg.role as any, content: msg.content, status: 'delivered',
        createdAt: msg.createdAt || new Date(), timestamp: msg.createdAt || new Date(),
      },
      timestamp: msg.createdAt || new Date(),
    }))
  , [vercelMessages, activeQuestId, globalActiveAgentId]);

  const renderContent = () => {
    // Don't block on processing state, only show loading fallback if we have no data at all
    if (flameQuery.isLoading && !flameQuery.data) return <LoadingContextFallback />;
    if (flameQuery.isError && !flameQuery.data && !seededChatForQuestRef.current[activeQuestId || '']) return <LoadingContextFallback />;
    
    const useNativeVT = typeof document !== 'undefined' && 'startViewTransition' in document && devToolsVTEnabled && !prefersReducedMotion;
    const vtStyle: React.CSSProperties = useNativeVT ? { viewTransitionName: `acp-content-area-${activeQuestId || 'none'}` } : {};

    switch (uiPhase) {
      case 'oracle_awaiting': case 'oracle_awakening':
        return (
          <div role="dialog" aria-labelledby={activeConversation?.name || "oracle-prompt-text"}
            className="flex-grow flex flex-col items-center justify-center h-full" style={vtStyle}>
            <OracleOrb orbState={uiPhase === 'oracle_awaiting' ? 'awaiting' : 'awakening'} questName={activeConversation?.name} />
          </div>
        );
      case 'oracle_receding':
        return (
          <div role="dialog" aria-labelledby={activeConversation?.name || "oracle-prompt-text"}
            className="flex-grow flex flex-col items-center justify-center h-full" style={vtStyle}>
            <OracleOrb orbState="receding" questName={activeConversation?.name} onRecedeComplete={handleRecedeComplete} />
          </div>
        );
      case 'chat_active':
        return (
          <div className="flex flex-col h-full" style={vtStyle}>
            <h2 id={panelTitleId} className="sr-only">Chat with {activeConversation?.name || 'the Oracle'}</h2>
            <div role="log" aria-label={`Messages for ${activeConversation?.name || 'current conversation'}`}
              className={cn("flex-grow min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar", { "overscroll-behavior-contain": !isMobile })}>
              {/* Show a processing notice, but don't block the UI */}
              {flameQuery.data?.processing && (
                <div className="text-amber-500/90 bg-amber-500/10 p-3 rounded text-sm mb-4">
                  <span className="font-medium">Processing:</span> Setting up your conversation. You can begin chatting while we complete the setup.
                </div>
              )}
              {flameQuery.error && <div className="text-red-500/90 bg-red-500/10 p-3 rounded text-sm mb-4"><span className="font-medium">Context Error:</span> {flameQuery.error.message}</div>}
              {chatErrorFromSDK && <div className="text-red-500/90 bg-red-500/10 p-3 rounded text-sm mb-4"><span className="font-medium">Chat Error:</span> {chatErrorFromSDK.message}</div>}
              {combinedContentItems.length > 0 ? combinedContentItems.map(item => (
                <MessageRenderer key={item.message.id || `${item.message.role}-${item.timestamp.toISOString()}`}
                  id={`message-item-${item.message.id}`} item={item} globalActiveAgentId={globalActiveAgentId} isDebug={showDebugInfo}
                  isStreaming={item.message.role === 'assistant' && item.message.id === vercelMessages[vercelMessages.length -1]?.id && isSendingMessage}
                />
              )) : (!isSendingMessage && !chatErrorFromSDK && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-sm text-[var(--text-muted)]">
                    {flameQuery.data?.processing 
                      ? 'Setting up your conversation. You can begin chatting now.' 
                      : (flameQuery.data?.dayDefinition 
                          ? 'The Oracle awaits your words.' 
                          : 'No messages yet. Begin the dialogue.')}
                  </p>
                </div>
              ))}
              {isSendingMessage && vercelMessages[vercelMessages.length -1]?.role === 'assistant' && vercelMessages[vercelMessages.length -1]?.content === "" && (
                  <TypingIndicator typingUsers={[{ id: globalActiveAgentId || 'oracle', name: 'Oracle' }]} />
              )}
              <div ref={messagesEndRef} aria-hidden="true" style={{ height: '1px' }} />
            </div>
            <ChatInputBar onFormSubmit={handleSubmitMessage} inputValue={input} onInputChange={handleInputChange}
              isProcessing={isSendingMessage} 
              disabled={!activeQuestId || isSendingMessage}
              placeholderText={activeConversation ? `Message ${activeConversation.name}...` : 'Select a conversation'}
              className="flex-shrink-0" />
          </div>
        );
      default: return null;
    }
  };

  return (
    <Panel id={id} panelMeta={panelMeta} title="" panelTitleId={panelTitleId}
      isActive={isActive} alwaysVisible={alwaysVisible}
      className={cn('flex flex-col h-full bg-[var(--bg-primary)]', className)}
      data-testid="active-conversation-panel">
      {showDebugInfo && (
        <div className="flex-shrink-0 bg-black/20 p-1.5 text-[10px] leading-tight border-b border-white/10 text-neutral-400 overflow-x-auto whitespace-nowrap space-y-0.5">
          <div><strong>UI:</strong> {uiPhase} | <strong>QID:</strong> {activeQuestId?.slice(-6) ?? 'N'} | <strong>1stQ:</strong> {firstQuestJustCreated?'T':'F'} | <strong>Ag:</strong> {globalActiveAgentId}</div>
          <div><strong>Flame:</strong> {flameQuery.isLoading?'Load':(flameQuery.error?'Err':(flameQuery.data?.processing ? 'Proc' : 'OK'))} | <strong>Day:</strong> {flameQuery.data?.dayDefinition?.ritualDay??'N/A'}</div>
          <div><strong>Seed:</strong> {activeQuestId && seededChatForQuestRef.current[activeQuestId]?'Y':'N'} | <strong>SDK:</strong> {isSendingMessage?'Load':(chatErrorFromSDK?'Err':'OK')} | <strong>Msgs:</strong> {vercelMessages.length}</div>
          <div><strong>VT:</strong> {devToolsVTEnabled?'On':'Off'} | <strong>RedMot:</strong> {prefersReducedMotion?'On':'Off'}</div>
        </div>
      )}
      {renderContent()}
      {uiPhase === 'oracle_awakening' && (
         <ChatInputBar onFormSubmit={handleSubmitMessage} inputValue={input} onInputChange={handleInputChange}
            isProcessing={isSendingMessage} disabled={!activeQuestId || isSendingMessage || flameQuery.isLoading}
            placeholderText={`Speak to ${activeConversation?.name || 'the Oracle'}...`}
            className="flex-shrink-0 border-t border-[var(--border-muted)]" />
      )}
    </Panel>
  );
};

export const ActiveConversationPanel = memo(ActiveConversationPanelComponent);
ActiveConversationPanel.displayName = 'ActiveConversationPanel';
