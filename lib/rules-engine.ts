/**
 * Rules Engine - Evaluates content against moderation rules
 */

import { PrismaClient } from '@prisma/client';
import type { ModerationRule, RuleCondition } from '@prisma/client';
import { parseJson } from './json-helper';

export interface ContentFeatures {
  text: string;
  normalizedText: string;
  links: string[];
  domains: string[];
  mentions: string[];
  emojiCount: number;
  capsRatio: number;
  repeatedText: boolean;
  messageLength: number;
  wordCount: number;
}

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  conditionMatches: Array<{
    conditionId: string;
    conditionType: string;
    matchedValue?: string;
  }>;
}

export interface IncidentData {
  source: 'chat' | 'forum';
  contentId: string;
  authorId: string;
  contentSnapshot: any;
  ruleHits: RuleMatch[];
  features: ContentFeatures;
}

export class RulesEngine {
  constructor(private prisma: PrismaClient) {}

  /**
   * Extract features from content
   */
  extractFeatures(content: string): ContentFeatures {
    // Normalize text: strip markdown, lowercase for analysis
    const normalizedText = content
      .replace(/[#*_`~\[\]()]/g, '') // Remove markdown
      .replace(/\n/g, ' ')
      .trim()
      .toLowerCase();

    // Extract links (basic URL detection)
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const links = content.match(urlRegex) || [];
    const domains = links.map(link => {
      try {
        return new URL(link).hostname.replace(/^www\./, '');
      } catch {
        return '';
      }
    }).filter(Boolean);

    // Extract mentions (basic @mention detection)
    const mentionRegex = /@(\w+)/g;
    const mentions = Array.from(content.matchAll(mentionRegex), m => m[1]);

    // Count emojis (basic emoji detection)
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojiCount = (content.match(emojiRegex) || []).length;

    // Calculate caps ratio
    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const capsRatio = content.length > 0 ? capsCount / content.length : 0;

    // Detect repeated text (3+ consecutive identical words)
    const words = normalizedText.split(/\s+/).filter(w => w.length > 0);
    let repeatedText = false;
    for (let i = 0; i < words.length - 2; i++) {
      if (words[i] === words[i + 1] && words[i] === words[i + 2]) {
        repeatedText = true;
        break;
      }
    }

    return {
      text: content,
      normalizedText,
      links,
      domains,
      mentions,
      emojiCount,
      capsRatio,
      repeatedText,
      messageLength: content.length,
      wordCount: words.length,
    };
  }

  /**
   * Check if a condition matches
   */
  checkCondition(
    condition: RuleCondition,
    features: ContentFeatures
  ): { matches: boolean; matchedValue?: string } {
    const { type } = condition;
    const config = parseJson(condition.config, {});
    const { normalizedText, text, links, domains, mentions, emojiCount, capsRatio, repeatedText } = features;

    switch (type) {
      case 'keyword_exact': {
        const keywords = (config.keywords as string[]) || [];
        const found = keywords.find(kw => 
          normalizedText === kw.toLowerCase() || 
          normalizedText.split(/\s+/).includes(kw.toLowerCase())
        );
        return { matches: !!found, matchedValue: found };
      }

      case 'keyword_contains': {
        const keywords = (config.keywords as string[]) || [];
        const found = keywords.find(kw => normalizedText.includes(kw.toLowerCase()));
        return { matches: !!found, matchedValue: found };
      }

      case 'regex': {
        try {
          const pattern = config.pattern as string;
          const flags = (config.flags as string) || 'i';
          const regex = new RegExp(pattern, flags);
          const match = text.match(regex);
          return { matches: !!match, matchedValue: match?.[0] };
        } catch {
          return { matches: false };
        }
      }

      case 'profanity': {
        // TODO: Integrate with profanity filter library
        const profanityList = (config.words as string[]) || [];
        const found = profanityList.find(word => normalizedText.includes(word.toLowerCase()));
        return { matches: !!found, matchedValue: found };
      }

      case 'link_block': {
        const blockedLinks = (config.links as string[]) || [];
        const found = links.find(link => blockedLinks.includes(link));
        return { matches: !!found, matchedValue: found };
      }

      case 'link_allow': {
        const allowedLinks = (config.links as string[]) || [];
        const hasLinks = links.length > 0;
        const allAllowed = links.every(link => allowedLinks.includes(link));
        return { matches: hasLinks && !allAllowed };
      }

      case 'domain_block': {
        const blockedDomains = (config.domains as string[]) || [];
        const found = domains.find(domain => blockedDomains.includes(domain));
        return { matches: !!found, matchedValue: found };
      }

      case 'domain_allow': {
        const allowedDomains = (config.domains as string[]) || [];
        const hasDomains = domains.length > 0;
        // Check if all domains are allowed (including subdomains)
        const allAllowed = domains.every(domain => {
          // Check exact match
          if (allowedDomains.includes(domain)) return true;
          // Check if domain is a subdomain of any allowed domain
          return allowedDomains.some(allowed => {
            // Check if domain ends with .allowed or is exactly allowed
            return domain === allowed || domain.endsWith('.' + allowed);
          });
        });
        return { matches: hasDomains && !allAllowed };
      }

      case 'repeated_text': {
        return { matches: repeatedText };
      }

      case 'excessive_caps': {
        const threshold = (config.threshold as number) || 0.5;
        return { matches: capsRatio > threshold };
      }

      case 'emoji_spam': {
        const threshold = (config.threshold as number) || 5;
        return { matches: emojiCount > threshold };
      }

      case 'mention_spam': {
        const threshold = (config.threshold as number) || 5;
        return { matches: mentions.length > threshold };
      }

      case 'message_frequency': {
        // This requires checking message history - would need to be handled separately
        // For now, return false as we don't have context
        return { matches: false };
      }

      case 'suspicious_pattern': {
        // Basic suspicious patterns
        const patterns = (config.patterns as string[]) || [];
        const found = patterns.some(pattern => {
          try {
            const regex = new RegExp(pattern, 'i');
            return regex.test(text);
          } catch {
            return false;
          }
        });
        return { matches: found };
      }

      default:
        return { matches: false };
    }
  }

  /**
   * Check if user is exempt from rules
   */
  async checkExemptions(
    companyId: string,
    authorId: string,
    authorRoles?: string[]
  ): Promise<boolean> {
    const exemptions = await this.prisma.exemption.findMany({
      where: { companyId },
    });

    for (const exemption of exemptions) {
      switch (exemption.type) {
        case 'user':
          if (exemption.value === authorId) return true;
          break;
        case 'role':
          if (authorRoles?.includes(exemption.value)) return true;
          break;
        case 'trusted_user':
        case 'staff':
        case 'mod':
          // These would need to be checked against Whop API
          // For now, assume false
          break;
      }
    }

    return false;
  }

  /**
   * Evaluate content against all active rules
   */
  async evaluate(
    companyId: string,
    productId: string | null,
    source: 'chat' | 'forum',
    channelId: string,
    content: string,
    authorId: string,
    authorRoles?: string[]
  ): Promise<IncidentData | null> {
    // Check exemptions first
    const isExempt = await this.checkExemptions(companyId, authorId, authorRoles);
    if (isExempt) {
      return null;
    }

    // Extract features
    const features = this.extractFeatures(content);

    // Get active rules for this company/product, ordered by priority
    const rules = await this.prisma.moderationRule.findMany({
      where: {
        companyId,
        productId: productId || null,
        enabled: true,
      },
      include: {
        conditions: {
          orderBy: { priority: 'desc' },
        },
        actions: {
          orderBy: { priority: 'asc' },
        },
      },
      orderBy: { priority: 'desc' },
    });

    const ruleHits: RuleMatch[] = [];

    for (const rule of rules) {
      // Check scope
      const scope = parseJson(rule.scope, { type: 'all', channels: [], forums: [], exclusions: [] });
      if (scope.type === 'selected') {
        const channels = scope.channels || [];
        const forums = scope.forums || [];
        const isInScope = 
          (source === 'chat' && channels.includes(channelId)) ||
          (source === 'forum' && forums.includes(channelId));
        
        if (!isInScope) continue;

        // Check exclusions
        if (scope.exclusions?.includes(channelId)) continue;
      } else if (scope.type === 'all') {
        // Check exclusions
        if (scope.exclusions?.includes(channelId)) continue;
      }

      // Evaluate conditions
      const conditionMatches: RuleMatch['conditionMatches'] = [];
      let allConditionsMatch = true;

      for (const condition of rule.conditions) {
        const result = this.checkCondition(condition, features);
        if (result.matches) {
          conditionMatches.push({
            conditionId: condition.id,
            conditionType: condition.type,
            matchedValue: result.matchedValue,
          });
        } else {
          // If condition requires all to match (AND logic), fail
          // For now, we use AND logic - all conditions must match
          allConditionsMatch = false;
          break;
        }
      }

      if (allConditionsMatch && conditionMatches.length > 0) {
        ruleHits.push({
          ruleId: rule.id,
          ruleName: rule.name,
          conditionMatches,
        });

        // Stop if rule says to stop on match
        if (rule.stopOnMatch) {
          break;
        }
      }
    }

    if (ruleHits.length === 0) {
      return null;
    }

    return {
      source,
      contentId: '', // Will be set by caller
      authorId,
      contentSnapshot: { content, channelId },
      ruleHits,
      features,
    };
  }
}

