import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestListView } from '@/features/hub/components/leftpanel/QuestListView';

const baseProps = {
  panelId: 'test-panel',
  activeQuestId: null,
  handleSelectQuest: () => {},
  handleSearchChange: () => {},
  searchQuery: '',
  isLoadingBackground: false,
  isPendingSearch: false,
  isVtEnabled: false,
  shouldVirtualize: false,
  quests: [],
  onSelectFirstFlameFromHeader: () => {},
  handleCreateNewQuest: () => {},
  handlePinQuest: () => {},
  questsTitleRef: { current: null } as React.RefObject<HTMLHeadingElement>,
  searchBarContainerRef: { current: null } as React.RefObject<HTMLDivElement>,
  headerFirstFlameButtonRef: { current: null } as React.RefObject<HTMLButtonElement>,
};

describe('QuestListView', () => {
  it('renders empty state when listItemData is empty', () => {
    render(<QuestListView {...baseProps} listItemData={[]} />);
    expect(
      screen.getByText('No quests available. Start a new one!')
    ).toBeInTheDocument();
  });
});
