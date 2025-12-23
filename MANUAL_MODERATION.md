# Manual Message Moderation

Since Whop webhooks don't support message events, you can manually process messages for moderation.

## Option 1: Manual Processing Endpoint

Use the `/api/messages/process` endpoint to manually trigger moderation for a specific message.

### Example Request

```bash
curl -X POST https://whop-moderation-app-real.vercel.app/api/messages/process \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "post_1CWNn51LcmsAEvyrNwBGEH",
    "channelId": "pdWaGAyrkASLy5",
    "content": "This is a test message with spam keyword",
    "authorId": "user_123",
    "authorRoles": []
  }'
```

### Response

```json
{
  "success": true,
  "message": "Message processed",
  "messageId": "post_1CWNn51LcmsAEvyrNwBGEH",
  "incidentId": "incident_id",
  "matched": true,
  "rulesMatched": 1,
  "actionsTaken": 1,
  "details": {
    "ruleHits": [...],
    "actionsTaken": [...]
  }
}
```

## Option 2: Browser Extension / Bookmarklet

You could create a browser extension or bookmarklet that:
1. Extracts message content from the Whop chat page
2. Calls the `/api/messages/process` endpoint
3. Shows moderation results

## Option 3: Integration with Whop Chat App

If Whop has a Chat App API or SDK, we could:
1. Create a Whop app that runs within the chat interface
2. Intercept messages before they're posted
3. Process them through our moderation engine
4. Block or flag messages in real-time

## Option 4: Polling Script

If Whop has message API endpoints, we could create a background script that:
1. Polls for new messages every few seconds
2. Processes them through moderation
3. Takes actions automatically

## Current Status

The moderation engine is fully functional and can:
- ✅ Evaluate messages against rules
- ✅ Match keywords, links, domains, etc.
- ✅ Create incidents
- ✅ Apply actions (delete, warn, etc.) - if Whop API endpoints work

**What's needed:**
- A way to get message content (API endpoint or integration)
- A way to trigger moderation (manual endpoint, polling, or real-time integration)

## Testing

You can test the moderation engine with the test endpoint:

```bash
curl -X POST https://whop-moderation-app-real.vercel.app/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"content": "test spam message"}'
```

This will show you if your rules are matching correctly.

