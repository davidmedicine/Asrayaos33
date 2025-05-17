/**
 * useVoiceInput.ts
 * Hook to manage voice recording, transcription, and state
 * Uses Web Speech API with callback-based communication
 * Enhanced for ASR-241 with a simpler interface
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Define voice state types
export type VoiceState = 'idle' | 'listening' | 'processing' | 'error';

// Declare global types for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseVoiceInputOptions {
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (error: any) => void;
  lang?: string;
}

export function useVoiceInput({
  onTranscript,
  onStateChange,
  onError,
  lang = 'en-US'
}: UseVoiceInputOptions) {
  // Local state
  const [state, setState] = useState<VoiceState>('idle');
  const [isAvailable, setIsAvailable] = useState<boolean>(false);
  
  // Ref for Web Speech API
  const recognitionRef = useRef<any>(null);
  
  // Check if Web Speech API is available
  useEffect(() => {
    const SpeechRecognition = 
      window.SpeechRecognition || 
      window.webkitSpeechRecognition;
    
    setIsAvailable(!!SpeechRecognition);
  }, []);
  
  // Set up recognition instance
  useEffect(() => {
    if (!isAvailable) return;
    
    const SpeechRecognition = 
      window.SpeechRecognition || 
      window.webkitSpeechRecognition;
    
    const recognition = new SpeechRecognition();
    
    // Configure recognition
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    
    // Set up event handlers
    recognition.onstart = () => {
      setState('listening');
      onStateChange?.('listening');
    };
    
    recognition.onend = () => {
      // Only transition from listening->idle here
      setState((currentState) => {
        if (currentState === 'listening') {
          onStateChange?.('idle');
          return 'idle';
        }
        return currentState; // Remain in processing or error
      });
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setState('error');
      onStateChange?.('error');
      onError?.(event.error);
    };
    
    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      
      // Process all results
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // Call onTranscript callback with results
      if (finalTranscript) {
        onTranscript(finalTranscript, true);
      }
      if (!finalTranscript && interimTranscript) {
        onTranscript(interimTranscript, false);
      }
    };
    
    recognitionRef.current = recognition;
    
    // Cleanup
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping non-started recognition
        }
      }
    };
  }, [isAvailable, onTranscript, onStateChange, onError, lang]);
  
  // Start listening function
  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isAvailable || state === 'listening') {
      if (!isAvailable) {
        onError?.('Speech recognition not available');
      }
      return;
    }
    
    try {
      // Reset error state if retrying
      if (state === 'error') {
        setState('idle');
      }
      
      recognitionRef.current.start();
      // State will be updated in onstart event
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setState('error');
      onStateChange?.('error');
      onError?.(e);
    }
  }, [isAvailable, state, onError, onStateChange]);
  
  // Stop listening function
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isAvailable || state !== 'listening') return;
    
    try {
      // Set to processing state immediately
      setState('processing');
      onStateChange?.('processing');
      
      recognitionRef.current.stop();
      
      // After a timeout, transition to idle if still processing
      // This is a fallback in case onend doesn't fire
      setTimeout(() => {
        setState(currentState => {
          if (currentState === 'processing') {
            onStateChange?.('idle');
            return 'idle';
          }
          return currentState;
        });
      }, 3000);
    } catch (e) {
      console.error('Failed to stop speech recognition:', e);
      setState('error');
      onStateChange?.('error');
      onError?.(e);
    }
  }, [isAvailable, state, onError, onStateChange]);
  
  // Expose API
  return {
    isAvailable,
    state,
    startListening,
    stopListening,
    hasVoiceSupport: isAvailable
  };
}