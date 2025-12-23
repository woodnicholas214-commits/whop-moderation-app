/**
 * Poll endpoint to fetch and process messages from Whop API
 * This is a workaround since Whop webhooks don't support message events
 * 
 * This endpoint should be called periodically (e.g., every 5-10 seconds)
 * by a cron job or scheduled task
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RulesEngine } from '@/lib/rules-engine';
import { getWhopClient } from '@/lib/whop/client';

export async function POST(request: NextRequest) {
  try {
    // This is a placeholder - we need to know Whop's actual API endpoints
    // TODO: Implement actual Whop API calls to fetch messages
    
    const body = await request.json();
    const { companyId, channelIds } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: 'companyId is required' },
        { status: 400 }
      );
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const rulesEngine = new RulesEngine(prisma);
    const whopClient = getWhopClient();
    
    // Get channels if not provided
    let channelsToCheck = channelIds || [];
    if (channelsToCheck.length === 0) {
      // Fetch all channels for the company
      try {
        const channels = await whopClient.getCompanyChannels(company.whopId);
        channelsToCheck = channels.map(c => c.id);
      } catch (error) {
        console.error('Failed to fetch channels:', error);
      }
    }

    const processedMessages: any[] = [];
    const errors: any[] = [];

    // Fetch and process messages from each channel
    for (const channelId of channelsToCheck) {
      try {
        // Get last processed timestamp (store in database or cache)
        const lastProcessed = await prisma.webhookEvent.findFirst({
          where: {
            eventType: { in: ['message.created', 'message.updated'] },
            payload: { contains: channelId },
          },
          orderBy: { createdAt: 'desc' },
        });

        const since = lastProcessed?.createdAt 
          ? new Date(lastProcessed.createdAt.getTime() + 1000).toISOString()
          : undefined;

        // Fetch messages
        const messages = await whopClient.getChannelMessages(channelId, 50, since);

        // Process each message
        for (const message of messages) {
          try {
            const incidentData = await rulesEngine.evaluate(
              companyId,
              null,
              'chat',
              channelId,
              message.content || message.text || '',
              message.author?.id || message.user_id || 'unknown',
              message.author?.roles || []
            );

            if (incidentData) {
              // Apply actions (similar to webhook processing)
              // ... (implement action application logic)
              processedMessages.push({
                messageId: message.id,
                channelId,
                matched: true,
                ruleHits: incidentData.ruleHits.length,
              });
            }
          } catch (error: any) {
            errors.push({ messageId: message.id, error: error.message });
          }
        }
      } catch (error: any) {
        errors.push({ channelId, error: error.message });
        console.error(`Error processing channel ${channelId}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedMessages.length,
      errors: errors.length,
      details: {
        processedMessages,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('Poll error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check polling status
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    note: 'This endpoint is ready but requires Whop API message endpoints to be implemented.',
    instructions: [
      '1. Check Whop API documentation for message endpoints',
      '2. Implement message fetching in WhopClient',
      '3. Set up a cron job to call this endpoint periodically',
      '4. Process messages through the rules engine',
    ],
  });
}

