import React from 'react';

// TODO: Define a proper type for artifacts
interface Artifact {
  id: number | string;
  // Add other artifact properties like name, imageURL, description etc.
}

interface ArtifactGalleryProps {
  artifacts?: Artifact[];
}

export const ArtifactGallery: React.FC<ArtifactGalleryProps> = ({ artifacts = [] }) => {
  if (!artifacts || artifacts.length === 0) {
    // TODO: Maybe show a placeholder if there are no artifacts?
    return <div className="py-2 text-xs text-muted">No artifacts yet.</div>;
  }

  return (
    <div className='flex gap-2 overflow-x-auto py-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent'>
       {/* TODO: Add section title? e.g., <h4 className="text-xs uppercase text-muted mb-1">Artifacts</h4> */}
      {artifacts.map((a, i) => (
        // TODO: Make artifacts interactive (e.g., clickable for details)
        <div
          key={a.id || i}
          className='w-20 h-20 bg-slate-800/40 rounded flex items-center justify-center text-[10px] text-center shrink-0 p-1'
          title={`Artifact ${a.id}`} // TODO: Use real artifact name for title
        >
          {/* TODO: Replace with artifact image/icon */}
          Artifact {a.id}
        </div>
      ))}
       {/* TODO: Add fade effect at edges if overflowing? */}
    </div>
  );
};