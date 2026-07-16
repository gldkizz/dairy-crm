#!/bin/sh
set -e

echo "Running Prisma migrations..."
prisma migrate deploy

echo "Seeding database..."
if ! tsx prisma/seed.ts; then
  echo "WARNING: database seed failed — login users may be missing"
fi

echo "Starting Next.js..."
exec node server.js
