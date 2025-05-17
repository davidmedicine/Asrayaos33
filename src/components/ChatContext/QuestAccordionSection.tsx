import React from 'react';
import * as Accordion from '@radix-ui/react-accordion';

// TODO: Define a proper type for milestones
interface Milestone {
  title: string;
  // Add other milestone properties as needed
}

interface QuestAccordionProps {
  milestones?: Milestone[];
}

export const QuestAccordion: React.FC<QuestAccordionProps> = ({ milestones = [] }) => {
  if (!milestones || milestones.length === 0) {
    // TODO: Maybe show a placeholder if there are no milestones?
    return null;
  }

  return (
    // TODO: Consider defaultOpen or managing state if needed
    <Accordion.Root type='single' collapsible className='space-y-2 w-full'>
      {milestones.map((m, i) => (
        <Accordion.Item key={m.title || i} value={`item-${i}`} className='border border-slate-700/50 rounded overflow-hidden'>
          <Accordion.Header>
            {/* TODO: Add chevron/indicator for open/close state */}
            <Accordion.Trigger className='p-2 font-medium text-sm w-full text-left hover:bg-slate-800/30 focus:outline-none focus:ring-1 focus:ring-blue-500'>
              {m.title}
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className='p-2 pt-0 text-xs text-muted bg-slate-900/30'>
            {/* TODO: Populate with actual milestone content/details */}
            TODO: Milestone content for "{m.title}"
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
};