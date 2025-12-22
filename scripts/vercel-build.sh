#!/bin/bash
# Vercel build script
# This ensures Prisma is set up correctly before building

echo "Generating Prisma Client..."
npx prisma generate

echo "Running database migrations..."
npx prisma migrate deploy || echo "Migrations skipped (no migrations directory)"

echo "Building Next.js app..."
next build

