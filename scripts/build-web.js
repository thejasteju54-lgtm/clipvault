import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('[build-web] Building @clipvault/web-dashboard...');
execSync('npm run build --workspace=@clipvault/web-dashboard', {
  cwd: rootDir,
  stdio: 'inherit'
});

const srcDist = path.join(rootDir, 'packages', 'web-dashboard', 'dist');
const targetDist = path.join(rootDir, 'dist');

if (fs.existsSync(srcDist)) {
  fs.cpSync(srcDist, targetDist, { recursive: true });
  console.log('[build-web] Successfully mirrored packages/web-dashboard/dist to ./dist for Vercel deployment');
} else {
  console.error('[build-web] Error: packages/web-dashboard/dist not found after build!');
  process.exit(1);
}
