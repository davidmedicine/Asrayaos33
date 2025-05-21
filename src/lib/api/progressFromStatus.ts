export interface ProgressDayLike { completed?: boolean }
export interface ProgressStatus {
  progress?: number | ProgressDayLike[];
  totalDays?: number;
}

export function progressFromStatus(status: ProgressStatus): number | undefined {
  const { progress, totalDays } = status;
  if (typeof progress === 'number') return progress;
  if (Array.isArray(progress)) {
    const completed = progress.filter(d => d && d.completed).length;
    const total = typeof totalDays === 'number' ? totalDays : progress.length;
    if (total > 0) {
      return Math.round((completed / total) * 100);
    }
  }
  return undefined;
}
