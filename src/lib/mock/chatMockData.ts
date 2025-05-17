// === File: src/lib/mock/chatMockData.ts ===
// Description: Mock data for ChatOrQuest, Messages, StreamEvents, and Presence

import { ChatOrQuest, ChatMessage, StreamEvent, PresenceState, QuestMetadata, QuestSuggestionInput } from '@/types'; // Use QuestSuggestionInput from types
import { AsrayaAgentId } from '@/types/agent';

// ===== Mock Chat and Quest List =====
export const mockChatOrQuestList: ChatOrQuest[] = [
  {
    id: 'chat-1',
    type: 'chat',
    title: 'General Discussion',
    createdAt: '2025-04-08T12:00:00Z',
    updatedAt: '2025-04-09T15:30:00Z',
    participants: [ // Assuming participants are objects as per prior corrections
        { id: 'user-1', type: 'user', name: 'User' },
        { id: 'oracle', type: 'agent', name: 'Oracle' }
    ],
    isGroup: false,
    channelName: 'channel-chat-1',
    lastMessagePreview: 'Let\'s look at authentication then. Supabase provides several methods...', // Use lastMessagePreview
    agentId: 'oracle', // Identify primary agent involved
    agentAvatarUrl: '/avatars/oracle.png', // Example avatar URL
  },
  {
    id: 'chat-2',
    type: 'chat',
    title: 'Design Feedback',
    createdAt: '2025-04-07T10:00:00Z',
    updatedAt: '2025-04-09T14:20:00Z',
    participants: [
        { id: 'user-1', type: 'user', name: 'User' },
        { id: 'muse', type: 'agent', name: 'Muse' }
    ],
    isGroup: false,
    channelName: 'channel-chat-2',
    lastMessagePreview: 'I love the design concept you created!',
    agentId: 'muse',
    agentAvatarUrl: '/avatars/muse.png',
  },
  {
    id: 'chat-3',
    type: 'chat',
    title: 'Project Planning',
    createdAt: '2025-04-06T09:30:00Z',
    updatedAt: '2025-04-08T16:45:00Z',
    participants: [
        { id: 'user-1', type: 'user', name: 'User' },
        { id: 'navigator', type: 'agent', name: 'Navigator' }
    ],
    isGroup: false,
    channelName: 'channel-chat-3',
    lastMessagePreview: 'Let me outline the next steps for your project.',
    agentId: 'navigator',
    agentAvatarUrl: '/avatars/navigator.png',
  },
  {
    id: 'quest-1',
    type: 'quest',
    title: 'Building a React Component',
    createdAt: '2025-04-08T08:00:00Z',
    updatedAt: '2025-04-09T16:00:00Z',
    participants: [
        { id: 'user-1', type: 'user', name: 'User' },
        { id: 'oracle', type: 'agent', name: 'Oracle' }
    ],
    isGroup: false,
    channelName: 'channel-quest-1',
    a2aTaskId: 'task-1-create-component',
    evolvabilityScore: 85,
    themeIntent: 'development',
    status: 'active', // Line 57 - CORRECTED: Added comma
    lastMessagePreview: 'Great! For time-series data visualization with React...', // Use preview
    agentId: 'oracle',
    agentAvatarUrl: '/avatars/oracle.png',
    progressPercent: 35, // Example progress
    milestones: [ // Example milestones
        { id: 'm1', label: 'Setup', completed: true },
        { id: 'm2', label: 'Component Structure', completed: false },
        { id: 'm3', label: 'Visualization Lib', completed: false },
        { id: 'm4', label: 'Testing', completed: false },
    ],
  },
  {
    id: 'quest-2',
    type: 'quest',
    title: 'Content Strategy Development',
    createdAt: '2025-04-07T13:30:00Z',
    updatedAt: '2025-04-09T11:20:00Z',
    participants: [
        { id: 'user-1', type: 'user', name: 'User' },
        { id: 'scribe', type: 'agent', name: 'Scribe' }
    ],
    isGroup: false,
    channelName: 'channel-quest-2',
    a2aTaskId: 'task-2-content-strategy',
    evolvabilityScore: 72,
    themeIntent: 'marketing',
    status: 'active',
    lastMessagePreview: 'I\'ve analyzed your audience and prepared recommendations.',
    agentId: 'scribe',
    agentAvatarUrl: '/avatars/scribe.png',
    progressPercent: 60,
    milestones: [
        { id: 'm5', label: 'Audience Analysis', completed: true },
        { id: 'm6', label: 'Pillar Definition', completed: true },
        { id: 'm7', label: 'Schedule Draft', completed: false },
        { id: 'm8', label: 'Distribution Plan', completed: false },
    ],
  },
  {
    id: 'group-chat-1',
    type: 'chat',
    title: 'Team Collaboration',
    createdAt: '2025-04-05T14:00:00Z',
    updatedAt: '2025-04-09T17:15:00Z',
    participants: [
        { id: 'user-1', type: 'user', name: 'User' },
        { id: 'oracle', type: 'agent', name: 'Oracle', avatarUrl: '/avatars/oracle.png' },
        { id: 'muse', type: 'agent', name: 'Muse', avatarUrl: '/avatars/muse.png' },
        { id: 'navigator', type: 'agent', name: 'Navigator', avatarUrl: '/avatars/navigator.png' }
    ],
    isGroup: true,
    channelName: 'channel-group-1',
    lastMessagePreview: 'Let\'s combine our perspectives on this problem.',
    // No single agentId for group chats unless context dictates a primary
  },
  {
    id: 'group-quest-1',
    type: 'quest',
    title: 'Multi-Agent Research Project',
    createdAt: '2025-04-04T09:00:00Z',
    updatedAt: '2025-04-09T18:30:00Z',
    participants: [
        { id: 'user-1', type: 'user', name: 'User' },
        { id: 'oracle', type: 'agent', name: 'Oracle', avatarUrl: '/avatars/oracle.png' },
        { id: 'seeker', type: 'agent', name: 'Seeker', avatarUrl: '/avatars/seeker.png' },
        { id: 'scribe', type: 'agent', name: 'Scribe', avatarUrl: '/avatars/scribe.png' }
    ],
    isGroup: true,
    channelName: 'channel-group-quest-1',
    a2aTaskId: 'task-3-research-project',
    evolvabilityScore: 91,
    themeIntent: 'research',
    status: 'active',
    lastMessagePreview: 'We\'ve collected research from multiple sources...',
    progressPercent: 45,
    milestones: [
        { id: 'm9', label: 'Info Gathering', completed: true },
        { id: 'm10', label: 'Analysis', completed: false },
        { id: 'm11', label: 'Synthesis', completed: false },
        { id: 'm12', label: 'Report', completed: false },
    ],
  }
];

