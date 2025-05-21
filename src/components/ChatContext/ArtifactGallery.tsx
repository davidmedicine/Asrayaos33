import React from 'react';
import Image from 'next/image';
import type { Artifact } from '@/types/artifact';

interface ArtifactGalleryProps {
  artifacts?: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
}

export const ArtifactGallery: React.FC<ArtifactGalleryProps> = ({
  artifacts = [],
  onArtifactClick,
}) => {
  if (artifacts.length === 0) {
    return (
      <div className="py-2 text-xs text-muted italic" role="status">
        No artifacts yet.
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent">
      {artifacts.map(artifact => (
        <button
          key={artifact.id}
          type="button"
          onClick={() => onArtifactClick?.(artifact)}
          className="w-20 h-20 bg-slate-800/40 rounded flex items-center justify-center text-[10px] text-center shrink-0 p-1 hover:bg-slate-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title={artifact.name}
        >
          {typeof artifact.content === 'object' && 'url' in artifact.content ? (
            <Image
              src={artifact.content.url}
              alt={artifact.name}
              width={80}
              height={80}
              className="object-cover rounded"
            />
          ) : (
            <span className="truncate">{artifact.name}</span>
          )}
        </button>
      ))}
    </div>
  );
};