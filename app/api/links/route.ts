/**
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
 * Link/Domain Rules API
 * Manages link and domain-based moderation rules
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

    // Find all link/domain-based rules
    const rules = await prisma.moderationRule.findMany({
      where: {
        companyId,
        conditions: {
          some: {
            type: {
              in: ['link_block', 'link_allow', 'domain_block', 'domain_allow'],
            },
          },
        },
      },
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

    // Format for frontend
    const linkRules = rules.map(rule => {
      const condition = rule.conditions[0];
      const conditionType = condition?.type || 'domain_block';
      
      let domains: string[] = [];
      let links: string[] = [];
      
      if (condition) {
        const config = parseJson(condition.config, { domains: [], links: [] }) as { domains?: string[]; links?: string[] };
        domains = config.domains || [];
        links = config.links || [];
      }
      
      const actionType = rule.actions[0]?.type || 'auto_delete';
      const isDelete = actionType === 'auto_delete';

      return {
        id: rule.id,
        name: rule.name,
        enabled: rule.enabled,
        type: conditionType,
        domains,
        links,
        action: isDelete ? 'delete' : 'restrict',
        priority: rule.priority,
      };
    });

    return NextResponse.json({ rules: linkRules });
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
    const { companyId, type, domains, links, action, ruleName } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Validate that we have either domains or links
    const hasDomains = domains && Array.isArray(domains) && domains.length > 0;
    const hasLinks = links && Array.isArray(links) && links.length > 0;

    if (!hasDomains && !hasLinks) {
      return NextResponse.json(
        { error: 'Either domains or links array is required' },
        { status: 400 }
      );
    }

    const actionType = action === 'delete' ? 'auto_delete' : 'flag_review';
    
    // Determine condition type based on what we have
    let conditionType = type;
    if (!conditionType) {
      if (hasDomains) {
        conditionType = action === 'delete' ? 'domain_block' : 'domain_allow';
      } else {
        conditionType = action === 'delete' ? 'link_block' : 'link_allow';
      }
    }

    // For "whop.com only" rule, we use domain_allow (inverse logic)
    // If domain is NOT in allowed list, block it
    const config: any = {};
    if (hasDomains) {
      config.domains = domains;
    }
    if (hasLinks) {
      config.links = links;
    }

    // Create rule
    const rule = await prisma.moderationRule.create({
      data: {
        companyId,
        name: ruleName || (hasDomains 
          ? `Domain Rule: ${domains.slice(0, 3).join(', ')}${domains.length > 3 ? '...' : ''}`
          : `Link Rule: ${links.slice(0, 3).join(', ')}${links.length > 3 ? '...' : ''}`),
        description: `Automatically ${action === 'delete' ? 'delete' : 'flag'} messages with ${hasDomains ? 'domains' : 'links'}`,
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
              config: stringifyJson(config),
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
        metadata: stringifyJson({ ruleName: rule.name, type: conditionType, domains, links }),
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

