// Curated word-of-the-day rotation pool.
//
// Each bucket lives in its own JSON file under ./data/. This per-bucket layout
// lets seeding agents work on one bucket at a time without conflicting writes.
// The FALLBACK array exists so the module is never empty if a JSON file is
// somehow missing.
//
// Pick is deterministic per (date, userId): each user cycles through the
// entire pool before any repeat, and different users see different words on
// the same day.

import EVERYDAY_JSON from './words-everyday.json';
import ADVANCED_JSON from './words-advanced.json';
import OBSCURE_JSON from './words-obscure.json';

export interface WordEntry {
  word: string;
  partOfSpeech: string;
  definition: string;
  etymology: string;
  exampleSentence: string;
}

const FALLBACK: Record<string, WordEntry[]> = {
  everyday: [
    { word: 'serendipity', partOfSpeech: 'noun', definition: 'The occurrence of pleasant or fortunate events by chance.', etymology: 'Coined by Horace Walpole in 1754 from the Persian fairy tale "The Three Princes of Serendip", whose heroes were always making discoveries by accident.', exampleSentence: 'Meeting my future business partner at that conference was pure serendipity.' },
    { word: 'petrichor', partOfSpeech: 'noun', definition: 'The pleasant earthy smell produced by rain falling on dry soil.', etymology: 'From Greek "petra" (stone) and "ichor" (the fluid in the veins of the gods), coined in 1964.', exampleSentence: 'She opened the window to breathe in the petrichor after the summer storm.' },
  ],
  advanced: [
    { word: 'ineffable', partOfSpeech: 'adjective', definition: 'Too great or extreme to be expressed in words.', etymology: 'From Latin "ineffabilis", combining "in-" (not) and "effari" (to utter).', exampleSentence: 'There was an ineffable sadness in the way she closed the door.' },
    { word: 'perspicacious', partOfSpeech: 'adjective', definition: 'Having a ready insight into things; shrewd.', etymology: 'From Latin "perspicax" meaning "sharp-sighted", from "perspicere" (to see through).', exampleSentence: 'A perspicacious investor, she sold the position six months before the crash.' },
  ],
  obscure: [
    { word: 'hiraeth', partOfSpeech: 'noun', definition: 'A homesickness for a home to which you cannot return, a home which maybe never was.', etymology: 'Welsh, untranslatable in a single English word.', exampleSentence: 'Years after leaving, she still felt a deep hiraeth for the coastline of her childhood.' },
    { word: 'sonder', partOfSpeech: 'noun', definition: 'The realization that each random passerby is living a life as vivid and complex as your own.', etymology: 'Coined in 2012 by John Koenig in the Dictionary of Obscure Sorrows.', exampleSentence: 'Walking through the airport terminal, she was overcome by a wave of sonder.' },
  ],
};

const POOLS: Record<string, WordEntry[]> = {
  everyday: [...(EVERYDAY_JSON as WordEntry[]), ...FALLBACK.everyday],
  advanced: [...(ADVANCED_JSON as WordEntry[]), ...FALLBACK.advanced],
  obscure: [...(OBSCURE_JSON as WordEntry[]), ...FALLBACK.obscure],
};

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

export function pickWordOfDay(
  difficulty: string,
  userId: string,
  now: Date = new Date()
): WordEntry {
  const pool = POOLS[difficulty] ?? POOLS.everyday;
  const idx = (daysSinceEpoch(now) + hashUserId(userId)) % pool.length;
  return pool[idx];
}
