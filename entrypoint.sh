#!/bin/sh
set -e

echo "Starting PetWeb..."
echo "NODE_ENV: ${NODE_ENV}"

cd /app/backend

echo "Running Prisma DB migrations..."
./node_modules/.bin/prisma migrate deploy || {
  echo "Migration skipped or nothing to migrate."
}

echo "Seeding database..."
node prisma/seed.js || {
  echo "Seed skipped or already seeded."
}

echo "Starting Node.js backend on port ${PORT:-5713}..."
exec node server-local.js
