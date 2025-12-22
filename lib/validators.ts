/**
 * Zod schemas for validation
 */

import { z } from 'zod';

export const ruleScopeSchema = z.object({
  type: z.enum(['all', 'selected']),
  channels: z.array(z.string()).default([]),
  forums: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
});

export const ruleConditionSchema = z.object({
  type: z.enum([
    'keyword_exact',
    'keyword_contains',
    'regex',
    'profanity',
    'link_allow',
    'link_block',
    'domain_allow',
    'domain_block',
    'repeated_text',
    'excessive_caps',
    'emoji_spam',
    'mention_spam',
    'message_frequency',
    'suspicious_pattern',
  ]),
  config: z.record(z.any()),
  priority: z.number().default(0),
});

export const ruleActionSchema = z.object({
  type: z.enum([
    'flag_review',
    'auto_hide',
    'auto_delete',
    'warn_user',
    'timeout_user',
    'mute_user',
    'escalate_admin',
  ]),
  config: z.record(z.any()),
  priority: z.number().default(0),
});

export const moderationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  enabled: z.boolean().default(true),
  priority: z.number().int().default(0),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
  mode: z.enum(['dry_run', 'enforce']).default('enforce'),
  stopOnMatch: z.boolean().default(false),
  scope: ruleScopeSchema,
  conditions: z.array(ruleConditionSchema).min(1),
  actions: z.array(ruleActionSchema).min(1),
});

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string().or(z.number()),
  data: z.record(z.any()),
});

export const incidentReviewSchema = z.object({
  status: z.enum(['approved', 'removed', 'restored', 'dismissed']),
  notes: z.string().max(1000).optional(),
});

