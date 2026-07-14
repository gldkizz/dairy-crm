#!/bin/sh
set -e

echo "Running Prisma migrations..."
prisma migrate deploy

echo "Seeding database..."
tsx prisma/seed.ts || true

echo "Starting Next.js..."
exec node server.js
