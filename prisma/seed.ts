/**
 * Seed script to create starter rules
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a default company (you'll need to replace with actual Whop company ID)
  const company = await prisma.company.upsert({
    where: { whopId: 'default_company' },
    update: {},
    create: {
      whopId: 'default_company',
      name: 'Default Company',
    },
  });

  console.log('Created company:', company.id);

  // Create profanity rule
  const profanityRule = await prisma.moderationRule.create({
    data: {
      companyId: company.id,
      name: 'Block Profanity',
      description: 'Automatically flag messages containing profanity',
      enabled: true,
      priority: 100,
      severity: 'high',
      mode: 'enforce',
      stopOnMatch: false,
      scope: JSON.stringify({
        type: 'all',
        channels: [],
        forums: [],
        exclusions: [],
      }),
      conditions: {
        create: [
          {
            type: 'profanity',
            config: JSON.stringify({
              words: ['badword', 'spam', 'inappropriate'],
            }),
            priority: 0,
          },
        ],
      },
      actions: {
        create: [
          {
            type: 'flag_review',
            config: JSON.stringify({}),
            priority: 0,
          },
          {
            type: 'auto_delete',
            config: JSON.stringify({}),
            priority: 1,
          },
        ],
      },
    },
  });

  console.log('Created profanity rule:', profanityRule.id);

  // Create link blocking rule
  const linkRule = await prisma.moderationRule.create({
    data: {
      companyId: company.id,
      name: 'Block Suspicious Links',
      description: 'Block messages containing links to suspicious domains',
      enabled: true,
      priority: 90,
      severity: 'medium',
      mode: 'enforce',
      stopOnMatch: false,
      scope: JSON.stringify({
        type: 'all',
        channels: [],
        forums: [],
        exclusions: [],
      }),
      conditions: {
        create: [
          {
            type: 'domain_block',
            config: JSON.stringify({
              domains: ['spam.com', 'malicious-site.com'],
            }),
            priority: 0,
          },
        ],
      },
      actions: {
        create: [
          {
            type: 'flag_review',
            config: JSON.stringify({}),
            priority: 0,
          },
          {
            type: 'auto_delete',
            config: JSON.stringify({}),
            priority: 1,
          },
        ],
      },
    },
  });

  console.log('Created link blocking rule:', linkRule.id);

  // Create spam detection rule
  const spamRule = await prisma.moderationRule.create({
    data: {
      companyId: company.id,
      name: 'Detect Spam Patterns',
      description: 'Flag messages with spam-like patterns (repeated text, excessive caps, emoji spam)',
      enabled: true,
      priority: 80,
      severity: 'medium',
      mode: 'enforce',
      stopOnMatch: false,
      scope: JSON.stringify({
        type: 'all',
        channels: [],
        forums: [],
        exclusions: [],
      }),
      conditions: {
        create: [
          {
            type: 'repeated_text',
            config: JSON.stringify({}),
            priority: 0,
          },
          {
            type: 'excessive_caps',
            config: JSON.stringify({ threshold: 0.7 }),
            priority: 1,
          },
          {
            type: 'emoji_spam',
            config: JSON.stringify({ threshold: 10 }),
            priority: 2,
          },
        ],
      },
      actions: {
        create: [
          {
            type: 'flag_review',
            config: JSON.stringify({}),
            priority: 0,
          },
        ],
      },
    },
  });

  console.log('Created spam detection rule:', spamRule.id);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

