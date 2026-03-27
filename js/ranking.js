// ranking.js – Top-10 ranking with localStorage persistence

const STORAGE_KEY = 'sudoku_rankings_v1';

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getRankings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(entry => ({
      ...entry,
      formattedTime: formatTime(entry.time),
    }));
  } catch {
    return [];
  }
}

export function addRanking(entry) {
  const rankings = getRankings();
  const newEntry = {
    time: entry.time,
    date: entry.date || new Date().toLocaleDateString(),
  };

  rankings.push(newEntry);
  rankings.sort((a, b) => a.time - b.time);

  const trimmed = rankings.slice(0, 10);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(
      trimmed.map(({ time, date }) => ({ time, date }))
    ));
  } catch {
    // localStorage full or unavailable
  }

  const rank = trimmed.findIndex(r => r.time === newEntry.time && r.date === newEntry.date) + 1;
  const isTopTen = rank > 0 && rank <= 10;

  return { rank, isTopTen };
}

export function clearRankings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isTopTenWorthy(timeMs) {
  const rankings = getRankings();
  if (rankings.length < 10) return true;
  return timeMs < rankings[rankings.length - 1].time;
}
