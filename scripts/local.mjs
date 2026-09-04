import { spawnSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('../', import.meta.url)));
const port = 3001;
process.env.WRANGLER_WRITE_LOGS = 'false';
process.env.WRANGLER_LOG_PATH = '.wrangler/logs';
process.env.MINIFLARE_REGISTRY_PATH = '.wrangler/registry';
mkdirSync('.wrangler', { recursive: true });
writeFileSync('.wrangler/monopin-local.json', JSON.stringify({
  name: 'monopin-local',
  compatibility_date: '2026-09-01',
  d1_databases: [{ binding: 'DB', database_name: 'site-creator-d1', database_id: '00000000-0000-4000-8000-000000000000' }],
}));
// Idempotent local bootstrap from the checked-in migration; production migrations stay immutable.
const sql = ['drizzle/0001_regular_squadron_sinister.sql', 'drizzle/0002_stiff_donald_blake.sql', 'drizzle/0003_cynical_aqueduct.sql'].map((file) => readFileSync(file, 'utf8')).join('\n')
  .replaceAll('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ')
  .replaceAll('CREATE UNIQUE INDEX ', 'CREATE UNIQUE INDEX IF NOT EXISTS ');
writeFileSync('.wrangler/monopin-local.sql', sql);
const prepared = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'site-creator-d1',
  '--local', '--config', '.wrangler/monopin-local.json', '--persist-to', '.wrangler/state', '--file', '.wrangler/monopin-local.sql'], { stdio: 'inherit', windowsHide: true });
if (prepared.status !== 0) process.exit(prepared.status || 1);
const interfaces = Object.entries(networkInterfaces()).filter(([name]) => !/loopback|vethernet|docker|virtual|vpn/i.test(name));
const address = interfaces.flatMap(([, values]) => values || []).find((value) => value.family === 'IPv4' && !value.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(value.address))?.address;
if (address) process.env.MONOPIN_JOIN_ORIGIN = `http://${address}:${port}`;
const built = spawnSync(process.execPath, ['node_modules/vinext/dist/cli.js', 'build'], { stdio: 'inherit', windowsHide: true });
if (built.status !== 0) process.exit(built.status || 1);
console.log(`\n先生の画面: http://127.0.0.1:${port}/`);
if (address) console.log('スマホの参加用QR・URLは、部屋を作ると主催者画面に表示されます。');
console.log('終了するには、このウィンドウで Ctrl+C を押してください。\n');
// Serve the compiled app to avoid dependency optimization reloads during a live lesson.
const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'dev', '--config', 'dist/server/wrangler.json', '--port', String(port), '--ip', '0.0.0.0', '--persist-to', '.wrangler/state', '--log-level', 'warn'], { stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => process.exit(code || 0));
process.on('SIGINT', () => child.kill('SIGINT'));

