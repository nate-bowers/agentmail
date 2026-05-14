import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Module system
// ─────────────────────────────────────────────────────────────

/**
 * A module definition describes a single email section type.
 * TConfig is the validated config shape for that module.
 */
export interface ModuleDefinition<TConfig extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Matches the module_type column in the DB */
  type: string;
  /** Human-readable name shown in the builder UI */
  label: string;
  /** One-sentence description shown in the builder UI */
  description: string;
  /** Lucide icon name rendered next to the module card */
  icon: string;
  /** Pre-filled values used when a user first adds this module */
  defaultConfig: z.infer<TConfig>;
  /** Zod schema used to validate config before saving or generating */
  configSchema: TConfig;
  /**
   * Returns a natural-language search instruction for Claude.
   * Called at generation time with the user's validated config.
   */
  buildSearchInstruction(config: z.infer<TConfig>): string;
}

// ─────────────────────────────────────────────────────────────
// Database row shape (mirrors the modules table)
// ─────────────────────────────────────────────────────────────

export interface ModuleRow {
  id: string;
  user_id: string;
  module_type: string;
  config: Record<string, unknown>;
  display_order: number;
  is_enabled: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Output of buildSearchInstructions — fed into the Claude step
// ─────────────────────────────────────────────────────────────

export interface ModuleSearchInstruction {
  moduleType: string;
  config: Record<string, unknown>;
  searchInstruction: string;
  prefetchedData?: unknown; // Pre-fetched from external API — Claude skips search when set
}

// ─────────────────────────────────────────────────────────────
// Profiles
// ─────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  timezone: string;
  send_time: string;
  is_active: boolean;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  email_theme: string;
  email_verbosity: string;
  delivery_email: string | null;
  preview_generations_today: number;
  preview_generations_date: string | null;
  test_sends_today: number;
  test_sends_date: string | null;
  has_onboarded: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}
