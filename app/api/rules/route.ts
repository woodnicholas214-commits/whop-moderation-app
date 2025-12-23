/**
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
 * Rules CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { moderationRuleSchema } from '@/lib/validators';
import { stringifyJson, parseJson } from '@/lib/json-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const productId = searchParams.get('productId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const rules = await prisma.moderationRule.findMany({
      where: {
        companyId,
        productId: productId || null,
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

    // Parse JSON fields for response
    const parsedRules = rules.map(rule => ({
      ...rule,
      scope: parseJson(rule.scope, {}),
      conditions: rule.conditions.map(c => ({
        ...c,
        config: parseJson(c.config, {}),
      })),
      actions: rule.actions.map(a => ({
        ...a,
        config: parseJson(a.config, {}),
      })),
    }));

    return NextResponse.json(parsedRules);
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
    
    const validated = moderationRuleSchema.parse(body);
    const companyId = body.companyId;
    const productId = body.productId || null;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Create rule
    const rule = await prisma.moderationRule.create({
      data: {
        companyId,
        productId,
        name: validated.name,
        description: validated.description,
        enabled: validated.enabled,
        priority: validated.priority,
        severity: validated.severity,
        mode: validated.mode,
        stopOnMatch: validated.stopOnMatch,
        scope: stringifyJson(validated.scope),
        createdBy: session.userId,
        updatedBy: session.userId,
        conditions: {
          create: validated.conditions.map((c, idx) => ({
            type: c.type,
            config: stringifyJson(c.config),
            priority: c.priority ?? idx,
          })),
        },
        actions: {
          create: validated.actions.map((a, idx) => ({
            type: a.type,
            config: stringifyJson(a.config),
            priority: a.priority ?? idx,
          })),
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
        metadata: stringifyJson({ ruleName: rule.name }),
      },
    });

    return NextResponse.json(rule);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

