import { describe, it, expect } from 'vitest';
import { RulesEngine } from './rules-engine';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
const mockPrisma = {
  exemption: {
    findMany: async () => [],
  },
  moderationRule: {
    findMany: async () => [],
  },
} as unknown as PrismaClient;

describe('RulesEngine', () => {
  const engine = new RulesEngine(mockPrisma);

  describe('extractFeatures', () => {
    it('should extract basic text features', () => {
      const features = engine.extractFeatures('Hello world');
      expect(features.text).toBe('Hello world');
      expect(features.normalizedText).toBe('hello world');
      expect(features.messageLength).toBe(11);
      expect(features.wordCount).toBe(2);
    });

    it('should extract links', () => {
      const features = engine.extractFeatures('Check out https://example.com');
      expect(features.links).toContain('https://example.com');
      expect(features.domains).toContain('example.com');
    });

    it('should extract mentions', () => {
      const features = engine.extractFeatures('Hey @user1 and @user2');
      expect(features.mentions).toContain('user1');
      expect(features.mentions).toContain('user2');
    });

    it('should count emojis', () => {
      const features = engine.extractFeatures('Hello 😀 🎉 🚀');
      expect(features.emojiCount).toBe(3);
    });

    it('should calculate caps ratio', () => {
      const features = engine.extractFeatures('HELLO WORLD');
      expect(features.capsRatio).toBeGreaterThan(0.5);
    });

    it('should detect repeated text', () => {
      const features = engine.extractFeatures('spam spam spam message');
      expect(features.repeatedText).toBe(true);
    });
  });

  describe('checkCondition', () => {
    const features = engine.extractFeatures('Hello world with badword');

    it('should match keyword_contains', () => {
      const condition = {
        id: '1',
        ruleId: '1',
        type: 'keyword_contains',
        config: { keywords: ['badword', 'spam'] },
        priority: 0,
      };
      const result = engine.checkCondition(condition, features);
      expect(result.matches).toBe(true);
      expect(result.matchedValue).toBe('badword');
    });

    it('should match keyword_exact', () => {
      const condition = {
        id: '1',
        ruleId: '1',
        type: 'keyword_exact',
        config: { keywords: ['hello world'] },
        priority: 0,
      };
      const result = engine.checkCondition(condition, features);
      expect(result.matches).toBe(true);
    });

    it('should match regex', () => {
      const condition = {
        id: '1',
        ruleId: '1',
        type: 'regex',
        config: { pattern: 'bad\\w+', flags: 'i' },
        priority: 0,
      };
      const result = engine.checkCondition(condition, features);
      expect(result.matches).toBe(true);
    });

    it('should match excessive caps', () => {
      const capsFeatures = engine.extractFeatures('THIS IS ALL CAPS');
      const condition = {
        id: '1',
        ruleId: '1',
        type: 'excessive_caps',
        config: { threshold: 0.5 },
        priority: 0,
      };
      const result = engine.checkCondition(condition, capsFeatures);
      expect(result.matches).toBe(true);
    });

    it('should match emoji spam', () => {
      const emojiFeatures = engine.extractFeatures('😀🎉🚀🔥💯🎊🎈🎁🎂🎄');
      const condition = {
        id: '1',
        ruleId: '1',
        type: 'emoji_spam',
        config: { threshold: 5 },
        priority: 0,
      };
      const result = engine.checkCondition(condition, emojiFeatures);
      expect(result.matches).toBe(true);
    });

    it('should match domain_block', () => {
      const linkFeatures = engine.extractFeatures('Check https://spam.com');
      const condition = {
        id: '1',
        ruleId: '1',
        type: 'domain_block',
        config: { domains: ['spam.com', 'bad.com'] },
        priority: 0,
      };
      const result = engine.checkCondition(condition, linkFeatures);
      expect(result.matches).toBe(true);
      expect(result.matchedValue).toBe('spam.com');
    });
  });
});

