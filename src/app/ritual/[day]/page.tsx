// app/ritual/[day]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { ViewTransition } from 'react'; // React 19
import { useQuery } from '@tanstack/react-query';
import { FlameStatusPayload } from '@flame';
import { fetchFlameStatus } from '@/lib/api/quests';
export default function RitualDay({ params:{ day } }) {
  const { data, isPending, error } = useQuery({
    queryKey: ['flame-status'],
    queryFn : fetchFlameStatus,
    staleTime: 0,
    placeholderData: previous => previous, // v5 idiom  :contentReference[oaicite:1]{index=1}
  });

  if (isPending) return <FullPageSpinner/>;
  if (error)    return <ErrorState/>;

  const target = data?.overallProgress?.current_day_target;
  // redirect forward/back if user is on the wrong day
  if (Number(day) !== target) redirect(`/ritual/${target}`);

  const def = data?.dayDefinition;
  if (!def) notFound();

  return (
    <ViewTransition name="ff-day-shell">
      <DayLayout def={def} imprints={data.imprints}/>
    </ViewTransition>
  );
}
