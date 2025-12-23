# Webhook Setup Instructions

## Where to Configure Webhook in Whop

1. **Go to Whop Developer Dashboard**
   - Visit: https://developer.whop.com (or your Whop developer portal)
   - Log in with your Whop account

2. **Navigate to Your App**
   - Go to "Apps" or "My Apps"
   - Find your moderation app (or create a new app if needed)

3. **Configure Webhook**
   - Look for "Webhooks" or "Event Subscriptions" section
   - Click "Add Webhook" or "Configure Webhook"

4. **Enter Webhook Details**
   - **Webhook URL**: `https://whop-moderation-app-real.vercel.app/api/webhook`
   - **Webhook Secret**: Use the same value as your `WEBHOOK_SECRET` environment variable
     - Current secret: `3e045c5bb07a56bebd202701e39c1fc70dbd097d5a1e1a3674132a1593d65ab2`
   - **Events to Subscribe**: Select the following events:
     - `message.created` - When a new chat message is created
     - `message.updated` - When a chat message is edited
     - `forum_post.created` - When a new forum post is created
     - `forum_post.updated` - When a forum post is edited

5. **Save Configuration**
   - Click "Save" or "Create Webhook"
   - Whop will send a test webhook to verify the endpoint

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

