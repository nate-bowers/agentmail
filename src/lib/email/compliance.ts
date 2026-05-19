// Shared CAN-SPAM + RFC 8058 (Gmail one-click unsubscribe) helpers.
//
// Every outbound email from this app — daily brief, welcome test email,
// transactional — must:
//   1. Include a physical postal address in the footer (CAN-SPAM)
//   2. Include the List-Unsubscribe + List-Unsubscribe-Post headers
//   3. Honor a token-based one-click POST endpoint at /api/unsubscribe
//
// Centralizing the logic here keeps every email surface consistent.

import { generateUnsubscribeToken } from '@/lib/unsubscribe';

const PLACEHOLDER_ADDRESS = '[SET BUSINESS_MAILING_ADDRESS ENV VAR]';

/**
 * Returns the configured physical mailing address, or a loud placeholder
 * accompanied by a server-side warning so missing config is obvious in logs.
 */
export function getBusinessMailingAddress(): string {
  const value = process.env.BUSINESS_MAILING_ADDRESS?.trim();
  if (value) return value;
  console.warn(
    '[compliance] BUSINESS_MAILING_ADDRESS env var is not set. ' +
      'Email footer is rendering with a placeholder, which violates CAN-SPAM. ' +
      'Set the env var in Vercel before sending more mail.'
  );
  return PLACEHOLDER_ADDRESS;
}

/**
 * Build the per-user List-Unsubscribe header pair Resend will deliver.
 *
 * RFC 8058 / Gmail bulk-sender requirements:
 *   - List-Unsubscribe: <https://app/api/unsubscribe?token=…>, <mailto:unsubscribe@…?subject=unsubscribe>
 *   - List-Unsubscribe-Post: List-Unsubscribe=One-Click
 *
 * The HTTPS URL receives a POST with body "List-Unsubscribe=One-Click" when
 * a Gmail user clicks the inbox-level unsubscribe; the mailto exists as a
 * fallback for clients that prefer email-driven unsubscribe.
 */
export function buildUnsubscribeHeaders(userId: string): Record<string, string> {
  const token = generateUnsubscribeToken(userId);
  const url = `https://dailybriefmail.com/api/unsubscribe?token=${token}`;
  const mailto = 'mailto:unsubscribe@dailybriefmail.com?subject=unsubscribe';
  return {
    'List-Unsubscribe': `<${url}>, <${mailto}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
