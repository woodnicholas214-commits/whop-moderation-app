/**
export const dynamic = 'force-dynamic';
 * Individual incident operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { incidentReviewSchema } from '@/lib/validators';
import { parseJson, stringifyJson } from '@/lib/json-helper';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: {
        rule: {
          include: {
            conditions: true,
            actions: true,
          },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields for response
    const parsedIncident = {
      ...incident,
      contentSnapshot: parseJson(incident.contentSnapshot, {}),
      ruleHits: parseJson(incident.ruleHits, []),
      features: parseJson(incident.features, {}),
      actionsTaken: parseJson(incident.actionsTaken, []),
      rule: incident.rule ? {
        ...incident.rule,
        scope: parseJson((incident.rule as any).scope, {}),
        conditions: (incident.rule as any).conditions?.map((c: any) => ({
          ...c,
          config: parseJson(c.config, {}),
        })) || [],
        actions: (incident.rule as any).actions?.map((a: any) => ({
          ...a,
          config: parseJson(a.config, {}),
        })) || [],
      } : null,
    };

    return NextResponse.json(parsedIncident);
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
    const validated = incidentReviewSchema.parse(body);

    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
    });

    if (!incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.incident.update({
      where: { id: params.id },
      data: {
        status: validated.status,
        reviewNotes: validated.notes,
        reviewer: session.userId,
        reviewedAt: new Date(),
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId: incident.companyId,
        actor: session.userId,
        action: validated.status,
        entity: 'incident',
        entityId: params.id,
        metadata: stringifyJson({ notes: validated.notes }),
      },
    });

    return NextResponse.json(updated);
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

