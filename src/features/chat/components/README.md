# Chat Components

This directory contains the components for the Unified Chat + Quest Interface.

## Testing Note

Test implementation deferred to Brief 4.24:

- ✅ Unit: Hooks(mocked), SuggestedActions(config)
- ✅ Integration: ActiveConversationPanel(msg render, trace attr/group), ChatContextPanel(conditional), SuggestedActions(indicators)
- ✅ E2E: New Chat, Group Chat stub, Presence stub, Suggestions visibility

## Components Overview

- `UnifiedChatListPanel`: Displays a list of chat and quest conversations
- `ActiveConversationPanel`: Shows the active conversation with message history and input
- `ChatContextPanel`: Displays context information and metadata for the current conversation
- `ConversationListItem`: Individual item in the conversation list
- `SuggestedActions`: Action suggestion buttons for quests
- `messages/`: Components for different message types:
  - `ThinkingTraceMessage`: Agent thinking process visualization
  - `ToolCallMessage`: Tool usage visualization
  - `MultiAgentSystemMessage`: System messages for agent coordination

## Implementation Notes

- Mobile-first approach with responsive considerations throughout
- Uses Zustand for state management (to be connected in Brief 4)
- A2A protocol integration for multi-agent features
- Supabase Realtime for presence and typing indicators