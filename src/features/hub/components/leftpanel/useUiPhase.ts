import { useState, useCallback, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';

// --- Constants & Types ---
export enum UiPhase {
  ORACLE_AWAITING = 'oracle_awaiting',     // Waiting for quest selection, data, or initial seed
  ORACLE_AWAKENING = 'oracle_awakening',   // Oracle appearing (e.g., for a new quest)
  ORACLE_SPEAKING = 'oracle_speaking',     // Oracle is actively responding / AI is generating
  ORACLE_RECEDING = 'oracle_receding',     // Oracle is disappearing
  CHAT_ACTIVE = 'chat_active',           // Standard chat interface is visible
}

const viewTransitionSupported =
  typeof window !== 'undefined' &&
  typeof document !== 'undefined' &&
  'startViewTransition' in document;

export interface UseUiPhaseProps {
  activeQuestId: string | null;
  isQuestDataLoading: boolean;
  isQuestDefinitionAvailable: boolean;
  isQuestSeeded: boolean;
  isFirstQuestJustCreated: boolean;
  isAssistantStreamingCurrently: boolean; // True if AI is generating a response (e.g. Vercel SDK isLoading)
  isLastMessageFromAssistant: boolean;    // True if the latest message in the list is from the assistant
  devToolsVTEnabled: boolean;
  systemPrefersReducedMotion: boolean;
}

export interface UseUiPhaseReturn {
  uiPhase: UiPhase;
  processQuestStatusChange: () => void;
  handleAssistantResponseStarted: () => void;
  handleAssistantResponseFinished: () => void;
  handleOracleRecedeAnimationCompleted: () => void;
  // Exposed for rare direct manipulation, FSM should generally cover needs
  setPhaseExplicitly: (phase: UiPhase, skipTransition?: boolean) => void;
}

// --- Custom Hook: useUiPhase ---
export function useUiPhase(props: UseUiPhaseProps): UseUiPhaseReturn {
  const [internalUiPhase, setInternalUiPhase] = useState<UiPhase>(UiPhase.ORACLE_AWAITING);
  const uiPhaseRef = useRef(internalUiPhase);

  useEffect(() => {
    uiPhaseRef.current = internalUiPhase;
  }, [internalUiPhase]);

  const {
    activeQuestId,
    isQuestDataLoading,
    isQuestDefinitionAvailable,
    isQuestSeeded,
    isFirstQuestJustCreated,
    isAssistantStreamingCurrently,
    isLastMessageFromAssistant,
    devToolsVTEnabled,
    systemPrefersReducedMotion,
  } = props;

  const prefersReducedMotion = systemPrefersReducedMotion || !devToolsVTEnabled;

  const setUiPhaseWithTransition = useCallback(
    (newPhase: UiPhase, skipTransition = false) => {
      if (uiPhaseRef.current === newPhase) return;

      if (skipTransition || prefersReducedMotion || !viewTransitionSupported) {
        setInternalUiPhase(newPhase);
      } else {
        document.startViewTransition!(() => {
          flushSync(() => { // Ensure React updates synchronously within the transition
            setInternalUiPhase(newPhase);
          });
        });
      }
    },
    [prefersReducedMotion] // devToolsVTEnabled is part of prefersReducedMotion calculation
  );

  const processQuestStatusChange = useCallback(() => {
    const currentPhase = uiPhaseRef.current;
    let nextPhase: UiPhase;

    if (!activeQuestId || isQuestDataLoading || !isQuestDefinitionAvailable) {
      nextPhase = UiPhase.ORACLE_AWAITING;
    } else if (!isQuestSeeded) {
      nextPhase = UiPhase.ORACLE_AWAITING;
    } else if (isFirstQuestJustCreated) {
      nextPhase = UiPhase.ORACLE_AWAKENING;
    } else if (
      isAssistantStreamingCurrently &&
      isLastMessageFromAssistant &&
      currentPhase !== UiPhase.CHAT_ACTIVE // Oracle speaks only if not in standard chat mode
    ) {
      nextPhase = UiPhase.ORACLE_SPEAKING;
    } else if (
      (currentPhase === UiPhase.ORACLE_AWAITING || currentPhase === UiPhase.ORACLE_AWAKENING) &&
      !isAssistantStreamingCurrently && !isFirstQuestJustCreated // Conditions for these phases no longer met
    ) {
      nextPhase = UiPhase.ORACLE_RECEDING;
    } else if (
      currentPhase === UiPhase.ORACLE_SPEAKING &&
      !(isAssistantStreamingCurrently && isLastMessageFromAssistant) // Was speaking, now AI stopped or last msg not assistant
    ) {
      nextPhase = UiPhase.ORACLE_RECEDING;
    } else if (currentPhase === UiPhase.ORACLE_RECEDING) {
      // Stay receding; handleOracleRecedeAnimationCompleted will transition to CHAT_ACTIVE
      nextPhase = UiPhase.ORACLE_RECEDING;
    } else {
      nextPhase = UiPhase.CHAT_ACTIVE;
    }
    
    setUiPhaseWithTransition(nextPhase);
  }, [
    activeQuestId, isQuestDataLoading, isQuestDefinitionAvailable, isQuestSeeded,
    isFirstQuestJustCreated, isAssistantStreamingCurrently, isLastMessageFromAssistant,
    setUiPhaseWithTransition,
  ]);

  const handleAssistantResponseStarted = useCallback(() => {
    const currentPhase = uiPhaseRef.current;
    // If Oracle is awakening or awaiting, and AI starts, Oracle is now speaking.
    if (currentPhase === UiPhase.ORACLE_AWAITING || currentPhase === UiPhase.ORACLE_AWAKENING) {
      setUiPhaseWithTransition(UiPhase.ORACLE_SPEAKING);
    }
    // If in CHAT_ACTIVE, AI response does not trigger Oracle UI by default.
    // If it's already SPEAKING or RECEDING, an overlapping new response might re-trigger SPEAKING.
    else if (currentPhase === UiPhase.ORACLE_RECEDING) {
       setUiPhaseWithTransition(UiPhase.ORACLE_SPEAKING); // New response interrupts recede
    }
  }, [setUiPhaseWithTransition]);

  const handleAssistantResponseFinished = useCallback(() => {
    const currentPhase = uiPhaseRef.current;
    if (currentPhase === UiPhase.ORACLE_SPEAKING) {
      setUiPhaseWithTransition(UiPhase.ORACLE_RECEDING);
    }
    // If finished in CHAT_ACTIVE, remains CHAT_ACTIVE.
  }, [setUiPhaseWithTransition]);

  const handleOracleRecedeAnimationCompleted = useCallback(() => {
    // This is called by OracleOrb when its recede animation is done.
    if (uiPhaseRef.current === UiPhase.ORACLE_RECEDING) {
      setUiPhaseWithTransition(UiPhase.CHAT_ACTIVE);
    }
  }, [setUiPhaseWithTransition]);


  return {
    uiPhase: internalUiPhase,
    processQuestStatusChange,
    handleAssistantResponseStarted,
    handleAssistantResponseFinished,
    handleOracleRecedeAnimationCompleted,
    setPhaseExplicitly: setUiPhaseWithTransition,
  };
}