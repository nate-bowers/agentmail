import { z } from 'zod';

/**
 * Server-side IANA timezone validator. The dashboard UI offers a curated list
 * (COMMON_TIMEZONES) but the API will accept anything that string()-validates,
 * which then breaks toZonedTime / Intl.DateTimeFormat downstream. This guard
 * catches a junk value before it reaches the DB or the generation pipeline.
 */
export const ianaTimezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine(
    (v) => {
      try {
        // eslint-disable-next-line no-new
        new Intl.DateTimeFormat(undefined, { timeZone: v });
        return true;
      } catch {
        return false;
      }
    },
    { message: "That timezone isn't recognized." }
  );
