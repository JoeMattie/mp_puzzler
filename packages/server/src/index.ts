// packages/server/src/index.ts
import { createServer } from 'http';
import { createApp } from './app.js';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3001;
const prisma = new PrismaClient();

async function main() {
  const app = createApp();
  const server = createServer(app);

  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
