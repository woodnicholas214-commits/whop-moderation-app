#!/bin/bash
# Post-install script for Vercel
# Run migrations after Prisma client is generated

echo "Running Prisma migrations..."
if [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  DATABASE_URL="$POSTGRES_URL_NON_POOLING" npx prisma migrate deploy
else
  echo "POSTGRES_URL_NON_POOLING not set, skipping migrations"
fi

