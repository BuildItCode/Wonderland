import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { createStore, openDatabase } from './store/index.js';
import { createEngine } from './engine/index.js';
import { createHubServer } from './transport/index.js';

/** Package version. */
export const VERSION = '0.1.0';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_PATH: z.string().min(1).default('./data/wonderland.sqlite'),
});

/** Validate config, wire the layers, and start the hub. Crash-fast on misconfiguration. */
export function main(): void {
  const env = envSchema.parse(process.env);
  mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });
  const db = openDatabase(env.DATABASE_PATH);
  const store = createStore(db);
  const engine = createEngine({ store });
  const app = createHubServer(engine);
  app.listen(env.PORT, () => {
    process.stdout.write(
      JSON.stringify({ level: 'info', msg: 'wonderland hub listening', port: env.PORT }) + '\n',
    );
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