// ===== Mock Messages =====
// Using senderType consistently as per ChatMessage type
export const mockMessages: Record<string, ChatMessage[]> = {
  'chat-1': [
    {
      id: 'msg-1',
      clientGeneratedId: 'client-msg-1',
      conversationId: 'chat-1',
      senderId: 'user-1',
      senderType: 'user',
      role: 'user',
      content: 'Hello, I need help understanding how to integrate the Supabase API with my Next.js app.',
      createdAt: '2025-04-09T15:20:00Z',
      status: 'delivered'
    },
    {
      id: 'msg-2',
      clientGeneratedId: 'client-msg-2',
      conversationId: 'chat-1',
      senderId: 'oracle',
      senderType: 'agent',
      agentId: 'oracle', // agentId for agent messages
      role: 'agent',
      content: 'I\'d be happy to help you with Supabase integration. Let\'s break it down into steps. First, you\'ll need to install the Supabase client library.',
      createdAt: '2025-04-09T15:22:00Z',
      status: 'delivered',
      metadata: {
        agentName: 'Oracle', // Consistent naming
      }
    },
    {
      id: 'msg-3',
      clientGeneratedId: 'client-msg-3',
      conversationId: 'chat-1',
      senderId: 'user-1',
      senderType: 'user',
      role: 'user',
      content: 'I\'ve already installed the client library. I\'m having trouble with authentication.',
      createdAt: '2025-04-09T15:25:00Z',
      status: 'delivered'
    },
    {
      id: 'msg-4',
      clientGeneratedId: 'client-msg-4',
      conversationId: 'chat-1',
      senderId: 'oracle',
      senderType: 'agent',
      agentId: 'oracle',
      role: 'agent',
      content: 'Let\'s look at authentication then. Supabase provides several methods. Are you trying to implement password-based login, OAuth, or magic links?',
      createdAt: '2025-04-09T15:30:00Z',
      status: 'delivered',
      metadata: {
        agentName: 'Oracle',
      }
    }
  ],
  'quest-1': [
    {
      id: 'msg-5',
      clientGeneratedId: 'client-msg-5',
      conversationId: 'quest-1',
      senderId: 'user-1',
      senderType: 'user',
      role: 'user',
      content: 'I need to build a reusable React component for data visualization.',
      createdAt: '2025-04-09T15:40:00Z',
      status: 'delivered'
    },
    {
      id: 'msg-6',
      clientGeneratedId: 'client-msg-6',
      conversationId: 'quest-1',
      senderId: 'oracle',
      senderType: 'agent',
      agentId: 'oracle',
      role: 'agent',
      content: 'I\'ll help you create a data visualization component. What kind of data are you working with and what type of visualization do you need?',
      createdAt: '2025-04-09T15:42:00Z',
      status: 'delivered',
      metadata: {
        agentName: 'Oracle',
      }
    },
    {
      id: 'msg-7',
      clientGeneratedId: 'client-msg-7',
      conversationId: 'quest-1',
      senderId: 'user-1',
      senderType: 'user',
      role: 'user',
      content: 'I have time-series data that I\'d like to display as a line chart with interactive tooltips.',
      createdAt: '2025-04-09T15:45:00Z',
      status: 'delivered'
    },
    {
      id: 'msg-8',
      clientGeneratedId: 'client-msg-8',
      conversationId: 'quest-1',
      senderId: 'oracle',
      senderType: 'agent',
      agentId: 'oracle',
      role: 'agent',
      content: 'Great! For time-series data visualization with React, I\'d recommend using a library like Recharts or Chart.js. Let me create a component structure for you.',
      createdAt: '2025-04-09T15:48:00Z',
      status: 'delivered',
      metadata: {
        agentName: 'Oracle',
      }
    }
  ],
  'group-chat-1': [
    {
      id: 'msg-9',
      clientGeneratedId: 'client-msg-9',
      conversationId: 'group-chat-1',
      senderId: 'user-1',
      senderType: 'user',
      role: 'user',
      content: 'I\'m working on a creative project and need input from multiple perspectives.',
      createdAt: '2025-04-09T16:00:00Z',
      status: 'delivered'
    },
    {
      id: 'msg-10',
      clientGeneratedId: 'client-msg-10',
      conversationId: 'group-chat-1',
      senderId: 'oracle',
      senderType: 'agent',
      agentId: 'oracle',
      role: 'agent',
      content: 'From an analytical perspective, I suggest starting with clearly defined objectives and success metrics for your creative project.',
      createdAt: '2025-04-09T16:02:00Z',
      status: 'delivered',
      metadata: {
        agentName: 'Oracle',
      }
    },
    {
      id: 'msg-11',
      clientGeneratedId: 'client-msg-11',
      conversationId: 'group-chat-1',
      senderId: 'muse',
      senderType: 'agent',
      agentId: 'muse',
      role: 'agent',
      content: 'I think we should explore unconventional approaches! What if we combine different artistic mediums to create something truly unique?',
      createdAt: '2025-04-09T16:04:00Z',
      status: 'delivered',
      metadata: {
        agentName: 'Muse',
      }
    },
    {
      id: 'msg-12',
      clientGeneratedId: 'client-msg-12',
      conversationId: 'group-chat-1',
      senderId: 'navigator',
      senderType: 'agent',
      agentId: 'navigator',
      role: 'agent',
      content: 'Let\'s map out a strategic plan for this project. We need to consider timeline, resources, and key milestones to ensure success.',
      createdAt: '2025-04-09T16:06:00Z',
      status: 'delivered',
      metadata: {
        agentName: 'Navigator',
      }
    },
    {
      id: 'msg-13',
      clientGeneratedId: 'client-msg-13',
      conversationId: 'group-chat-1',
      senderId: 'system', // senderId might be 'system'
      senderType: 'system', // Use 'system' senderType
      role: 'multi-agent-coordination', // Specific role for this type of system message
      content: 'Oracle has transferred the conversation to Muse for creative exploration.',
      createdAt: '2025-04-09T16:10:00Z',
      status: 'delivered',
      metadata: { // Metadata can provide context for system messages
          eventType: 'handoff',
          sourceAgent: 'oracle',
          targetAgent: 'muse',
      }
    }
  ]
};

