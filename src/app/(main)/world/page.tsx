'use client';

import React from 'react';

/**
 * World visualization page that relies on PanelGroup rendering in layout.tsx
 */
export default function WorldPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-medium text-text-default mb-4">World</h1>
      <p className="text-text-muted mb-6">
        Visualize your knowledge and connections in a spatial environment.
      </p>
    </div>
  );
}