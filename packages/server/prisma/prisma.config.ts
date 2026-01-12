import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrate: {
    adapter: async () => {
      const { Pool } = await import('pg');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      return new PrismaPg(pool);
    },
  },
});
