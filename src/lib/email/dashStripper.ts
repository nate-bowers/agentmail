// Replaces em dashes (—) and en dashes (–) in AI-generated text with
// semantically reasonable substitutes. Brand rule: no em or en dashes in
// any user-facing content.
//
// We also instruct Claude not to use them via the system prompt, but Claude
// ignores this consistently enough that we run the stripper as a hard
// safety net. Every fire is logged so we can see when prompt instructions
// are failing and tune them over time.

// Counter persists across requests in a warm function instance. Useful for
// "is Claude ignoring the prompt instruction" telemetry.
let stripCounter = 0;
export function getDashStrippedCount(): number {
  return stripCounter;
}

/**
 * Convert an em or en dash to the right punctuation based on surrounding
 * context. The rules approximate what an editor would do with the same
 * string; perfect grammar isn't the goal, removal is.
 */
function replaceOne(before: string, dash: string, after: string): string {
  // Dash separating two clauses with finite verbs — replace with semicolon.
  // Heuristic: lowercase word on each side AND the right side opens like a
  // new sentence (capitalized verb or pronoun).
  const trailingClauseStart = /\s[A-Z]/.test(after.slice(0, 3));
  if (trailingClauseStart) {
    return `${before}; ${after.replace(/^\s+/, '')}`;
  }

  // Inline parenthetical or pause — comma. Strip a leading space on the
  // right side so we don't end up with " , word".
  return `${before}, ${after.replace(/^\s+/, '')}`;
}

/**
 * Strip em dashes and en dashes from a single string. Replaces with comma
 * or semicolon based on a small heuristic.
 */
export function stripDashes(input: string): { text: string; replacements: number } {
  if (typeof input !== 'string' || (!input.includes('—') && !input.includes('–'))) {
    return { text: input, replacements: 0 };
  }
  let result = input;
  let count = 0;
  // Run dash-by-dash so the heuristic sees the resolved text on each pass.
  // Loop bound prevents runaway on pathological input.
  for (let i = 0; i < 50; i++) {
    const match = result.match(/(\s?)([—–])(\s?)/);
    if (!match) break;
    const dashPos = match.index ?? -1;
    if (dashPos === -1) break;
    const before = result.slice(0, dashPos);
    const after = result.slice(dashPos + match[0].length);
    result = replaceOne(before, match[2], after);
    count++;
  }
  // Final pass: any remaining dashes (edge cases) get a plain comma.
  if (result.includes('—') || result.includes('–')) {
    result = result.replace(/—|–/g, ',');
  }
  // Cleanup: double-comma, comma-period, etc.
  result = result.replace(/,\s*,/g, ',').replace(/,\s*\./g, '.').replace(/\s{2,}/g, ' ');
  if (count > 0) stripCounter += count;
  return { text: result, replacements: count };
}

/**
 * Walk a parsed Claude JSON response and strip dashes from every string field.
 * Returns the cleaned object plus a count for logging.
 */
export function stripDashesDeep(value: unknown): { value: unknown; replacements: number } {
  if (typeof value === 'string') {
    const { text, replacements } = stripDashes(value);
    return { value: text, replacements };
  }
  if (Array.isArray(value)) {
    let total = 0;
    const out = value.map((item) => {
      const r = stripDashesDeep(item);
      total += r.replacements;
      return r.value;
    });
    return { value: out, replacements: total };
  }
  if (value !== null && typeof value === 'object') {
    let total = 0;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = stripDashesDeep(v);
      total += r.replacements;
      out[k] = r.value;
    }
    return { value: out, replacements: total };
  }
  return { value, replacements: 0 };
}
