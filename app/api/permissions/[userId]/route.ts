/**
export const dynamic = 'force-dynamic';
 * Individual permission operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { stringifyJson } from '@/lib/json-helper';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { companyId, role } = body;

    if (!companyId || !role) {
      return NextResponse.json(
        { error: 'companyId and role are required' },
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

    const permission = await prisma.userPermission.update({
      where: {
        companyId_userId: {
          companyId,
          userId: params.userId,
        },
      },
      data: {
        role,
        grantedBy: session.userId,
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId,
        actor: session.userId,
        action: 'update',
        entity: 'permission',
        entityId: permission.id,
        metadata: stringifyJson({ userId: params.userId, role }),
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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

    const permission = await prisma.userPermission.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId: params.userId,
        },
      },
    });

    if (!permission) {
      return NextResponse.json(
        { error: 'Permission not found' },
        { status: 404 }
      );
    }

    await prisma.userPermission.delete({
      where: {
        companyId_userId: {
          companyId,
          userId: params.userId,
        },
      },
    });

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId,
        actor: session.userId,
        action: 'delete',
        entity: 'permission',
        metadata: stringifyJson({ userId: params.userId }),
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

