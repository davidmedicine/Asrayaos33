/**
 * voiceSlice.ts
 * Zustand slice for managing voice input state
 * Primarily reflects state changes initiated by useVoiceInput hook
 */

import { StateCreator } from 'zustand';

// Voice state types
export type VoiceState = 'idle' | 'listening' | 'processing' | 'ready' | 'error';

// Voice analysis data from Web Audio API
export interface VoiceAnalysis {
  volume: number; // 0-1 scale
  frequencies?: Float32Array;
  waveform?: Float32Array;
}

// Voice settings configurable by the user
export interface VoiceSettings {
  autoSubmit: boolean;
  autoSubmitDelay: number; // In milliseconds
  language: string;
  silenceThreshold: number; // In seconds
  postProcessingEnabled: boolean;
  promptToneEnabled: boolean; // Play tone when recording starts/stops
  accessibilityMode: boolean; // For screen reader or non-audio cues
}

export interface VoiceSlice {
  // State
  isRecording: boolean;
  voiceState: VoiceState;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  isEnabled: boolean;
  errorMessage: string | null;
  analysis: VoiceAnalysis | null;
  visualizerData: number[]; // For UI visualization
  isSpeechRecognitionSupported: boolean;
  settings: VoiceSettings;
  
  // State setters (primarily for useVoiceInput)
  setRecordingState: (isRecording: boolean) => void;
  setVoiceState: (state: VoiceState) => void;
  setTranscript: (text: string, confidence?: number, isFinal?: boolean) => void;
  setInterimTranscript: (text: string) => void;
  setError: (message: string | null) => void;
  setAnalysis: (analysis: VoiceAnalysis | null) => void;
  setVisualizerData: (data: number[]) => void;
  
  // Reset methods
  resetTranscript: () => void;
  resetVoiceState: () => void;
  
  // Settings actions
  setEnabled: (enabled: boolean) => void;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  resetSettings: () => void;
  
  // Speech support detection
  setSpeechRecognitionSupport: (isSupported: boolean) => void;
  
  // Events from useVoiceInput hook
  onRecordingStarted: () => void;
  onRecordingStopped: () => void;
  onTranscriptReceived: (transcript: string, isFinal: boolean, confidence?: number) => void;
  onVoiceProcessingError: (error: string) => void;
  
  // Debug callback
  setDebugCallback: (callback: ((state: VoiceSlice) => void) | null) => void;
}

// Default voice settings
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  autoSubmit: true,
  autoSubmitDelay: 1500, // 1.5 seconds
  language: 'en-US',
  silenceThreshold: 2.0, // 2 seconds of silence
  postProcessingEnabled: true,
  promptToneEnabled: true,
  accessibilityMode: false
};

// Load settings from localStorage
const loadSettings = (): VoiceSettings => {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS;
  
  try {
    const storedSettings = localStorage.getItem('asraya-voice-settings');
    if (storedSettings) {
      return {
        ...DEFAULT_VOICE_SETTINGS,
        ...JSON.parse(storedSettings)
      };
    }
  } catch (e) {
    console.warn('Failed to load voice settings from localStorage', e);
  }
  
  return DEFAULT_VOICE_SETTINGS;
};

// Save settings to localStorage
const saveSettings = (settings: VoiceSettings): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('asraya-voice-settings', JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save voice settings to localStorage', e);
  }
};

export const createVoiceSlice: StateCreator<VoiceSlice> = (set, get) => {
  // Debug callback - stored in closure to avoid state serialization issues
  let debugCallback: ((state: VoiceSlice) => void) | null = null;
  
  // Helper to call debug callback after state updates
  const notifyDebugger = () => {
    if (debugCallback && process.env.NODE_ENV !== 'production') {
      setTimeout(() => debugCallback?.(get()), 0);
    }
  };
  
  // Helper to update state and notify debugger
  const updateState = (newState: Partial<VoiceSlice>) => {
    set(newState);
    notifyDebugger();
  };
  
  return {
    // Initial state
    isRecording: false,
    voiceState: 'idle',
    transcript: '',
    interimTranscript: '',
    confidence: 0,
    isEnabled: true,
    errorMessage: null,
    analysis: null,
    visualizerData: Array(50).fill(0),
    isSpeechRecognitionSupported: false,
    settings: loadSettings(),
    
    // State setters
    setRecordingState: (isRecording) => updateState({ isRecording }),
    
    setVoiceState: (state) => updateState({ voiceState: state }),
    
    setTranscript: (text, confidence = 0, isFinal = true) => {
      if (isFinal) {
        updateState({ 
          transcript: text, 
          confidence,
          interimTranscript: '',
          voiceState: text ? 'ready' : 'idle' 
        });
      } else {
        updateState({
          interimTranscript: text,
          confidence
        });
      }
    },
    
    setInterimTranscript: (text) => updateState({ interimTranscript: text }),
    
    setError: (message) => updateState({ 
      errorMessage: message,
      voiceState: message ? 'error' : get().voiceState 
    }),
    
    setAnalysis: (analysis) => updateState({ analysis }),
    
    setVisualizerData: (data) => updateState({ visualizerData: data }),
    
    // Reset methods
    resetTranscript: () => updateState({ 
      transcript: '', 
      interimTranscript: '',
      confidence: 0
    }),
    
    resetVoiceState: () => updateState({
      isRecording: false,
      transcript: '',
      interimTranscript: '',
      voiceState: 'idle',
      confidence: 0,
      errorMessage: null,
      visualizerData: Array(50).fill(0),
      analysis: null
    }),
    
    // Settings actions
    setEnabled: (enabled) => updateState({ isEnabled: enabled }),
    
    updateSettings: (newSettings) => {
      const updatedSettings = {
        ...get().settings,
        ...newSettings
      };
      
      // Persist settings to localStorage
      saveSettings(updatedSettings);
      
      updateState({ settings: updatedSettings });
    },
    
    resetSettings: () => {
      saveSettings(DEFAULT_VOICE_SETTINGS);
      updateState({ settings: DEFAULT_VOICE_SETTINGS });
    },
    
    setSpeechRecognitionSupport: (isSupported) => {
      updateState({ isSpeechRecognitionSupported: isSupported });
    },
    
    // Events from useVoiceInput hook
    onRecordingStarted: () => {
      updateState({ 
        isRecording: true,
        voiceState: 'listening',
        errorMessage: null,
        interimTranscript: ''
      });
    },
    
    onRecordingStopped: () => {
      updateState({ 
        isRecording: false,
        voiceState: get().transcript ? 'ready' : 'idle'
      });
    },
    
    onTranscriptReceived: (transcript, isFinal, confidence = 0) => {
      if (isFinal) {
        updateState({ 
          transcript,
          interimTranscript: '',
          confidence,
          voiceState: 'ready'
        });
      } else {
        updateState({ 
          interimTranscript: transcript,
          confidence
        });
      }
    },
    
    onVoiceProcessingError: (error) => {
      updateState({ 
        voiceState: 'error',
        errorMessage: error,
        isRecording: false
      });
    },
    
    // Debug callback
    setDebugCallback: (callback) => {
      debugCallback = callback;
    }
  };
};