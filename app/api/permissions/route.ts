/**
export const dynamic = 'force-dynamic';
 * User Permissions API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { stringifyJson } from '@/lib/json-helper';

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

    // Check if user is admin
    const permission = await prisma.userPermission.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.userId,
        },
      },
    });

    // In development, allow access if no permissions are set
    if (!permission) {
      if (process.env.NODE_ENV === 'development') {
        // Allow access in development
      } else {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        );
      }
    } else if (permission.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const permissions = await prisma.userPermission.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ permissions });
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
    const { companyId, userId, role } = body;

    if (!companyId || !userId || !role) {
      return NextResponse.json(
        { error: 'companyId, userId, and role are required' },
        { status: 400 }
      );
    }

    if (!['admin', 'moderator', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, moderator, or viewer' },
        { status: 400 }
      );
    }

    // Check if requester is admin
    const requesterPermission = await prisma.userPermission.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: session.userId,
        },
      },
    });

    // In development, allow if no permissions are set
    if (!requesterPermission) {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403 }
        );
      }
    } else if (requesterPermission.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Create or update permission
    const permission = await prisma.userPermission.upsert({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      update: {
        role,
        grantedBy: session.userId,
      },
      create: {
        companyId,
        userId,
        role,
        grantedBy: session.userId,
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId,
        actor: session.userId,
        action: 'create',
        entity: 'permission',
        entityId: permission.id,
        metadata: stringifyJson({ userId, role }),
      },
    });

    return NextResponse.json({ success: true, permission });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

