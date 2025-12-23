/**
 * Incidents API
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { parseJson } from '@/lib/json-helper';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const incidents = await prisma.incident.findMany({
      where: {
        companyId,
        ...(status && { status }),
      },
      include: {
        rule: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.incident.count({
      where: {
        companyId,
        ...(status && { status }),
      },
    });

    // Parse JSON fields for response
    const parsedIncidents = incidents.map(incident => ({
      ...incident,
      contentSnapshot: parseJson(incident.contentSnapshot, {}),
      ruleHits: parseJson(incident.ruleHits, []),
      features: parseJson(incident.features, {}),
      actionsTaken: parseJson(incident.actionsTaken, []),
    }));

    return NextResponse.json({
      incidents: parsedIncidents,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

