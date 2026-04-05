export type ATSPlatform = 'greenhouse' | 'lever' | 'unknown';

export function detectPlatform(): ATSPlatform {
  const hostname = window.location.hostname;
  if (hostname.includes('greenhouse.io')) return 'greenhouse';
  if (hostname.includes('jobs.lever.co')) return 'lever';
  return 'unknown';
}
