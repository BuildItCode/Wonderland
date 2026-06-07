// Build step: copy the static console into dist so `npm start` (node dist/index.js) can serve it.
// tsc only emits .js from src/**.ts and ignores the public/ assets.
import { cpSync } from 'node:fs';

cpSync('src/transport/public', 'dist/transport/public', { recursive: true });
