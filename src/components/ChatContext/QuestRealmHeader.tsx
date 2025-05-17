import React from 'react';

interface QuestRealmHeaderProps {
  hexId?: number;
  biome?: string;
  coherence?: number;
}

export const QuestRealmHeader: React.FC<QuestRealmHeaderProps> = ({
  hexId = 1,
  biome = 'Heaven', // TODO: Map biome string to display properties
  coherence = 0,    // TODO: Use coherence value
}) => (
  <div className='flex items-center justify-between mb-4'>
    {/* TODO: replace placeholder with real SVG & ring animation based on coherence */}
    <div className='w-12 h-12 bg-slate-700/20 rounded-full grid place-content-center text-xs shrink-0'>
      {/* TODO: Display hexagram symbol instead of text */}
      ⚑{hexId}
    </div>
    <div className='text-right ml-2'>
      {/* TODO: Display actual biome name */}
      <p className='text-sm font-medium'>{biome}</p>
      {/* TODO: Replace with real Prana/Energy display */}
      <p className='text-[10px] uppercase tracking-wide text-muted'>PRANA</p>
      <p className='text-sm font-semibold'>123</p>
    </div>
  </div>
);