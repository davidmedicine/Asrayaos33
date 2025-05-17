'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface StepProps {
  inputs: Record<string, any>;
  setInput: (key: string, value: any) => void;
  onNext: () => void;
  onBack?: () => void;
  stepMeta?: { title?: string; description?: string };
}

export const NameOSStep: React.FC<StepProps> = ({ 
  inputs, 
  setInput, 
  onNext, 
  onBack 
}) => {
  const [error, setError] = React.useState<string | null>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputs.osName?.trim()) {
      setError('Please enter a name for your OS');
      return;
    }
    
    setError(null);
    onNext();
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto p-6 space-y-8">
      <div className="space-y-4 w-full">
        <h2 className="text-2xl md:text-3xl font-light text-center mb-6">Name Your OS</h2>
        
        <p className="text-text-muted text-center mb-6">
          Choose a name that resonates with you. This will be the identity of your personal AI system.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <Input
            label="OS Name"
            placeholder="Enter a name..."
            value={inputs.osName || ''}
            onChange={(e) => setInput('osName', e.target.value)}
            error={error || undefined}
            autoFocus
          />
          
          <div className="flex justify-between pt-4">
            {onBack && (
              <Button
                type="button"
                onClick={onBack}
                variant="outline"
              >
                Back
              </Button>
            )}
            
            <Button 
              type="submit"
              className="ml-auto"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};