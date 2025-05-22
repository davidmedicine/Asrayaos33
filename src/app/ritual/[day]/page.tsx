// app/ritual/[day]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { ViewTransition } from 'react'; // React 19
import { useQuery } from '@tanstack/react-query';
import type { FlameStatusResponse } from '@/types/flame';
import { fetchFlameStatus } from '@/lib/api/quests';
import { FIRST_FLAME_QUEST_ID } from '@flame';

// Assuming FullPageSpinner, ErrorState, and DayLayout are defined elsewhere
// For completeness, let's add dummy versions if they weren't part of the original snippet.
// If they are already defined in your project, you can remove these.
const FullPageSpinner = () => <div>Loading...</div>;
const ErrorState = () => <div>Error loading data.</div>;
const DayLayout = ({ def, imprints }: { def: any; imprints: any }) => (
  <div>
    <h1>Day Definition: {JSON.stringify(def)}</h1>
    <p>Imprints: {JSON.stringify(imprints)}</p>
  </div>
);


export default function RitualDay({ params:{ day } }: { params: { day: string } }) { // Added type for params
  const { data, isPending, error } = useQuery<FlameStatusResponse>({ // Explicitly typed useQuery
    queryKey: ['flame-status', FIRST_FLAME_QUEST_ID],
    queryFn : () => fetchFlameStatus(FIRST_FLAME_QUEST_ID),
    staleTime: 0,
    placeholderData: previous => previous,
  });

  if (isPending) return <FullPageSpinner/>;
  if (error)    return <ErrorState/>;

  const target = data?.overallProgress?.current_day_target;
  // redirect forward/back if user is on the wrong day
  // Ensure 'day' is compared as a number if 'target' is a number
  if (target !== undefined && Number(day) !== target) {
    redirect(`/ritual/${target}`);
  }

  const def = data?.dayDefinition;
  if (!def) {
    // It's good practice to log or handle this case more specifically if possible
    // For now, notFound() is appropriate as per the original code.
    notFound();
  }

  return (
    <ViewTransition name="ff-day-shell">
      <DayLayout def={def} imprints={data.imprints}/>
    </ViewTransition>
  );
}