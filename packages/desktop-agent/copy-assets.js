import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.join(__dirname, 'dist', 'capture');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const srcFile = path.join(__dirname, 'src', 'capture', 'clipboard-listener.ps1');
const destFile = path.join(targetDir, 'clipboard-listener.ps1');

if (fs.existsSync(srcFile)) {
  fs.copyFileSync(srcFile, destFile);
  console.log('Successfully copied clipboard-listener.ps1 to dist/capture/');
}
