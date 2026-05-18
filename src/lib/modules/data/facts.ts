// Curated fact-of-the-day rotation pool.
//
// Each category bucket lives in its own JSON file under ./data/. Pick is
// deterministic per (date, userId).

import SCIENCE_JSON from './facts-science.json';
import NATURE_JSON from './facts-nature.json';
import HISTORY_JSON from './facts-history.json';
import TECHNOLOGY_JSON from './facts-technology.json';
import PSYCHOLOGY_JSON from './facts-psychology.json';

export interface FactEntry {
  fact: string;
  explanation: string;
  category: string;
}

const FALLBACK: Record<string, FactEntry[]> = {
  science: [
    { fact: 'A teaspoon of neutron star material would weigh about 6 billion tons on Earth.', explanation: 'Neutron stars are collapsed cores of massive stars; their material is packed so densely that protons and electrons have fused into neutrons.', category: 'science' },
  ],
  nature: [
    { fact: 'Octopuses have three hearts and blue blood.', explanation: 'Two pump blood through the gills; the third pumps it through the rest of the body. Their blood uses copper-based hemocyanin.', category: 'nature' },
  ],
  history: [
    { fact: 'Oxford University is older than the Aztec Empire.', explanation: 'Teaching at Oxford began around 1096. Tenochtitlán was founded in 1325.', category: 'history' },
  ],
  technology: [
    { fact: 'The first computer bug was an actual bug.', explanation: 'In 1947, engineers found a moth trapped in a relay of the Harvard Mark II. Grace Hopper taped it into the logbook.', category: 'technology' },
  ],
  psychology: [
    { fact: 'You can only maintain about 150 stable relationships at a time.', explanation: 'Dunbar\'s number, based on the ratio of neocortex size to group size in primates, suggests a cognitive ceiling.', category: 'psychology' },
  ],
};

const merged: Record<string, FactEntry[]> = {
  science: [...(SCIENCE_JSON as FactEntry[]), ...FALLBACK.science],
  nature: [...(NATURE_JSON as FactEntry[]), ...FALLBACK.nature],
  history: [...(HISTORY_JSON as FactEntry[]), ...FALLBACK.history],
  technology: [...(TECHNOLOGY_JSON as FactEntry[]), ...FALLBACK.technology],
  psychology: [...(PSYCHOLOGY_JSON as FactEntry[]), ...FALLBACK.psychology],
};
merged.any = [...merged.science, ...merged.nature, ...merged.history, ...merged.technology, ...merged.psychology];

const POOLS = merged;

function hashUserId(userId: string): number {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = ((h << 5) - h + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
function daysSinceEpoch(date: Date): number {
  return Math.floor(date.getTime() / 86400000);
}

export function pickFact(
  category: string,
  userId: string,
  now: Date = new Date()
): FactEntry {
  const pool = POOLS[category] ?? POOLS.any;
  const idx = (daysSinceEpoch(now) + hashUserId(userId)) % pool.length;
  return pool[idx];
}
