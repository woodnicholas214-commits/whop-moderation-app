/**
export const dynamic = 'force-dynamic';
 * Test rule against sample content
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RulesEngine } from '@/lib/rules-engine';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { ruleId, content, companyId, productId, source, channelId, authorId } = body;

    if (!ruleId || !content || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const rule = await prisma.moderationRule.findUnique({
      where: { id: ruleId },
      include: {
        conditions: {
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const rulesEngine = new RulesEngine(prisma);
    const features = rulesEngine.extractFeatures(content);

    const results = rule.conditions.map(condition => {
      const result = rulesEngine.checkCondition(condition, features);
      return {
        conditionId: condition.id,
        conditionType: condition.type,
        config: condition.config,
        matches: result.matches,
        matchedValue: result.matchedValue,
      };
    });

    return NextResponse.json({
      features,
      conditionResults: results,
      allMatch: results.every(r => r.matches),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

