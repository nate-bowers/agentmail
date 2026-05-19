import type { GeneratedSection } from './generate';

// Distinctive modules — ones that feel uniquely "ours" and benefit from
// leading the email. Rotated daily per user so the brief never feels
// predictable. Order within this list is the rotation cycle.
const DISTINCTIVE_LEADERS = ['challenge', 'language', 'fact', 'quote'] as const;

// Module groups for the rest of the email. After the rotating leader,
// weather is the second-priority slot (situates the reader physically),
// then news, then the user's remaining modules in their original order,
// then any closing static modules at the very end.
const SECOND_GROUP = ['weather'];
const THIRD_GROUP = ['news'];
const CLOSING_GROUP = ['fact', 'quote'];

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

/**
 * Pick today's distinctive lead module from the modules the user actually
 * has. Returns null if the user doesn't have any of the rotation candidates,
 * in which case the original display order is preserved unchanged.
 */
function pickLeader(sections: GeneratedSection[], userId: string, now: Date): string | null {
  const userHas = new Set(sections.map((s) => s.type));
  const available = DISTINCTIVE_LEADERS.filter((t) => userHas.has(t));
  if (available.length === 0) return null;
  const idx = (daysSinceEpoch(now) + hashUserId(userId)) % available.length;
  return available[idx];
}

/**
 * Re-sort the section list for visual delivery. Preserves the user's
 * original `display_order`-driven order for everything that doesn't fall
 * into one of the priority groups. Idempotent and pure.
 *
 * Group order: [leader, weather, news, remaining (original order), closing static fallback]
 */
export function reorderSectionsForDisplay(
  sections: GeneratedSection[],
  userId: string,
  now: Date = new Date(),
): GeneratedSection[] {
  if (sections.length === 0) return sections;

  const leader = pickLeader(sections, userId, now);

  // Bucket sections by group. Within each bucket we preserve original order.
  const leaderSec: GeneratedSection[] = [];
  const secondSec: GeneratedSection[] = [];
  const thirdSec: GeneratedSection[] = [];
  const restSec: GeneratedSection[] = [];
  const closingSec: GeneratedSection[] = [];

  // Track which sections we've already used as the leader / closing to avoid
  // double-counting.
  const used = new Set<GeneratedSection>();

  for (const s of sections) {
    if (leader && s.type === leader && !used.has(s)) {
      leaderSec.push(s);
      used.add(s);
      continue;
    }
    if (SECOND_GROUP.includes(s.type)) {
      secondSec.push(s);
      used.add(s);
      continue;
    }
    if (THIRD_GROUP.includes(s.type)) {
      thirdSec.push(s);
      used.add(s);
      continue;
    }
    if (CLOSING_GROUP.includes(s.type)) {
      // Defer to closing only if it isn't already used as leader.
      closingSec.push(s);
      used.add(s);
      continue;
    }
    restSec.push(s);
    used.add(s);
  }

  return [...leaderSec, ...secondSec, ...thirdSec, ...restSec, ...closingSec];
}
