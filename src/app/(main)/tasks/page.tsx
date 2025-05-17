'use client';

import React from 'react';

/**
 * Tasks management page that relies on PanelGroup rendering in layout.tsx
 */
export default function TasksPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-medium text-text-default mb-4">Tasks</h1>
      <p className="text-text-muted mb-6">
        Manage your agent tasks and workflows efficiently.
      </p>
    </div>
  );
}