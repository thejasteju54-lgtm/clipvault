import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAllTests() {
  console.log('--- RUNNING CLIPVAULT AUTOMATED TEST SUITE ---');

  const files = [
    path.join(__dirname, 'unit', 'domain-models.test.ts'),
    path.join(__dirname, 'unit', 'security-pii.test.ts'),
    path.join(__dirname, 'integration', 'vault-db.test.ts'),
    path.join(__dirname, 'integration', 'sync-engine.test.ts'),
    path.join(__dirname, 'integration', 'stress-failure.test.ts')
  ];

  const stream = run({
    files,
    concurrency: false // Sequential to isolate file locks
  });

  stream.compose(new spec()).pipe(process.stdout);

  stream.on('test:fail', () => {
    process.exitCode = 1;
  });
}

runAllTests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
