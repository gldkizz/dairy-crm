import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/shared/lib/auth.config";
import { prisma } from "@/shared/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          console.error("authorize: invalid credentials payload", parsed.error.flatten());
          return null;
        }

        const email = parsed.data.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.error("authorize: user not found", email);
          return null;
        }

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.password,
        );
        if (!valid) {
          console.error("authorize: bad password for", email);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});
