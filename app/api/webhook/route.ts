/**
export const dynamic = 'force-dynamic';
 * Webhook endpoint for Whop events
 * Handles chat messages, forum posts, and other events
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RulesEngine } from '@/lib/rules-engine';
import { getWhopClient } from '@/lib/whop/client';
import { webhookEventSchema } from '@/lib/validators';
import { stringifyJson } from '@/lib/json-helper';
import crypto from 'crypto';

const MAX_PAYLOAD_SIZE = 1024 * 100; // 100KB
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

/**
 * Verify webhook signature
 */
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    // If no secret configured, skip verification (not recommended for production)
    return true;
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

/**
 * Process webhook event asynchronously
 */
async function processEvent(event: any) {
  const rulesEngine = new RulesEngine(prisma);
  const whopClient = getWhopClient();

  try {
    // Handle different event types
    if (event.type === 'message.created' || event.type === 'message.updated') {
      const { message, channel, author, company_id, product_id } = event.data;
      
      if (!message?.content) return;

      // Evaluate against rules
      const incidentData = await rulesEngine.evaluate(
        company_id,
        product_id || null,
        'chat',
        channel.id,
        message.content,
        author.id,
        author.roles
      );

      if (!incidentData) return;

      // Get matching rules
      const rules = await prisma.moderationRule.findMany({
        where: {
          id: { in: incidentData.ruleHits.map(h => h.ruleId) },
        },
        include: { actions: true },
      });

      const actionsTaken: any[] = [];

      // Apply actions
      for (const rule of rules) {
        for (const action of rule.actions) {
          try {
            switch (action.type) {
              case 'flag_review':
                // Always log to review queue
                break;

              case 'auto_delete':
                if (rule.mode === 'enforce') {
                  try {
                    await whopClient.deleteMessage(channel.id, message.id);
                    actionsTaken.push({
                      type: 'auto_delete',
                      status: 'success',
                      ruleId: rule.id,
                    });
                  } catch (error: any) {
                    actionsTaken.push({
                      type: 'auto_delete',
                      status: 'not_supported',
                      error: error.message,
                      ruleId: rule.id,
                    });
                  }
                }
                break;

              case 'warn_user':
                if (rule.mode === 'enforce') {
                  try {
                    const warnMessage = (action.config as any).message || 
                      `Your message violated rule: ${rule.name}`;
                    await whopClient.sendDM(author.id, warnMessage);
                    actionsTaken.push({
                      type: 'warn_user',
                      status: 'success',
                      ruleId: rule.id,
                    });
                  } catch (error: any) {
                    actionsTaken.push({
                      type: 'warn_user',
                      status: 'not_supported',
                      error: error.message,
                      ruleId: rule.id,
                    });
                  }
                }
                break;

              case 'timeout_user':
                if (rule.mode === 'enforce') {
                  try {
                    const duration = (action.config as any).duration || 3600;
                    await whopClient.timeoutUser(author.id, duration);
                    actionsTaken.push({
                      type: 'timeout_user',
                      status: 'success',
                      ruleId: rule.id,
                    });
                  } catch (error: any) {
                    actionsTaken.push({
                      type: 'timeout_user',
                      status: 'not_supported',
                      error: error.message,
                      ruleId: rule.id,
                    });
                  }
                }
                break;

              case 'escalate_admin':
                try {
                  const channelId = (action.config as any).channel_id;
                  if (channelId) {
                    await whopClient.notifyChannel(
                      channelId,
                      `⚠️ Moderation alert: Rule "${rule.name}" triggered by ${author.username || author.id}`
                    );
                    actionsTaken.push({
                      type: 'escalate_admin',
                      status: 'success',
                      ruleId: rule.id,
                    });
                  }
                } catch (error: any) {
                  actionsTaken.push({
                    type: 'escalate_admin',
                    status: 'not_supported',
                    error: error.message,
                    ruleId: rule.id,
                  });
                }
                break;
            }
          } catch (error: any) {
            console.error(`Error applying action ${action.type}:`, error);
          }
        }
      }

      // Create incident
      await prisma.incident.create({
        data: {
          companyId: company_id,
          productId: product_id || null,
          ruleId: incidentData.ruleHits[0]?.ruleId || null,
          source: incidentData.source,
          contentId: message.id,
          authorId: incidentData.authorId,
          contentSnapshot: stringifyJson(incidentData.contentSnapshot),
          ruleHits: stringifyJson(incidentData.ruleHits),
          features: stringifyJson(incidentData.features),
          actionsTaken: stringifyJson(actionsTaken),
          status: 'pending',
        },
      });
    }

    // Handle forum post events similarly
    if (event.type === 'forum_post.created' || event.type === 'forum_post.updated') {
      // Similar logic for forum posts
      // TODO: Implement forum post handling
    }
  } catch (error: any) {
    console.error('Error processing event:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitModule = await import('@/lib/rate-limit');
    const limit = rateLimitModule.rateLimit(`webhook:${clientIp}`, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // 100 requests per minute
    });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Check payload size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { error: 'Payload too large' },
        { status: 413 }
      );
    }

    // Verify signature
    const signature = request.headers.get('x-whop-signature') || '';
    const body = await request.text();
    
    if (!verifySignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event = JSON.parse(body);
    const validated = webhookEventSchema.parse(event);

    // Check for duplicate (idempotency)
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: validated.id },
    });

    if (existing) {
      return NextResponse.json({ status: 'duplicate' });
    }

    // Store event
    await prisma.webhookEvent.create({
      data: {
        eventId: validated.id,
        eventType: validated.type,
        payload: stringifyJson(validated.data),
        processed: false,
      },
    });

    // Process asynchronously (in production, use a proper job queue)
    processEvent(validated).catch(error => {
      console.error('Async processing error:', error);
      prisma.webhookEvent.update({
        where: { eventId: validated.id },
        data: {
          processed: false,
          error: error.message,
        },
      });
    });

    // Mark as processed after a delay (in real implementation)
    setTimeout(async () => {
      await prisma.webhookEvent.update({
        where: { eventId: validated.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });
    }, 1000);

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

