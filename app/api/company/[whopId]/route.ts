/**
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
 * Get company by Whop ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { whopId: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: { whopId: params.whopId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

