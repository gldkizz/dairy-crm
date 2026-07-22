#!/bin/sh
set -e

echo "Waiting for database..."
i=0
until prisma migrate deploy; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "ERROR: database is not reachable after 30 attempts"
    exit 1
  fi
  echo "Database not ready yet (attempt $i/30), retrying in 2s..."
  sleep 2
done

echo "Ensuring demo users exist..."
tsx prisma/ensure-demo-user.ts

echo "Seeding database (boards/clients, best-effort)..."
if ! tsx prisma/seed.ts; then
  echo "WARNING: full seed failed — demo users should still work"
fi

echo "Starting Next.js..."
exec node server.js
