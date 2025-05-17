'use client';

import React from 'react';

/**
 * Chat-focused page that relies on PanelGroup rendering in layout.tsx
 */
export default function ChatPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-medium text-text-default mb-4">Chat</h1>
      <p className="text-text-muted mb-6">
        Focus on your conversations with AI assistants.
      </p>
    </div>
  );
}