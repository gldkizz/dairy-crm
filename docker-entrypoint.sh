#!/bin/sh
set -e

echo "Running Prisma migrations..."
prisma migrate deploy

echo "Ensuring demo users exist..."
tsx prisma/ensure-demo-user.ts

echo "Seeding database (boards/clients, best-effort)..."
if ! tsx prisma/seed.ts; then
  echo "WARNING: full seed failed — demo users should still work"
fi

echo "Starting Next.js..."
exec node server.js
