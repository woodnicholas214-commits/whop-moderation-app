/**
 * Audit log API
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
    const entity = searchParams.get('entity');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    const events = await prisma.auditEvent.findMany({
      where: {
        companyId,
        ...(entity && { entity }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.auditEvent.count({
      where: {
        companyId,
        ...(entity && { entity }),
      },
    });

    // Parse JSON fields for response
    const parsedEvents = events.map(event => ({
      ...event,
      diff: event.diff ? parseJson(event.diff, null) : null,
      metadata: event.metadata ? parseJson(event.metadata, null) : null,
    }));

    return NextResponse.json({
      events: parsedEvents,
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

