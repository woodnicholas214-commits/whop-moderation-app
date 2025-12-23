/**
 * Test endpoint to manually trigger rule evaluation
 * POST /api/webhook/test
 * Body: { content: "test message", companyId?: string }
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RulesEngine } from '@/lib/rules-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, companyId: providedCompanyId } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      );
    }

    // Get company ID
    let companyId = providedCompanyId;
    if (!companyId) {
      const defaultCompany = await prisma.company.findFirst({
        where: { whopId: 'default_company' },
      });
      if (!defaultCompany) {
        return NextResponse.json(
          { error: 'No company found. Please seed the database.' },
          { status: 404 }
        );
      }
      companyId = defaultCompany.id;
    }

    // Get all active rules for debugging
    const rules = await prisma.moderationRule.findMany({
      where: {
        companyId,
        enabled: true,
      },
      include: {
        conditions: true,
        actions: true,
      },
    });

    console.log(`Testing content: "${content}" against ${rules.length} rules`);

    // Evaluate
    const rulesEngine = new RulesEngine(prisma);
    const incidentData = await rulesEngine.evaluate(
      companyId,
      null,
      'chat',
      'test-channel',
      content,
      'test-user',
      []
    );

    return NextResponse.json({
      success: true,
      content,
      companyId,
      rulesCount: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        conditionsCount: r.conditions.length,
        actionsCount: r.actions.length,
      })),
      incidentData,
      matched: !!incidentData,
      matchedRules: incidentData?.ruleHits || [],
    });
  } catch (error: any) {
    console.error('Test webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

