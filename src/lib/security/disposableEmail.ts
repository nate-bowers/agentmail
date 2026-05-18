// Block disposable / temporary email providers at signup and on delivery_email
// changes. Backed by the maintained `disposable-email-domains` package (MIT,
// ~121k exact domains + ~400 wildcard patterns).
//
// Plus addressing (e.g. me+brief@gmail.com) is intentionally allowed: Supabase
// treats those as distinct accounts and most users use them for filtering,
// not abuse.

import disposable from 'disposable-email-domains';
import wildcards from 'disposable-email-domains/wildcard.json';

const EXACT = new Set<string>((disposable as string[]).map((d) => d.toLowerCase()));
const WILDCARDS = (wildcards as string[]).map((d) => d.toLowerCase());

export function extractDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1);
}

/**
 * Returns true if the email's domain is on the disposable list (exact match
 * or matches a wildcard suffix). False positives are extremely rare in
 * practice; the package is conservative.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;
  if (EXACT.has(domain)) return true;
  for (const wc of WILDCARDS) {
    // Wildcard entries are bare domains; match if `domain` is the same or
    // ends with ".<wc>".
    if (domain === wc || domain.endsWith(`.${wc}`)) return true;
  }
  return false;
}

export const DISPOSABLE_REJECTION_MESSAGE =
  'Please use a permanent email address. Daily Brief Mail is designed for ongoing daily delivery.';
