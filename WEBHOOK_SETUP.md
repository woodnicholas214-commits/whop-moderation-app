# Webhook Setup Instructions

## ⚠️ Important: Whop Webhooks Don't Support Chat Messages

**Whop's webhook system does NOT provide events for chat messages or forum posts.** The available webhook events are limited to:
- Payment events (invoice_created, payment_succeeded, etc.)
- Membership events (membership_activated, membership_deactivated)
- Entry events (entry_created, entry_approved, etc.)
- Withdrawal and dispute events

**This means webhooks alone cannot be used to moderate chat messages in real-time.**

## Alternative Approaches

Since Whop webhooks don't support message events, you have a few options:

### Option 1: Poll Whop API for Messages (Recommended)
Create a background job that periodically polls Whop's API for new messages and processes them. This requires:
- A Whop API endpoint to fetch messages (if available)
- A scheduled job/worker to poll regularly
- Message deduplication to avoid processing the same message twice

### Option 2: Use Whop's Built-in Chat Moderation
Whop's Chat app has some built-in moderation features:
- Block URLs
- Block media
- User cooldown periods

However, this is limited compared to custom keyword filtering.

### Option 3: Manual Review Queue
Use the app as a manual moderation tool where moderators review flagged content through the review queue interface.

## Current Implementation Status

The webhook endpoint (`/api/webhook`) is set up and ready, but it will only receive the events that Whop supports (payments, memberships, etc.). 

**To make message moderation work, we need to:**
1. Check if Whop has a Messages API endpoint we can poll
2. Implement a polling mechanism
3. Or integrate with Whop's Chat app API if available

## Next Steps

1. **Check Whop API Documentation** for message endpoints:
   - Look for endpoints like `/api/v2/channels/{id}/messages`
   - Check if there's a way to subscribe to message events
   - See if there's a real-time API or WebSocket connection

2. **If no API exists**, consider:
   - Using the app as a manual moderation tool
   - Requesting message webhook support from Whop
   - Using a browser extension or other integration method

## Verify Webhook is Working

1. **Check Vercel Logs**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for webhook receipt logs when you send a test message

2. **Test Manually**
   - Send a test message in your Whop chat with a keyword you've configured
   - Check if it gets flagged or deleted

3. **Use Test Endpoint**
   ```bash
   curl -X POST https://whop-moderation-app-real.vercel.app/api/webhook/test \
     -H "Content-Type: application/json" \
     -d '{"content": "test spam message"}'
   ```

## Troubleshooting

- **404 Error**: Make sure the webhook URL is exactly `https://whop-moderation-app-real.vercel.app/api/webhook`
- **401 Error**: Verify the webhook secret matches in both Whop and Vercel
- **No Events**: Check that you've selected the correct events in Whop dashboard
- **Not Processing**: Check Vercel logs for errors in webhook processing

## Important Notes

- The webhook endpoint requires signature verification for security
- In development mode, signature verification is more lenient for testing
- Make sure your `WEBHOOK_SECRET` environment variable is set in Vercel
- The webhook processes events asynchronously, so there may be a slight delay

