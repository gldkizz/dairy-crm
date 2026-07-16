import type { NextAuthConfig } from "next-auth";

const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
const isHttps = authUrl.startsWith("https://");

export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  trustHost: true,
  // Required for http://IP:port — production defaults to Secure cookies otherwise
  useSecureCookies: isHttps,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
