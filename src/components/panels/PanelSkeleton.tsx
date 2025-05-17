// === File: src/components/panels/PanelSkeleton.tsx ===
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PanelSkeletonProps {
  /** Number of placeholder items to display */
  itemCount?: number;
  /** Type of skeleton to display */
  skeletonType?: 'default' | 'list' | 'cards' | 'form' | 'grid';
  /** Additional CSS classes */
  className?: string;
}

/**
 * A placeholder skeleton component for panel content
 * Provides consistent loading states during development
 */
const PanelSkeleton = ({
  itemCount = 3,
  skeletonType = 'default',
  className,
}: PanelSkeletonProps) => {
  const renderSkeletonItems = () => {
    const items = [];
    
    for (let i = 0; i < itemCount; i++) {
      const isLast = i === itemCount - 1;
      
      switch (skeletonType) {
        case 'list':
          items.push(
            <div 
              key={`list-item-${i}`}
              className={cn(
                "flex items-center py-3 px-4", 
                !isLast && "border-b border-[var(--border-muted)]",
                "animate-pulse"
              )}
            >
              <div className="h-10 w-10 rounded-md bg-[var(--bg-muted)]"></div>
              <div className="ml-3 flex-1">
                <div className="h-4 w-3/4 rounded bg-[var(--bg-muted)]"></div>
                <div className="mt-2 h-3 w-1/2 rounded bg-[var(--bg-muted)] opacity-70"></div>
              </div>
            </div>
          );
          break;
          
        case 'cards':
          items.push(
            <div 
              key={`card-item-${i}`}
              className="m-3 h-32 rounded-lg bg-[var(--bg-muted)] p-4 animate-pulse"
            >
              <div className="h-4 w-1/2 rounded bg-[var(--bg-surface)] opacity-30"></div>
              <div className="mt-3 h-3 w-3/4 rounded bg-[var(--bg-surface)] opacity-30"></div>
              <div className="mt-2 h-3 w-2/3 rounded bg-[var(--bg-surface)] opacity-30"></div>
              <div className="mt-4 flex justify-end">
                <div className="h-6 w-16 rounded bg-[var(--bg-surface)] opacity-30"></div>
              </div>
            </div>
          );
          break;
          
        case 'form':
          items.push(
            <div 
              key={`form-item-${i}`}
              className="m-3 animate-pulse"
            >
              <div className="h-4 w-1/4 rounded bg-[var(--bg-muted)]"></div>
              <div className="mt-2 h-10 w-full rounded-md bg-[var(--bg-muted)] opacity-70"></div>
            </div>
          );
          break;
          
        case 'grid':
          items.push(
            <div 
              key={`grid-item-${i}`}
              className="h-20 rounded-md bg-[var(--bg-muted)] animate-pulse"
            ></div>
          );
          break;
          
        default:
          items.push(
            <div 
              key={`default-item-${i}`}
              className="my-3 mx-4 animate-pulse"
            >
              <div className="h-5 w-full rounded bg-[var(--bg-muted)]"></div>
              <div className="mt-2 h-4 w-5/6 rounded bg-[var(--bg-muted)] opacity-70"></div>
              <div className="mt-2 h-4 w-2/3 rounded bg-[var(--bg-muted)] opacity-40"></div>
            </div>
          );
      }
    }
    
    return items;
  };
  
  const containerClasses = cn(
    "panel-skeleton w-full h-full",
    skeletonType === 'grid' && "grid grid-cols-2 gap-3 p-3",
    className
  );
  
  return (
    <div className={containerClasses}>
      {renderSkeletonItems()}
    </div>
  );
};

export { PanelSkeleton };