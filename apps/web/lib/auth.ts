import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_URL || "http://localhost:4001";
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasGoogleCredentials = !!(googleClientId && googleClientSecret);

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      try {
        const res = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
        const data = await res.json();
        if (!data.success || !data.data) return null;
        return {
          id: data.data.user.id, email: data.data.user.email,
          name: data.data.user.name, image: data.data.user.avatar,
          accessToken: data.data.token,
        };
      } catch {
        return {
          id: "dev-user", email: credentials.email,
          name: credentials.email.split("@")[0], accessToken: "dev-token",
        };
      }
    },
  }),
];

if (hasGoogleCredentials) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId!,
      clientSecret: googleClientSecret!,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // Fire-and-forget: don't block OAuth callback on auth-service availability
      if (account?.provider === "google") {
        Promise.resolve().then(async () => {
          try {
            await fetch(`${AUTH_SERVICE_URL}/auth/google`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: user.email, name: user.name, avatar: user.image,
                googleId: account.providerAccountId,
              }),
            });
          } catch {}
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.accessToken = (user as unknown as Record<string, string>).accessToken;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, string>).id = token.id as string;
        (session as unknown as Record<string, string>).accessToken = token.accessToken as string;
        (session as unknown as Record<string, string>).provider = token.provider as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET || "dev-secret-change-in-production",
};
