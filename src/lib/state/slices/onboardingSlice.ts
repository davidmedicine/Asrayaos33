/**
 * onboardingSlice.ts
 * Manages state for the onboarding flow, step progression, and user inputs
 */

import { StateCreator } from 'zustand';

// Define step IDs as a constant for type safety
export const ONBOARDING_STEPS = {
  WELCOME: 'welcome',
  NAME_OS: 'name-os',
  SET_INTENTION: 'set-intention',
  REFLECTION: 'reflection',
  NAME_ARTIFACT: 'name-artifact',
  WORLD_TELEPORT: 'world-teleport',
  COMPLETE: 'complete'
} as const;

export type OnboardingStepId = typeof ONBOARDING_STEPS[keyof typeof ONBOARDING_STEPS];

// Step metadata for UI rendering
export const ONBOARDING_STEP_META: Record<OnboardingStepId, { title: string; icon?: string; description?: string }> = {
  [ONBOARDING_STEPS.WELCOME]: { 
    title: 'Welcome to Asraya OS', 
    icon: '✨',
    description: 'Begin your journey with Asraya OS, your personal self-operating system'
  },
  [ONBOARDING_STEPS.NAME_OS]: { 
    title: 'Name Your OS Instance',
    icon: '🏷️',
    description: 'Give your personal OS a meaningful name that resonates with you' 
  },
  [ONBOARDING_STEPS.SET_INTENTION]: { 
    title: 'Set Your Intention', 
    icon: '🧭',
    description: 'Define what you seek to explore or cultivate with Asraya OS'
  },
  [ONBOARDING_STEPS.REFLECTION]: { 
    title: 'Initial Reflection', 
    icon: '🪞',
    description: 'Share a moment of reflection with the Oracle to initialize your journey'
  },
  [ONBOARDING_STEPS.NAME_ARTIFACT]: { 
    title: 'Name Your First Artifact', 
    icon: '💎',
    description: 'Create your first memory artifact from your reflection'
  },
  [ONBOARDING_STEPS.WORLD_TELEPORT]: { 
    title: 'Entering Your World...', 
    icon: '🌌',
    description: 'Transitioning to your personal mental space'
  },
  [ONBOARDING_STEPS.COMPLETE]: { 
    title: 'Onboarding Complete', 
    icon: '🎉',
    description: 'Your OS is now ready for exploration'
  },
};

// Define inputs for each step
export interface OnboardingInputs {
  osName: string;
  intention: string;
  reflectionSummary: string;
  artifactName: string;
  selectedAgentId: string | null; // Agent chosen for initial interaction
}

export interface TeleportState {
  isActive: boolean;
  fromStep: OnboardingStepId | null;
  toStep: OnboardingStepId | null;
  progress: number;
  onTeleportStart?: () => void; // Optional callback
  onTeleportEnd?: () => void;   // Optional callback
}

export interface OnboardingSlice {
  // State
  currentStep: OnboardingStepId;
  inputs: OnboardingInputs;
  isCompleted: boolean;
  isLoading: boolean;
  teleport: TeleportState;
  error: string | null;
  totalSteps: number;
  
  // Actions
  setCurrentStep: (step: OnboardingStepId) => void;
  setInput: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  completeOnboarding: () => Promise<void>;
  startTeleport: (fromStep: OnboardingStepId, toStep: OnboardingStepId) => void;
  endTeleport: () => void;
  resetOnboarding: () => void;
  registerTeleportCallbacks: (callbacks: { onStart?: () => void; onEnd?: () => void }) => void;
  
  // Utility functions
  getStepIndex: () => number;
  isInTransition: () => boolean;
  getCurrentStepMeta: () => { title: string; icon?: string; description?: string };
}

const initialInputs: OnboardingInputs = {
  osName: '',
  intention: '',
  reflectionSummary: '',
  artifactName: '',
  selectedAgentId: null
};

const initialTeleport: TeleportState = {
  isActive: false,
  fromStep: null,
  toStep: null,
  progress: 0,
  onTeleportStart: undefined,
  onTeleportEnd: undefined
};

// Function to determine step order and progression
const getNextStep = (currentStep: OnboardingStepId): OnboardingStepId => {
  switch (currentStep) {
    case ONBOARDING_STEPS.WELCOME:
      return ONBOARDING_STEPS.NAME_OS;
    case ONBOARDING_STEPS.NAME_OS:
      return ONBOARDING_STEPS.SET_INTENTION;
    case ONBOARDING_STEPS.SET_INTENTION:
      return ONBOARDING_STEPS.REFLECTION;
    case ONBOARDING_STEPS.REFLECTION:
      return ONBOARDING_STEPS.NAME_ARTIFACT;
    case ONBOARDING_STEPS.NAME_ARTIFACT:
      return ONBOARDING_STEPS.WORLD_TELEPORT;
    case ONBOARDING_STEPS.WORLD_TELEPORT:
      return ONBOARDING_STEPS.COMPLETE;
    default:
      return ONBOARDING_STEPS.COMPLETE;
  }
};

const getPrevStep = (currentStep: OnboardingStepId): OnboardingStepId | null => {
  switch (currentStep) {
    case ONBOARDING_STEPS.NAME_OS:
      return ONBOARDING_STEPS.WELCOME;
    case ONBOARDING_STEPS.SET_INTENTION:
      return ONBOARDING_STEPS.NAME_OS;
    case ONBOARDING_STEPS.REFLECTION:
      return ONBOARDING_STEPS.SET_INTENTION;
    case ONBOARDING_STEPS.NAME_ARTIFACT:
      return ONBOARDING_STEPS.REFLECTION;
    case ONBOARDING_STEPS.WORLD_TELEPORT:
      return ONBOARDING_STEPS.NAME_ARTIFACT;
    default:
      return null; // Can't go back from WELCOME or COMPLETE
  }
};

