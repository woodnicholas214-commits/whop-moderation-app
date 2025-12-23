/**
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
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

    // If no permissions exist for this company, allow access (bootstrap scenario)
    // Check if ANY permissions exist for this company
    const anyPermissions = await prisma.userPermission.findFirst({
      where: { companyId },
    });

    if (!permission) {
      // If no permissions exist at all for this company, allow access (first user setup)
      if (!anyPermissions) {
        console.log('No permissions exist for company, allowing bootstrap access');
        // Allow access to set up first admin
      } else {
        // Permissions exist but user doesn't have one - require admin
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

    // Check if ANY permissions exist for this company
    const anyPermissions = await prisma.userPermission.findFirst({
      where: { companyId },
    });

    if (!requesterPermission) {
      // If no permissions exist at all, allow first user to create admin (bootstrap)
      if (!anyPermissions) {
        console.log('No permissions exist, allowing bootstrap admin creation');
        // Allow access
      } else {
        // Permissions exist but requester doesn't have one - require admin
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

