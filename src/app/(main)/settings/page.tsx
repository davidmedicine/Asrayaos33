'use client';

import React from 'react';

/**
 * Settings page
 */
export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-medium text-text-default mb-4">Settings</h1>
      <p className="text-text-muted mb-6">
        Configure your Asraya OS experience.
      </p>
      
      <div className="space-y-8">
        <section className="bg-bg-surface p-6 rounded-lg border border-border-default">
          <h2 className="text-xl font-medium mb-4">Account</h2>
          <p className="text-text-muted">Manage your account preferences.</p>
        </section>
        
        <section className="bg-bg-surface p-6 rounded-lg border border-border-default">
          <h2 className="text-xl font-medium mb-4">Appearance</h2>
          <p className="text-text-muted">Customize the look and feel of your interface.</p>
        </section>
        
        <section className="bg-bg-surface p-6 rounded-lg border border-border-default">
          <h2 className="text-xl font-medium mb-4">Agents</h2>
          <p className="text-text-muted">Configure your AI agents and their capabilities.</p>
        </section>
      </div>
    </div>
  );
}