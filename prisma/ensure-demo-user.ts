/**
 * Minimal bootstrap for production: ensures demo login users exist.
 * Uses only `pg` + `bcryptjs` (no Prisma client) so it works in the
 * Next.js standalone image even when tsx/prisma seed deps are incomplete.
 */
import bcrypt from "bcryptjs";
import pg from "pg";

const USERS = [
  { email: "manager@dairy.local", name: "Иван Менеджер" },
  { email: "anna@dairy.local", name: "Анна Продажи" },
] as const;

function newId(): string {
  // Prisma schema uses String @id — any unique string is fine for demo users
  return `demo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const passwordHash = await bcrypt.hash("password123", 10);
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    for (const user of USERS) {
      const existing = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE email = $1 LIMIT 1`,
        [user.email],
      );

      if (existing.rowCount && existing.rows[0]) {
        await client.query(
          `UPDATE users SET password = $1, name = $2, "updatedAt" = NOW() WHERE email = $3`,
          [passwordHash, user.name, user.email],
        );
        console.log(`Updated user ${user.email}`);
      } else {
        await client.query(
          `INSERT INTO users (id, email, name, password, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [newId(), user.email, user.name, passwordHash],
        );
        console.log(`Created user ${user.email}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("ensure-demo-user failed:", err);
  process.exit(1);
});