export const createOnboardingSlice: StateCreator<OnboardingSlice> = (set, get) => ({
  // Initial state
  currentStep: ONBOARDING_STEPS.WELCOME,
  inputs: initialInputs,
  isCompleted: false,
  isLoading: false,
  teleport: initialTeleport,
  error: null,
  totalSteps: Object.values(ONBOARDING_STEPS).filter(step => 
    step !== ONBOARDING_STEPS.COMPLETE && 
    step !== ONBOARDING_STEPS.WORLD_TELEPORT
  ).length,
  
  // Actions
  setCurrentStep: (step) => {
    set({ currentStep: step });
  },
  
  setInput: (key, value) => {
    set((state) => ({
      inputs: {
        ...state.inputs,
        [key]: value
      }
    }));
  },
  
  nextStep: async () => {
    const { currentStep, inputs } = get();
    
    // Validate current step
    let canProceed = true;
    let errorMessage = null;
    
    // Basic validation
    switch (currentStep) {
      case ONBOARDING_STEPS.NAME_OS:
        canProceed = inputs.osName.trim().length > 0;
        errorMessage = canProceed ? null : 'Please enter a name for your OS';
        break;
      case ONBOARDING_STEPS.SET_INTENTION:
        canProceed = inputs.intention.trim().length > 0;
        errorMessage = canProceed ? null : 'Please set your intention';
        break;
      case ONBOARDING_STEPS.NAME_ARTIFACT:
        canProceed = inputs.artifactName.trim().length > 0;
        errorMessage = canProceed ? null : 'Please name your artifact';
        break;
    }
    
    if (!canProceed) {
      set({ error: errorMessage });
      return;
    }
    
    const nextStep = getNextStep(currentStep);
    
    // Determine if we need a teleport animation
    const needsTeleport = nextStep === ONBOARDING_STEPS.WORLD_TELEPORT;
    
    if (needsTeleport) {
      get().startTeleport(currentStep, nextStep);
      // Note: The UI layer (useOnboardingFlow and WorldTeleportOverlay) will handle
      // the animation timing and completion via the registered callbacks
    } else {
      set({ currentStep: nextStep, error: null });
    }
    
    // If this is the final step, mark onboarding as completed
    if (nextStep === ONBOARDING_STEPS.COMPLETE) {
      await get().completeOnboarding();
    }
    
    // Note: The 'useOnboardingFlow' hook should handle passing relevant 'inputs'
    // (like artifactName, reflectionSummary) to 'useCreateArtifact' upon successful completion.
  },
  
  prevStep: () => {
    const prevStep = getPrevStep(get().currentStep);
    if (prevStep) {
      set({ currentStep: prevStep, error: null });
    }
  },
  
  completeOnboarding: async () => {
    set({ isLoading: true });
    
    try {
      // TODO: Replace with actual server action call to persist onboarding data
      // and potentially create initial artifact.
      // Example:
      // await persistOnboardingDataAction({
      //   osName: get().inputs.osName,
      //   intention: get().inputs.intention,
      //   selectedAgentId: get().inputs.selectedAgentId
      // });
      
      set({ 
        isCompleted: true,
        isLoading: false
      });
      
      // In real implementation, we would redirect to the main app here
    } catch (error) {
      set({ 
        error: 'Failed to complete onboarding',
        isLoading: false
      });
    }
  },
  
  startTeleport: (fromStep, toStep) => {
    // Set initial teleport state
    set((state) => ({ 
      teleport: {
        isActive: true,
        fromStep,
        toStep,
        progress: 0,
        onTeleportStart: state.teleport.onTeleportStart,
        onTeleportEnd: state.teleport.onTeleportEnd
      }
    }));
    
    // Call the onTeleportStart callback if registered
    get().teleport.onTeleportStart?.();
    
    // Change the current step immediately
    set({ currentStep: toStep });
  },
  
  endTeleport: () => {
    // Call the onTeleportEnd callback if registered
    get().teleport.onTeleportEnd?.();
    
    // Reset teleport state
    set({
      teleport: initialTeleport
    });
  },
  
  resetOnboarding: () => {
    set({
      currentStep: ONBOARDING_STEPS.WELCOME,
      inputs: initialInputs,
      isCompleted: false,
      isLoading: false,
      teleport: initialTeleport,
      error: null
    });
  },
  
  registerTeleportCallbacks: (callbacks) => {
    set((state) => ({
      teleport: {
        ...state.teleport,
        onTeleportStart: callbacks.onStart,
        onTeleportEnd: callbacks.onEnd,
      }
    }));
  },
  
  // Utility functions
  getStepIndex: () => {
    // Filter out non-progress steps
    const progressSteps = Object.values(ONBOARDING_STEPS).filter(step => 
      step !== ONBOARDING_STEPS.COMPLETE && 
      step !== ONBOARDING_STEPS.WORLD_TELEPORT
    );
    const currentIndex = progressSteps.indexOf(get().currentStep);
    return Math.max(0, currentIndex); // Return 0 if not found or before first step
  },
  
  isInTransition: () => {
    return get().isLoading || get().teleport.isActive;
  },
  
  getCurrentStepMeta: () => {
    return ONBOARDING_STEP_META[get().currentStep] || { title: 'Unknown Step' };
  }
});