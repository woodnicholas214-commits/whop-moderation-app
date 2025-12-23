/**
 * Individual link/domain rule operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { stringifyJson, parseJson } from '@/lib/json-helper';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { domains, links, action, enabled } = body;

    const rule = await prisma.moderationRule.findUnique({
      where: { id: params.ruleId },
      include: {
        conditions: {
          where: {
            type: {
              in: ['link_block', 'link_allow', 'domain_block', 'domain_allow'],
            },
          },
        },
        actions: true,
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    const updates: any = {
      updatedBy: session.userId,
    };

    if (enabled !== undefined) {
      updates.enabled = enabled;
    }

    // Update domains/links if provided
    if ((domains && Array.isArray(domains)) || (links && Array.isArray(links))) {
      const condition = rule.conditions[0];
      if (condition) {
        const currentConfig = parseJson(condition.config, { domains: [], links: [] }) as { domains?: string[]; links?: string[] };
        const newConfig: any = {
          ...currentConfig,
        };
        
        if (domains) newConfig.domains = domains;
        if (links) newConfig.links = links;

        await prisma.ruleCondition.update({
          where: { id: condition.id },
          data: {
            config: stringifyJson(newConfig),
          },
        });
      }
    }

    // Update action if provided
    if (action) {
      const actionType = action === 'delete' ? 'auto_delete' : 'flag_review';
      const existingAction = rule.actions[0];
      
      if (existingAction) {
        if (existingAction.type !== actionType) {
          await prisma.ruleAction.update({
            where: { id: existingAction.id },
            data: {
              type: actionType,
            },
          });
        }
      } else {
        await prisma.ruleAction.create({
          data: {
            ruleId: params.ruleId,
            type: actionType,
            config: stringifyJson({}),
            priority: 0,
          },
        });
      }
    }

    // Update rule
    if (Object.keys(updates).length > 1) {
      await prisma.moderationRule.update({
        where: { id: params.ruleId },
        data: updates,
      });
    }

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId: rule.companyId || '',
        actor: session.userId,
        action: 'update',
        entity: 'rule',
        entityId: params.ruleId,
        metadata: stringifyJson({ domains, links, action, enabled }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { ruleId: string } }
) {
  try {
    const session = await requireAuth();
    
    const rule = await prisma.moderationRule.findUnique({
      where: { id: params.ruleId },
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    await prisma.moderationRule.delete({
      where: { id: params.ruleId },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId: rule.companyId || '',
        actor: session.userId,
        action: 'delete',
        entity: 'rule',
        entityId: params.ruleId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

