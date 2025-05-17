'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Import step components
import { WelcomeStep } from './steps/WelcomeStep';
import { NameOSStep } from './steps/NameOSStep';
import { SetIntentionStep } from './steps/SetIntentionStep';
import { ReflectionStep } from './steps/ReflectionStep';
import { NameArtifactStep } from './steps/NameArtifactStep';
import { CompletionStep } from './steps/CompletionStep';

// This would match the type from useOnboardingFlow
type OnboardingStepId = 
  | 'welcome'
  | 'name-os'
  | 'set-intention'
  | 'reflection'
  | 'name-artifact'
  | 'completion';

type OnboardingInputs = Record<string, any>;

interface OnboardingStepHostProps {
  currentStep: OnboardingStepId;
  stepMeta?: { title?: string; description?: string };
  inputs: OnboardingInputs;
  setInput: <K extends keyof OnboardingInputs>(key: K, value: OnboardingInputs[K]) => void;
  handleNextStep: () => void;
  handlePrevStep: () => void;
  // Additional props that might be needed by steps
  currentProgress?: number;
  error?: string;
}

export const OnboardingStepHost: React.FC<OnboardingStepHostProps> = (props) => {
  const { 
    currentStep, 
    inputs, 
    setInput, 
    handleNextStep, 
    handlePrevStep, 
    stepMeta 
  } = props;

  return (
    <div className={`theme-step-${currentStep} h-full w-full flex flex-col items-center justify-center p-4 md:p-8`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="w-full h-full flex items-center justify-center"
        >
          {currentStep === 'welcome' && (
            <WelcomeStep 
              inputs={inputs}
              setInput={setInput}
              onNext={handleNextStep}
              stepMeta={stepMeta}
            />
          )}
          
          {currentStep === 'name-os' && (
            <NameOSStep 
              inputs={inputs}
              setInput={setInput}
              onNext={handleNextStep}
              onBack={handlePrevStep}
              stepMeta={stepMeta}
            />
          )}
          
          {currentStep === 'set-intention' && (
            <SetIntentionStep 
              inputs={inputs}
              setInput={setInput}
              onNext={handleNextStep}
              onBack={handlePrevStep}
              stepMeta={stepMeta}
            />
          )}
          
          {currentStep === 'reflection' && (
            <ReflectionStep 
              inputs={inputs}
              setInput={setInput}
              onNext={handleNextStep}
              onBack={handlePrevStep}
              stepMeta={stepMeta}
            />
          )}
          
          {currentStep === 'name-artifact' && (
            <NameArtifactStep 
              inputs={inputs}
              setInput={setInput}
              onNext={handleNextStep}
              onBack={handlePrevStep}
              stepMeta={stepMeta}
            />
          )}
          
          {currentStep === 'completion' && (
            <CompletionStep 
              inputs={inputs}
              setInput={setInput}
              onNext={handleNextStep}
              stepMeta={stepMeta}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};