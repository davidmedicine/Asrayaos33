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
import { FIRST_FLAME_SLUG, type FlameStatusResponse } from '@flame'; // Changed from FlameStatusPayload

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
    if (activeQuestId && flameQuery.data?.dayDefinition && !seededChatForQuestRef.current[activeQuestId] && !flameQuery.isLoading) {
      const dayDef = flameQuery.data.dayDefinition;
      const openerParts: string[] = [];
      if (dayDef.narrativeOpening && dayDef.narrativeOpening.length > 0) {
        openerParts.push(...dayDef.narrativeOpening);
      }
      if (dayDef.oracleGuidance?.interactionPrompt) {
        openerParts.push(dayDef.oracleGuidance.interactionPrompt);
      }
      const opener = openerParts.join('\n\n').trim();
      if (opener) {
        setMessages([{
          id: `sys-seed-${activeQuestId}-${dayDef.ritualDay || 'init'}-${Date.now()}`,
          role: 'system',
          content: opener,
          createdAt: new Date(),
        }]);
      } else {
        setMessages([]);
      }
      seededChatForQuestRef.current[activeQuestId] = true;
      animatedMessagesRef.current.clear();
    }
  }, [activeQuestId, flameQuery.data, flameQuery.isLoading, setMessages]);

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
  }, [flameQuery.data?.processing, addToast]);

  useLayoutEffect(() => {
    const canUseNativeVT = typeof document !== 'undefined' && 'startViewTransition' in document;
    const newPhase = (() => {
      if (!activeQuestId || flameQuery.isLoading || !flameQuery.data?.dayDefinition) return 'oracle_awaiting';
      if (!seededChatForQuestRef.current[activeQuestId]) return 'oracle_awaiting';
      if (firstQuestJustCreated) return 'oracle_awakening';
      return (uiPhase.startsWith('oracle_') && uiPhase !== 'oracle_receding') ? 'oracle_receding' : 'chat_active';
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
    handleVercelSubmitInternal(e);
    if (firstQuestJustCreated) flushSync(() => setFirstQuestJustCreated(false));
    if (activeQuestId && activeConversation?.slug === FIRST_FLAME_SLUG) {
      setTimeout(() => invalidateFlameStatus(queryClient, activeQuestId), 1200);
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
    if (flameQuery.data?.processing) return <LoadingContextFallback />;
    if (flameQuery.isError && !flameQuery.data) return <LoadingContextFallback />;
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
              {flameQuery.error && <div className="text-red-500/90 bg-red-500/10 p-3 rounded text-sm mb-4"><span className="font-medium">Context Error:</span> {flameQuery.error.message}</div>}
              {chatErrorFromSDK && <div className="text-red-500/90 bg-red-500/10 p-3 rounded text-sm mb-4"><span className="font-medium">Chat Error:</span> {chatErrorFromSDK.message}</div>}
              {combinedContentItems.length > 0 ? combinedContentItems.map(item => (
                <MessageRenderer key={item.message.id || `${item.message.role}-${item.timestamp.toISOString()}`}
                  id={`message-item-${item.message.id}`} item={item} globalActiveAgentId={globalActiveAgentId} isDebug={showDebugInfo}
                  isStreaming={item.message.role === 'assistant' && item.message.id === vercelMessages[vercelMessages.length -1]?.id && isSendingMessage}
                />
              )) : (!isSendingMessage && !chatErrorFromSDK && !flameQuery.isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <p className="text-sm text-[var(--text-muted)]">{flameQuery.data?.dayDefinition ? 'The Oracle awaits your words.' : 'No messages yet. Begin the dialogue.'}</p>
                </div>
              ))}
              {isSendingMessage && vercelMessages[vercelMessages.length -1]?.role === 'assistant' && vercelMessages[vercelMessages.length -1]?.content === "" && (
                  <TypingIndicator typingUsers={[{ id: globalActiveAgentId || 'oracle', name: 'Oracle' }]} />
              )}
              <div ref={messagesEndRef} aria-hidden="true" style={{ height: '1px' }} />
            </div>
            <ChatInputBar onFormSubmit={handleSubmitMessage} inputValue={input} onInputChange={handleInputChange}
              isProcessing={isSendingMessage} disabled={!activeQuestId || isSendingMessage || flameQuery.isLoading}
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