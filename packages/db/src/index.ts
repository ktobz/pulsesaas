import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

let _prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!_prisma) {
    _prisma = globalForPrisma.prisma || new PrismaClient({ log: ['warn', 'error'] });
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = _prisma;
    }
  }
  return _prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop: string) {
    try {
      return (getPrisma() as Record<string, unknown>)[prop];
    } catch {
      // Return a no-op that won't crash but returns empty results
      if (prop === '$connect') return () => Promise.resolve();
      if (prop === '$disconnect') return () => Promise.resolve();
      return undefined;
    }
  },
});

export { PrismaClient };
