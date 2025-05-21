export function progressFromStatus(
  status: 'pending' | 'valid' | 'invalid'
): number {
  return status === 'valid' ? 1 : status === 'invalid' ? -1 : 0;
}
