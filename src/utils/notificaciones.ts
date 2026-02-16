export const getSeenIds = (section: string, codigo: string): Set<number> => {
  try {
    const stored = localStorage.getItem(`normy_seen_${section}_${codigo}`);
    if (stored) return new Set(JSON.parse(stored));
  } catch {}
  return new Set();
};

export const markAsSeen = (section: string, codigo: string, ids: number[]) => {
  localStorage.setItem(`normy_seen_${section}_${codigo}`, JSON.stringify(ids));
};

export const countUnseen = (currentIds: number[], section: string, codigo: string): number => {
  const seen = getSeenIds(section, codigo);
  return currentIds.filter(id => !seen.has(id)).length;
};

export const getStoredCount = (section: string, codigo: string): number => {
  try {
    const stored = localStorage.getItem(`normy_count_${section}_${codigo}`);
    if (stored) return parseInt(stored);
  } catch {}
  return -1;
};

export const setStoredCount = (section: string, codigo: string, count: number) => {
  localStorage.setItem(`normy_count_${section}_${codigo}`, count.toString());
};

export const countNewByCount = (currentCount: number, section: string, codigo: string): number => {
  const stored = getStoredCount(section, codigo);
  if (stored === -1) return currentCount > 0 ? currentCount : 0;
  return Math.max(0, currentCount - stored);
};
