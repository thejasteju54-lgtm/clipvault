import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import fs from 'node:fs';
import path from 'node:path';

function mirrorDistPlugin(): Plugin {
  return {
    name: 'mirror-dist',
    closeBundle() {
      try {
        const localDist = path.resolve(__dirname, 'dist');
        const rootDist = path.resolve(__dirname, '../../dist');
        if (fs.existsSync(localDist)) {
          fs.cpSync(localDist, rootDist, { recursive: true });
        }
      } catch {
        // Safe catch if root directory is not accessible
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), basicSsl(), mirrorDistPlugin()],
  server: {
    host: '0.0.0.0',
    port: 3000
  }
});