// Mock optimistic message (unsent/in progress)
export const mockOptimisticMessage: ChatMessage = {
  // id might be null or undefined until persisted
  conversationId: 'chat-1',
  senderId: 'user-1',
  senderType: 'user',
  role: 'user',
  content: 'Can you provide more details about Supabase authentication?',
  createdAt: new Date().toISOString(), // Use current time for optimistic
  isOptimistic: true,
  status: 'sending',
  clientGeneratedId: `client-temp-${Date.now()}` // Unique client ID
};

// ===== Mock Stream Events =====
export const mockStreamEvents: StreamEvent[] = [
  {
    taskId: 'task-1-create-component',
    type: 'thinking',
    part: {
      type: 'text',
      text: 'Considering libraries for visualization...',
      metadata: {
        agentName: 'Oracle', // Consistent naming
        stepType: 'thought'
      }
    },
    timestamp: '2025-04-09T15:49:00Z'
  },
  {
    taskId: 'task-1-create-component',
    type: 'thinking',
    part: {
      type: 'text',
      text: 'Requirements: time-series, line chart, tooltips.',
      metadata: {
        agentName: 'Oracle',
        stepType: 'thought'
      }
    },
    timestamp: '2025-04-09T15:49:30Z'
  },
  {
    taskId: 'task-1-create-component',
    type: 'thinking',
    part: {
      type: 'text',
      text: 'Recharts looks suitable.',
      metadata: {
        agentName: 'Oracle',
        stepType: 'thought'
      }
    },
    timestamp: '2025-04-09T15:50:00Z'
  },
  {
    taskId: 'task-1-create-component',
    type: 'thinking',
    part: {
      type: 'text',
      text: 'Executing search for Recharts package.', // More descriptive text
      metadata: {
        agentName: 'Oracle',
        stepType: 'action', // Indicate it's an action
        toolName: 'npmSearch', // Example tool name
        toolInput: { query: 'recharts' } // Example tool input
      }
    },
    timestamp: '2025-04-09T15:50:30Z'
  },
  {
    taskId: 'task-1-create-component',
    type: 'thinking',
    part: {
      type: 'text',
      text: 'Latest stable version is 2.5.0.', // More descriptive text
      metadata: {
        agentName: 'Oracle',
        stepType: 'observation', // Result of the action
        toolName: 'npmSearch', // Relate observation to the tool
        toolOutput: { version: '2.5.0' } // Example tool output
      }
    },
    timestamp: '2025-04-09T15:51:00Z'
  },
  {
    taskId: 'task-1-create-component',
    type: 'thinking',
    part: {
      type: 'text',
      text: 'Planning component structure.',
      metadata: {
        agentName: 'Oracle',
        stepType: 'thought'
      }
    },
    timestamp: '2025-04-09T15:51:30Z'
  },
  // ... (add more diverse mock stream events for other tasks/agents)
];

