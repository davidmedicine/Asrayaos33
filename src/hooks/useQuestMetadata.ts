// Example hook structure: hooks/useQuestMetadata.ts
import { useState, useEffect } from 'react';

// TODO: Define proper types for the quest metadata
interface QuestMetadata {
  goal: string;
  milestones: Array<{ title: string; [key: string]: any }>; // Basic milestone type
  artifacts: Array<{ id: number | string; [key: string]: any }>; // Basic artifact type
  hexId: number;
  biome: string;
  coherence: number;
  suggestions: Array<{ text: string; action: () => void }>; // Basic suggestion type
  // Add other fields as needed
}

// Mock data function
const getMockQuestMetadata = (): QuestMetadata => ({
  goal: 'Placeholder objective: Reach the Sky Citadel',
  milestones: [
    { title: 'Phase 1: Gather Echo Shards' },
    { title: 'Phase 2: Decode the Portal Rune' },
    { title: 'Phase 3: Activate the Gateway' } // Added one more for testing scroll
  ],
  artifacts: [
    { id: 1, name: 'Shard of Whispers' },
    { id: 2, name: 'Rune Tablet Fragment' },
    { id: 3, name: 'Gateway Key Mold' }, // Added more for testing scroll
    { id: 4, name: 'Placeholder Artifact' }
  ],
  hexId: 7, // Example: "The Army"
  biome: 'Thunder', // Example Biome
  coherence: 42, // Example Coherence value
  suggestions: [ // Keep suggestions structure if needed by SuggestedActions
      { text: 'Ask about Phase 1', action: () => console.log('Suggestion: Ask about Phase 1')},
      { text: 'Where is the Sky Citadel?', action: () => console.log('Suggestion: Where is the Sky Citadel?')}
  ],
});


export const useQuestMetadata = (questId: string | null): QuestMetadata | null => {
  const [metadata, setMetadata] = useState<QuestMetadata | null>(null);
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    if (!questId) {
        setMetadata(null);
        setLoading(false);
        return;
    }

    setLoading(true);
    // --- Placeholder Logic ---
    // Set a flag or check condition to determine if backend is ready
    const useMockData = true; // Set to false to attempt real fetch

    if (useMockData) {
      console.log("Using mock quest metadata");
      setMetadata(getMockQuestMetadata());
      setLoading(false);
    } else {
      // TODO: Replace with actual backend data fetching logic
      console.log(`Workspaceing real data for quest ${questId}...`);
      fetch(`/api/quests/${questId}/metadata`) // Example API endpoint
        .then(res => res.json())
        .then(data => {
          // TODO: Validate and potentially transform data
          setMetadata(data as QuestMetadata);
          setLoading(false);
        })
        .catch(error => {
          console.error("Failed to fetch quest metadata:", error);
          // TODO: Implement proper error handling, maybe fallback to mock or show error state
          setMetadata(getMockQuestMetadata()); // Fallback to mock on error for now
          setLoading(false);
        });
    }
    // --- End Placeholder Logic ---

  }, [questId]);

  // Return null during loading or if no questId
  return loading ? null : metadata;
};