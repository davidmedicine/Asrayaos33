/**
 * OnlineFriendChip.a11y.stories.tsx
 * Accessibility-focused stories for testing OnlineFriendChip
 * Specifically testing keyboard navigation and high contrast mode
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { OnlineFriendChip } from './OnlineFriendChip';
import { PresenceKind } from '@/types';

// Mock online friend data
const mockFriend = {
  id: 'user1',
  name: 'Alex Smith',
  kind: PresenceKind.User,
  avatarUrl: 'https://i.pravatar.cc/150?img=3',
  status: 'online',
  lastActive: Date.now(),
};

const typingFriend = {
  ...mockFriend,
  id: 'user2',
  name: 'Taylor Johnson',
  status: 'typing',
};

const awayFriend = {
  ...mockFriend,
  id: 'user3', 
  name: 'Jamie Garcia',
  status: 'away',
  avatarUrl: null, // Test fallback initial
};

// Create the focus trap container for keyboard testing
const FocusTrapContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col gap-4 p-6 border border-dashed rounded-lg">
    <h2 className="text-lg font-semibold">Keyboard Navigation Test</h2>
    <p className="text-sm">Use Tab to navigate, Enter/Space to select</p>
    <button className="px-4 py-2 rounded bg-blue-600 text-white">Focus Trap Start</button>
    {children}
    <button className="px-4 py-2 rounded bg-blue-600 text-white">Focus Trap End</button>
  </div>
);

const meta = {
  title: 'Components/OnlineFriendChip/A11y',
  component: OnlineFriendChip,
  parameters: {
    layout: 'centered',
    a11y: {
      // a11y addon config options
      config: {
        rules: [
          {
            // Ensure focus order is logical
            id: 'focus-order-semantics',
            reviewOnFail: true,
          },
          {
            // Ensure interactive elements are focusable
            id: 'interactive-element-affordance',
            reviewOnFail: true,
          },
        ],
      },
    },
  },
  argTypes: {
    friend: { control: 'object' },
    showStatus: { control: 'boolean' },
    showTooltip: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    onClick: { action: 'clicked' },
  },
  args: {
    friend: mockFriend,
    showStatus: true,
    showTooltip: true,
    size: 'md',
    onClick: action('clicked'),
  },
} satisfies Meta<typeof OnlineFriendChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic example with keyboard focus
 */
export const KeyboardFocusable: Story = {
  render: (args) => (
    <FocusTrapContainer>
      <OnlineFriendChip {...args} />
    </FocusTrapContainer>
  ),
};

/**
 * All status variations for testing
 */
export const AllStatusVariations: Story = {
  render: (args) => (
    <div className="flex flex-col space-y-4">
      <OnlineFriendChip {...args} friend={mockFriend} />
      <OnlineFriendChip {...args} friend={typingFriend} />
      <OnlineFriendChip {...args} friend={awayFriend} />
    </div>
  ),
};

/**
 * High contrast mode simulation
 * For testing the forced-colors media query styles
 */
export const HighContrastMode: Story = {
  parameters: {
    chromatic: { forcedColors: 'active' },
    docs: {
      description: {
        story: 'This story simulates high contrast mode for testing accessibility features.',
      },
    },
  },
  render: (args) => (
    <div className="flex flex-col space-y-4">
      <OnlineFriendChip {...args} friend={mockFriend} />
      <OnlineFriendChip {...args} friend={typingFriend} />
      <OnlineFriendChip {...args} friend={awayFriend} />
    </div>
  ),
};

/**
 * Interactive vs. non-interactive version
 * Tests that non-interactive chips don't have focus styles or tabindex
 */
export const InteractiveVsNonInteractive: Story = {
  render: (args) => (
    <FocusTrapContainer>
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">Interactive (with onClick):</h3>
          <OnlineFriendChip {...args} onClick={action('clicked')} />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2">Non-interactive (no onClick):</h3>
          <OnlineFriendChip {...args} onClick={undefined} />
        </div>
      </div>
    </FocusTrapContainer>
  ),
};