// ===== Mock Presence Data =====
// Ensure PresenceState matches the actual type used (e.g., from Supabase RT)
export const mockPresenceData: Record<string, PresenceState[]> = {
  'channel-chat-1': [ // Use channelName as key
    {
      id: 'user-1', // Corresponds to senderId
      name: 'Dave', // User's name
      avatarUrl: '/avatars/dave.png', // Example user avatar
      status: 'online',
      lastSeen: new Date().toISOString(), // Dynamic last seen
      // Add any other fields defined in your PresenceState type
    },
    {
      id: 'oracle', // Corresponds to senderId
      name: 'Oracle',
      avatarUrl: '/avatars/oracle.png',
      status: 'online',
      lastSeen: new Date(Date.now() - 5000).toISOString(), // Slightly older
    }
  ],
  'channel-group-1': [
    { id: 'user-1', name: 'Dave', avatarUrl: '/avatars/dave.png', status: 'online', lastSeen: new Date().toISOString() },
    { id: 'oracle', name: 'Oracle', avatarUrl: '/avatars/oracle.png', status: 'online', lastSeen: new Date(Date.now() - 10000).toISOString() },
    { id: 'muse', name: 'Muse', avatarUrl: '/avatars/muse.png', status: 'typing', lastSeen: new Date(Date.now() - 2000).toISOString() },
    { id: 'navigator', name: 'Navigator', avatarUrl: '/avatars/navigator.png', status: 'away', lastSeen: new Date(Date.now() - 300000).toISOString() },
  ],
  // ... (add presence for other channels)
};

