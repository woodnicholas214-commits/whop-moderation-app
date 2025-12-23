/**
export const dynamic = 'force-dynamic';
 * App Settings API
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

    let settings = await prisma.appSettings.findUnique({
      where: { companyId },
    });

    // Default settings if none exist
    const defaultSettings = {
      moderation: {
        autoDeleteEnabled: true,
        defaultAction: 'delete', // 'delete' | 'restrict'
        requireReviewForHighSeverity: true,
        maxIncidentsPerUser: 5,
        cooldownPeriod: 3600, // seconds
      },
      notifications: {
        notifyOnIncident: true,
        notifyOnRuleTrigger: false,
        escalationChannel: '',
        emailNotifications: false,
      },
      webhook: {
        enabled: true,
        verifySignature: true,
        rateLimitPerMinute: 100,
      },
      general: {
        appName: 'Whop AutoMod',
        timezone: 'UTC',
        language: 'en',
      },
    };

    if (!settings) {
      // Create default settings
      settings = await prisma.appSettings.create({
        data: {
          companyId,
          settings: stringifyJson(defaultSettings),
          updatedBy: session.userId,
        },
      });
    }

    return NextResponse.json({
      settings: parseJson(settings.settings, defaultSettings),
      updatedAt: settings.updatedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { companyId, settings: newSettings } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Get existing settings
    const existing = await prisma.appSettings.findUnique({
      where: { companyId },
    });

    let updatedSettings;
    if (existing) {
      // Merge with existing settings
      const current = parseJson(existing.settings, {});
      updatedSettings = { ...current, ...newSettings };
      
      await prisma.appSettings.update({
        where: { companyId },
        data: {
          settings: stringifyJson(updatedSettings),
          updatedBy: session.userId,
        },
      });
    } else {
      updatedSettings = newSettings;
      await prisma.appSettings.create({
        data: {
          companyId,
          settings: stringifyJson(updatedSettings),
          updatedBy: session.userId,
        },
      });
    }

    // Log audit event
    await prisma.auditEvent.create({
      data: {
        companyId,
        actor: session.userId,
        action: 'update',
        entity: 'settings',
        metadata: stringifyJson({ settings: newSettings }),
      },
    });

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

