#!/bin/bash
# Post-install script for Vercel
# Run migrations after Prisma client is generated

echo "Running Prisma migrations..."
if [ -n "$POSTGRES_URL_NON_POOLING" ]; then
  export DATABASE_URL="$POSTGRES_URL_NON_POOLING"
  npx prisma migrate deploy || echo "No migrations to run or migration failed"
elif [ -n "$DATABASE_URL" ]; then
  npx prisma migrate deploy || echo "No migrations to run or migration failed"
else
  echo "No database URL found, skipping migrations"
fi
