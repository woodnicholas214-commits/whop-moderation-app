/**
 * Keyword Filters API
 * Manages keyword-based moderation rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { stringifyJson, parseJson } from '@/lib/json-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Find all keyword-based rules
    const rules = await prisma.moderationRule.findMany({
      where: {
        companyId,
        conditions: {
          some: {
            type: {
              in: ['keyword_contains', 'keyword_exact'],
            },
          },
        },
      },
      include: {
        conditions: {
          where: {
            type: {
              in: ['keyword_contains', 'keyword_exact'],
            },
          },
        },
        actions: true,
      },
    });

    // Format for frontend
    const keywordRules = rules.map(rule => {
      const keywordCondition = rule.conditions[0];
      const keywords = keywordCondition
        ? ((parseJson(keywordCondition.config, { keywords: [] }) as any).keywords || []) as string[]
        : [];
      
      const actionType = rule.actions[0]?.type || 'flag_review';
      const isDelete = actionType === 'auto_delete';

      return {
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        keywords,
        matchType: keywordCondition?.type || 'keyword_contains',
        action: isDelete ? 'delete' : 'restrict',
        priority: rule.priority,
      };
    });

    return NextResponse.json({ rules: keywordRules });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { companyId, keywords, action, matchType, ruleName } = body;

    if (!companyId || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'companyId and keywords array are required' },
        { status: 400 }
      );
    }

    const actionType = action === 'delete' ? 'auto_delete' : 'flag_review';
    const conditionType = matchType || 'keyword_contains';

    // Create or update keyword rule
    const rule = await prisma.moderationRule.create({
      data: {
        companyId,
        name: ruleName || `Keyword Filter: ${keywords.slice(0, 3).join(', ')}${keywords.length > 3 ? '...' : ''}`,
        description: `Automatically ${action === 'delete' ? 'delete' : 'flag'} messages containing keywords`,
        enabled: true,
        priority: 100,
        severity: 'high',
        mode: 'enforce',
        stopOnMatch: false,
        scope: stringifyJson({
          type: 'all',
          channels: [],
          forums: [],
          exclusions: [],
        }),
        createdBy: session.userId,
        updatedBy: session.userId,
        conditions: {
          create: [
            {
              type: conditionType,
              config: stringifyJson({ keywords }),
              priority: 0,
            },
          ],
        },
        actions: {
          create: [
            {
              type: actionType,
              config: stringifyJson({}),
              priority: 0,
            },
          ],
        },
      },
      include: {
        conditions: true,
        actions: true,
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId,
        actor: session.userId,
        action: 'create',
        entity: 'rule',
        entityId: rule.id,
        metadata: stringifyJson({ ruleName: rule.name, keywords }),
      },
    });

    return NextResponse.json({ success: true, rule });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

