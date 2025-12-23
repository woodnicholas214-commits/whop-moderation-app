/**
 * Seed endpoint - creates default company if it doesn't exist
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    // Create default company if it doesn't exist
    const company = await prisma.company.upsert({
      where: { whopId: 'default_company' },
      update: {},
      create: {
        whopId: 'default_company',
        name: 'Default Company',
      },
    });

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        whopId: company.whopId,
        name: company.name,
      },
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to seed database',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