// ===== Mock Quest Metadata (Aligning with QuestMetadata type) =====
// Use actual fields defined in the QuestMetadata type
export const mockQuestMetadata: Record<string, QuestMetadata | null> = {
  'quest-1': {
    // Fields based on the QuestMetadata type definition
    goal: 'Create a reusable React component for time-series data visualization with interactive tooltips.',
    intention: 'To build a modular and maintainable component for displaying line charts.',
    outcome: 'A functional React component accepting time-series data and rendering an interactive line chart.',
    summary: 'This quest involves frontend development using React and a suitable charting library like Recharts.',
    keywords: ['react', 'component', 'visualization', 'chart', 'recharts', 'frontend'],
    evolvabilityScore: 85,
    themeIntent: 'development',
    suggestions: [ // Array of QuestSuggestionInput objects
      {
        id: 'suggestion-1-q1',
        action: 'generate_code', // Use action identifier string
        reason: 'To establish the basic file structure.',
        confidence: 0.95,
        preferredAgentId: 'oracle' as AsrayaAgentId,
        icon: 'code', // Optional icon hint
        args: { componentName: 'TimeSeriesChart' } // Example specific args
      },
      {
        id: 'suggestion-2-q1',
        action: 'install_dependency',
        reason: 'Recharts is needed for chart rendering.',
        confidence: 0.88,
        preferredAgentId: 'navigator' as AsrayaAgentId,
        icon: 'package',
        args: { packageName: 'recharts' }
      },
    ]
  },
  'quest-2': {
    goal: 'Develop a comprehensive content strategy for digital marketing.',
    intention: 'To define target audiences, content pillars, and distribution channels.',
    outcome: 'A documented content strategy plan with measurable KPIs.',
    summary: 'Focuses on market research, audience segmentation, and content planning.',
    keywords: ['marketing', 'content strategy', 'seo', 'audience', 'planning'],
    evolvabilityScore: 72,
    themeIntent: 'marketing',
    suggestions: [
        { id: 'suggestion-4-q2', action: 'define_personas', reason: 'Foundation for targeted content.', confidence: 0.92, preferredAgentId: 'scribe' as AsrayaAgentId, icon: 'users' },
        { id: 'suggestion-5-q2', action: 'analyze_competitors', reason: 'Identify market gaps.', confidence: 0.85, preferredAgentId: 'witness' as AsrayaAgentId, icon: 'search' },
    ]
  },
  'group-quest-1': {
    goal: 'Collaborative research leveraging multiple agent capabilities.',
    intention: 'To synthesize information from diverse sources for actionable insights.',
    outcome: 'A comprehensive research report with data analysis and recommendations.',
    summary: 'Involves parallel information gathering, analysis, and structured documentation by multiple agents.',
    keywords: ['research', 'collaboration', 'multi-agent', 'analysis', 'reporting'],
    evolvabilityScore: 91,
    themeIntent: 'research',
    suggestions: [
        { id: 'suggestion-6-gq1', action: 'aggregate_research', reason: 'Centralize findings.', confidence: 0.90, preferredAgentId: 'scribe' as AsrayaAgentId, icon: 'file-text' },
        { id: 'suggestion-7-gq1', action: 'generate_insights', reason: 'Extract actionable intelligence.', confidence: 0.82, preferredAgentId: 'oracle' as AsrayaAgentId, icon: 'lightbulb' },
        { id: 'suggestion-8-gq1', action: 'explore_more_sources', reason: 'Ensure comprehensive coverage.', confidence: 0.78, preferredAgentId: 'seeker' as AsrayaAgentId, icon: 'compass' },
    ]
  },
  // Add entries for other quests or return null if no metadata exists
  'some-other-quest-id': null,
};

// ===== Mock Action Suggestions (Legacy - Kept for reference, prefer suggestions within QuestMetadata) =====
// This structure might be deprecated if suggestions are directly part of QuestMetadata
// export const mockActionSuggestions: Record<string, QuestSuggestionInput[]> = { ... };