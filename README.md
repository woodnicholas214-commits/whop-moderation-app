# Whop AutoMod - Content Moderation App

A production-ready content moderation application for Whop, similar to Discord's AutoMod. Admins can configure moderation rules that apply to Whop forums and chats, with logging, review queue, and enforcement actions.

## Features

- **Rule Builder**: Create complex moderation rules with multiple conditions and actions
- **Review Queue**: Review and moderate flagged content
- **Audit Log**: Track all moderation actions and rule changes
- **Multi-tenant**: Safe by default with company/product scoping
- **Webhook Processing**: Real-time event processing with idempotency
- **Rules Engine**: Deterministic evaluation with feature extraction

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **PostgreSQL** with Prisma ORM
- **Tailwind CSS** for styling
- **Vitest** for testing
- **Zod** for validation

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Whop API credentials

## Local Setup

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Set up environment variables:**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `WHOP_API_KEY`: Your Whop API key
- `NEXT_PUBLIC_WHOP_APP_ID`: Your Whop app ID
- `DATABASE_URL`: PostgreSQL connection string
- `WEBHOOK_SECRET`: Secret for webhook signature verification
- `NEXT_PUBLIC_APP_URL`: Your app URL (e.g., `http://localhost:3000`)

3. **Set up the database:**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npm run db:migrate

# Seed starter rules
npm run db:seed
```

4. **Start the development server:**

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Webhook Setup

To receive events from Whop:

1. **Register your webhook endpoint** in the Whop developer dashboard:
   - URL: `https://your-domain.com/api/webhook`
   - Events: `message.created`, `message.updated`, `forum_post.created`, `forum_post.updated`

2. **Configure webhook secret** in your `.env` file:
   ```
   WEBHOOK_SECRET=your-secret-here
   ```

3. **Verify webhook signature** is enabled by default. The endpoint will verify the `x-whop-signature` header.

## API Endpoints

### Rules
- `GET /api/rules?companyId=...` - List rules
- `POST /api/rules` - Create rule
- `GET /api/rules/[id]` - Get rule
- `PATCH /api/rules/[id]` - Update rule
- `DELETE /api/rules/[id]` - Delete rule
- `POST /api/rules/test` - Test rule against sample content

### Incidents
- `GET /api/incidents?companyId=...&status=...` - List incidents
- `GET /api/incidents/[id]` - Get incident
- `PATCH /api/incidents/[id]` - Review incident

### Audit
- `GET /api/audit?companyId=...` - Get audit log

### Webhook
- `POST /api/webhook` - Receive Whop events

## Rule Types

### Match Types (Conditions)
- `keyword_exact` - Exact keyword match
- `keyword_contains` - Contains keyword
- `regex` - Regular expression match
- `profanity` - Profanity word list
- `link_allow` / `link_block` - Link allow/block list
- `domain_allow` / `domain_block` - Domain allow/block list
- `repeated_text` - Detect repeated text
- `excessive_caps` - Excessive capitalization
- `emoji_spam` - Too many emojis
- `mention_spam` - Too many mentions
- `message_frequency` - Message rate limiting
- `suspicious_pattern` - Custom suspicious patterns

### Actions
- `flag_review` - Send to review queue
- `auto_hide` - Auto-hide message/post
- `auto_delete` - Auto-delete message/post
- `warn_user` - Send warning DM
- `timeout_user` - Timeout user for duration
- `mute_user` - Mute user for duration
- `escalate_admin` - Notify admins in channel

## Supported vs Mocked Actions

### Currently Supported
- ✅ Incident logging
- ✅ Review queue flagging
- ✅ Audit logging

### Requires Whop API Implementation
The following actions are implemented but may need adjustment based on actual Whop API endpoints:

- ⚠️ `auto_delete` - Requires Whop message deletion API
- ⚠️ `auto_hide` - Requires Whop post hiding API
- ⚠️ `warn_user` - Requires Whop DM API
- ⚠️ `timeout_user` - Requires Whop user timeout API
- ⚠️ `mute_user` - Requires Whop user mute API
- ⚠️ `escalate_admin` - Requires Whop channel message API

All unsupported actions are logged with `status: 'not_supported'` and can be reviewed in the UI.

## Development

### Database Commands

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npm run db:migrate

# Push schema changes (dev only)
npm run db:push

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

## Project Structure

```
/app
  /api          # API routes
  /dashboard    # Dashboard pages
  /globals.css  # Global styles
  /layout.tsx   # Root layout
  /page.tsx     # Home page

/lib
  /whop         # Whop API client
  auth.ts       # Authentication helpers
  db.ts         # Prisma client
  rules-engine.ts # Rules evaluation engine
  validators.ts # Zod schemas
  utils.ts      # Utility functions

/prisma
  schema.prisma # Database schema
  seed.ts       # Seed script
```

## Security Considerations

- **Multi-tenant isolation**: All queries are scoped by `companyId`
- **Webhook verification**: Signature verification for webhook events
- **Idempotency**: Duplicate events are prevented via `eventId`
- **Rate limiting**: Basic rate limiting on webhook endpoint (TODO: Redis-based)
- **Authorization**: Admin/mod checks via Whop auth

## TODO / Future Enhancements

- [ ] Integrate with actual Whop SDK for authentication
- [ ] Implement Redis-based job queue for webhook processing
- [ ] Add rate limiting with Redis
- [ ] Complete frosted-ui component integration
- [ ] Add rule reordering UI
- [ ] Implement rule duplication
- [ ] Add exemption management UI
- [ ] Add channel/forum selection UI
- [ ] Implement message frequency detection (requires message history)
- [ ] Add profanity filter library integration
- [ ] Add unit tests for API routes
- [ ] Add E2E tests
- [ ] Implement proper error boundaries
- [ ] Add loading states and skeletons
- [ ] Add toast notifications

## Deployment to Vercel

This app can be deployed to Vercel for production use. See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

Quick steps:
1. Set up a PostgreSQL database (Vercel Postgres, Supabase, or Railway)
2. Push code to GitHub
3. Import to Vercel
4. Configure environment variables
5. Deploy!

Your app will be available at `https://your-app.vercel.app`

## License

MIT

