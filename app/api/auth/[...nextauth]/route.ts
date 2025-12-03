import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import prisma from '@/lib/prisma' 

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'database', // using Prisma adapter + DB sessions
    // maxAge: 30 * 24 * 60 * 60, // optional: session lifetime in seconds
  },
  callbacks: {
    // Optional: attach user id to session
    async session({ session, user }) {
      session.user = session.user || {}
      // @ts-ignore - augmenting session
      session.user.id = user.id
      return session
    },
  },
  // Logging development ke liye:
  debug: process.env.NODE_ENV === 'development',
})

export { handler as GET, handler as POST }
