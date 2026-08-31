import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  callbacks: {
    async signIn({ user }) {
      if (allowedDomains.length === 0) return true;
      const email = (user?.email || "").toLowerCase();
      const domain = email.split("@")[1];
      return allowedDomains.includes(domain);
    },
    authorized({ auth: session }) {
      return !!session?.user;
    },
  },
} satisfies NextAuthConfig;
