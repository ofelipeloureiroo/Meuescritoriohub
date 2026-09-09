/**
 * server.js - Startup entry point for Hostinger, cPanel, and external Node.js hosting
 * 
 * Hostinger's Node.js application manager uses `server.js` or `app.js` by default.
 * This file boots the compiled production server (`dist/server.cjs`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const distServer = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(distServer)) {
  require(distServer);
} else {
  console.error("ERRO: 'dist/server.cjs' não foi encontrado.");
  console.error("Execute 'npm run build' na sua hospedagem antes de iniciar a aplicação.");
  process.exit(1);
}
