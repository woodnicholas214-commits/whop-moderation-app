/**
 * Manual message processing endpoint
 * Allows you to manually trigger moderation for a specific message
 * 
 * POST /api/messages/process
 * Body: {
 *   messageId: "post_1CWNn51LcmsAEvyrNwBGEH",
 *   channelId: "pdWaGAyrkASLy5",
 *   content: "message content here",
 *   authorId: "user_id",
 *   companyId: "internal_company_id"
 * }
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RulesEngine } from '@/lib/rules-engine';
import { getWhopClient } from '@/lib/whop/client';
import { stringifyJson, parseJson } from '@/lib/json-helper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, channelId, content, authorId, companyId: providedCompanyId, authorRoles } = body;

    if (!messageId || !content || !channelId) {
      return NextResponse.json(
        { error: 'messageId, channelId, and content are required' },
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

    console.log(`Processing message ${messageId} for company ${companyId}`);

    // Evaluate against rules
    const rulesEngine = new RulesEngine(prisma);
    const incidentData = await rulesEngine.evaluate(
      companyId,
      null,
      'chat',
      channelId,
      content,
      authorId || 'unknown',
      authorRoles || []
    );

    if (!incidentData) {
      return NextResponse.json({
        success: true,
        message: 'No rules matched',
        messageId,
        content,
        matched: false,
      });
    }

    console.log(`Rules matched: ${incidentData.ruleHits.length} rules`);

    // Get matching rules
    const rules = await prisma.moderationRule.findMany({
      where: {
        id: { in: incidentData.ruleHits.map(h => h.ruleId) },
      },
      include: { actions: true },
    });

    const actionsTaken: any[] = [];
    const whopClient = getWhopClient();

    // Apply actions
    for (const rule of rules) {
      for (const action of rule.actions) {
        try {
          switch (action.type) {
            case 'flag_review':
              actionsTaken.push({
                type: 'flag_review',
                status: 'success',
                ruleId: rule.id,
              });
              break;

            case 'auto_delete':
              if (rule.mode === 'enforce') {
                try {
                  await whopClient.deleteMessage(channelId, messageId);
                  actionsTaken.push({
                    type: 'auto_delete',
                    status: 'success',
                    ruleId: rule.id,
                  });
                } catch (error: any) {
                  console.error('Delete error:', error);
                  actionsTaken.push({
                    type: 'auto_delete',
                    status: 'error',
                    error: error.message,
                    ruleId: rule.id,
                  });
                }
              }
              break;

            case 'warn_user':
              if (rule.mode === 'enforce' && authorId) {
                try {
                  const actionConfig = parseJson(action.config, {});
                  const warnMessage = (actionConfig as any).message || 
                    `Your message violated rule: ${rule.name}`;
                  await whopClient.sendDM(authorId, warnMessage);
                  actionsTaken.push({
                    type: 'warn_user',
                    status: 'success',
                    ruleId: rule.id,
                  });
                } catch (error: any) {
                  actionsTaken.push({
                    type: 'warn_user',
                    status: 'error',
                    error: error.message,
                    ruleId: rule.id,
                  });
                }
              }
              break;
          }
        } catch (error: any) {
          console.error(`Error applying action ${action.type}:`, error);
        }
      }
    }

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        companyId,
        productId: null,
        ruleId: incidentData.ruleHits[0]?.ruleId || null,
        source: 'chat',
        contentId: messageId,
        authorId: incidentData.authorId,
        contentSnapshot: stringifyJson(incidentData.contentSnapshot),
        ruleHits: stringifyJson(incidentData.ruleHits),
        features: stringifyJson(incidentData.features),
        actionsTaken: stringifyJson(actionsTaken),
        status: 'pending',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Message processed',
      messageId,
      incidentId: incident.id,
      matched: true,
      rulesMatched: incidentData.ruleHits.length,
      actionsTaken: actionsTaken.length,
      details: {
        ruleHits: incidentData.ruleHits,
        actionsTaken,
      },
    });
  } catch (error: any) {
    console.error('Process message error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

