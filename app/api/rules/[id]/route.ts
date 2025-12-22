/**
 * Individual rule operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { moderationRuleSchema } from '@/lib/validators';
import { stringifyJson, parseJson } from '@/lib/json-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const rule = await prisma.moderationRule.findUnique({
      where: { id: params.id },
      include: {
        conditions: {
          orderBy: { priority: 'desc' },
        },
        actions: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!rule) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields for response
    const parsedRule = {
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
    };

    return NextResponse.json(parsedRule);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    
    const existing = await prisma.moderationRule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    // Get diff for audit log
    const diff = {
      before: existing,
      after: body,
    };

    // Update rule
    const updated = await prisma.moderationRule.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        enabled: body.enabled,
        priority: body.priority,
        severity: body.severity,
        mode: body.mode,
        stopOnMatch: body.stopOnMatch,
        scope: stringifyJson(body.scope || existing.scope),
        updatedBy: session.userId,
        ...(body.conditions && {
          conditions: {
            deleteMany: {},
            create: body.conditions.map((c: any, idx: number) => ({
              type: c.type,
              config: stringifyJson(c.config || {}),
              priority: c.priority ?? idx,
            })),
          },
        }),
        ...(body.actions && {
          actions: {
            deleteMany: {},
            create: body.actions.map((a: any, idx: number) => ({
              type: a.type,
              config: stringifyJson(a.config || {}),
              priority: a.priority ?? idx,
            })),
          },
        }),
      },
      include: {
        conditions: true,
        actions: true,
      },
    });

    // Parse JSON fields for response
    const parsedUpdated = {
      ...updated,
      scope: parseJson(updated.scope, {}),
      conditions: updated.conditions.map((c: any) => ({
        ...c,
        config: parseJson(c.config, {}),
      })),
      actions: updated.actions.map((a: any) => ({
        ...a,
        config: parseJson(a.config, {}),
      })),
    };

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId: existing.companyId || '',
        actor: session.userId,
        action: 'update',
        entity: 'rule',
        entityId: params.id,
        diff: stringifyJson(diff),
      },
    });

    return NextResponse.json(parsedUpdated);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    
    const existing = await prisma.moderationRule.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Rule not found' },
        { status: 404 }
      );
    }

    await prisma.moderationRule.delete({
      where: { id: params.id },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId: existing.companyId || '',
        actor: session.userId,
        action: 'delete',
        entity: 'rule',
        entityId: params.id,
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

