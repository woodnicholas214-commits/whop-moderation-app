# Setup Instructions

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Set up database:**
   ```bash
   npx prisma generate
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Frosted-UI Integration

The app currently uses basic Tailwind CSS components. To integrate frosted-ui:

1. Install frosted-ui:
   ```bash
   npm install @whop-apps/ui
   ```

2. Replace components in `/app/dashboard` with frosted-ui components:
   - Use `@whop-apps/ui` components for buttons, forms, tables, dialogs
   - Follow the frosted-ui documentation for component usage

3. Update the layout to use frosted-ui's design system

## Whop API Integration

The Whop API client in `/lib/whop/client.ts` contains placeholder methods. Update these with actual Whop API endpoints:

- `getCurrentUser()` - Get authenticated user
- `getCompany()` - Get company details
- `getProduct()` - Get product details
- `getChannels()` - List channels/forums
- `deleteMessage()` - Delete a message
- `hidePost()` - Hide a forum post
- `sendDM()` - Send direct message
- `timeoutUser()` - Timeout a user
- `muteUser()` - Mute a user
- `notifyChannel()` - Send notification to channel

Refer to [Whop API Documentation](https://docs.whop.com/developer/api/getting-started) for exact endpoints.

## Authentication

The auth system in `/lib/auth.ts` uses placeholder logic. Integrate with Whop SDK:

1. Install Whop SDK:
   ```bash
   npm install @whop-apps/sdk
   ```

2. Update `getSession()` to use Whop SDK authentication
3. Update `isAuthorized()` to check user roles/permissions via Whop API

## Webhook Registration

1. Go to Whop Developer Dashboard
2. Register webhook URL: `https://your-domain.com/api/webhook`
3. Select events:
   - `message.created`
   - `message.updated`
   - `forum_post.created`
   - `forum_post.updated`
4. Set webhook secret in `.env` as `WEBHOOK_SECRET`

## Database Schema

The Prisma schema includes:
- `Company` - Whop companies/workspaces
- `Product` - Whop products
- `ModerationRule` - Moderation rules
- `RuleCondition` - Rule conditions
- `RuleAction` - Rule actions
- `Exemption` - User/role exemptions
- `Incident` - Flagged content incidents
- `AuditEvent` - Audit log entries
- `WebhookEvent` - Processed webhook events

Run `npx prisma studio` to view and edit data.

