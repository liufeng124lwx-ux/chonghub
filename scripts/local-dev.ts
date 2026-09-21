import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Pool } from 'pg';

export type ProcessInfo = { pid: number; command: string; cwd: string | null };

const root = resolve(import.meta.dirname, '..');
const runtimeDir = resolve(root, 'var');
const pidFile = resolve(runtimeDir, 'local-dev.pid');
const logFile = resolve(runtimeDir, 'local-dev.log');
const keyFile = resolve(runtimeDir, 'local-auth-key');
const port = 3000;
const origin = `http://localhost:${port}`;

function readEnvFile(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const values: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function loadLocalEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const defaults = {
    ...readEnvFile(resolve(root, '.env.example')),
    APP_ORIGIN: origin,
    DATABASE_URL: 'postgresql://chonghub:local-dev-only@127.0.0.1:5432/chonghub_dev',
    MAIL_TRANSPORT: 'local',
    LOCAL_MAIL_DIR: './var/mail',
    PRIVATE_STORAGE_DIR: './var/private',
  };
  for (const values of [defaults, readEnvFile(resolve(root, '.env')), readEnvFile(resolve(root, '.env.local'))]) {
    for (const [key, value] of Object.entries(values)) if (env[key] === undefined && value !== '') env[key] = value;
  }
  mkdirSync(runtimeDir, { recursive: true });
  if (!existsSync(keyFile)) writeFileSync(keyFile, `${cryptoRandomKey()}\n`, { mode: 0o600 });
  if (!env.AUTH_HMAC_KEY) env.AUTH_HMAC_KEY = readFileSync(keyFile, 'utf8').trim();
  if (!env.APP_ORIGIN) env.APP_ORIGIN = origin;
  return env;
}

function cryptoRandomKey() {
  return Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(32))).toString('hex');
}

function commandFor(pid: number): string {
  try { return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim(); } catch { return ''; }
}

function cwdFor(pid: number): string | null {
  try {
    const output = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8' });
    const line = output.split(/\r?\n/).find((entry) => entry.startsWith('n'));
    return line ? line.slice(1) : null;
  } catch { return null; }
}

export function classifyProcess(pid: number, projectRoot = root): ProcessInfo & { owned: boolean } {
  const command = commandFor(pid);
  const cwd = cwdFor(pid);
  return { pid, command, cwd, owned: isOwnedProcess(command, cwd, projectRoot) };
}

/** Only a Next dev command launched from this checkout may be recycled. */
export function isOwnedProcess(command: string, cwd: string | null, projectRoot = root): boolean {
  const nextDev = /(?:^|\/)(?:next|pnpm|npm|yarn)(?:\s|$)/.test(command)
    && /(?:^|\s)dev(?:\s|$)/.test(command);
  // Next's listener is a `next-server` child on some Node/Next versions;
  // its command line no longer includes `dev`, so the exact checkout cwd is
  // the additional ownership proof.
  const nextServerChild = /(?:^|\/)next-server(?:\s|$)/.test(command);
  return (nextDev || nextServerChild) && cwd === projectRoot;
}

export function listeningPids(): number[] {
  try {
    const output = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp'], { encoding: 'utf8' });
    return [...new Set(output.split(/\r?\n/).filter((line) => line.startsWith('p')).map((line) => Number(line.slice(1))).filter(Number.isInteger))];
  } catch { return []; }
}

async function waitForPortFree(timeoutMs = 3_000) {
  const started = Date.now();
  while (listeningPids().length && Date.now() - started < timeoutMs) await delay(100);
  return listeningPids().length === 0;
}

async function stopOwnedProcesses() {
  const pids = listeningPids();
  if (!pids.length) { if (existsSync(pidFile)) unlinkSync(pidFile); return; }
  for (const pid of pids) {
    const info = classifyProcess(pid);
    if (!info.owned) throw new Error(`端口 ${port} 被非 ChongHub 开发服务占用（PID ${pid}）。为安全起见未终止它，请手动处理后重试。`);
    process.kill(pid, 'SIGTERM');
  }
  if (!await waitForPortFree()) {
    const remaining = listeningPids();
    for (const pid of remaining) {
      if (!classifyProcess(pid).owned) throw new Error(`旧服务退出期间端口 ${port} 被其他进程占用，未强制终止。`);
      process.kill(pid, 'SIGKILL');
    }
    if (!await waitForPortFree(1_000)) throw new Error(`旧服务未能释放端口 ${port}。`);
  }
  if (existsSync(pidFile)) unlinkSync(pidFile);
}

async function checkDatabase(env: NodeJS.ProcessEnv) {
  const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 1_500, max: 1 });
  try { await pool.query('select 1'); } catch { throw new Error(`PostgreSQL 不可用：${env.DATABASE_URL}\n请先运行 docker compose -f compose.dev.yml up -d postgres，或检查 DATABASE_URL。`); } finally { await pool.end(); }
}

async function fetchWithTimeout(url: string, timeoutMs = 4_000) {
  return fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'text/html,*/*' } });
}

export async function verifyHealth() {
  const response = await fetchWithTimeout(origin);
  if (!response.ok) throw new Error(`首页健康检查失败：HTTP ${response.status}`);
  const html = await response.text();
  const css = [...html.matchAll(/href=["']([^"']*\/_next\/static\/css\/[^"']+)["']/g)].map((match) => new URL(match[1], origin).href);
  if (!css.length) throw new Error('首页未找到 Next CSS 资源，可能仍在启动或构建产物异常。');
  const cssResponse = await fetchWithTimeout(css[0]);
  const cssText = await cssResponse.text();
  const type = cssResponse.headers.get('content-type') ?? '';
  if (!cssResponse.ok || !type.includes('text/css') || cssText.trim().length === 0) throw new Error(`CSS 健康检查失败：${cssResponse.status} ${type}`);
  const scripts = [...html.matchAll(/src=["']([^"']*\/_next\/static\/[^"']+\.js[^"']*)["']/g)].map((match) => new URL(match[1], origin).href);
  if (!scripts.length) throw new Error('首页未找到 Next JS 资源，可能仍在启动或构建产物异常。');
  const jsResponse = await fetchWithTimeout(scripts[0]);
  const jsText = await jsResponse.text();
  if (!jsResponse.ok || jsText.trim().length === 0) throw new Error(`JS 健康检查失败：${jsResponse.status}`);
  return { homepage: response.status, css: cssResponse.status, cssBytes: Buffer.byteLength(cssText), js: jsResponse.status, jsBytes: Buffer.byteLength(jsText) };
}

async function start() {
  const env = loadLocalEnvironment({ ...process.env, NODE_ENV: 'development' });
  await checkDatabase(env);
  await stopOwnedProcesses();
  mkdirSync(runtimeDir, { recursive: true });
  const log = openSync(logFile, 'a');
  const child = spawn('pnpm', ['exec', 'next', 'dev', '--hostname', 'localhost', '--port', String(port)], {
    cwd: root,
    env,
    detached: true,
    stdio: ['ignore', log, log],
  });
  if (!child.pid) throw new Error('开发服务启动失败：未取得进程 PID。');
  writeFileSync(pidFile, `${child.pid}\n`, { mode: 0o600 });
  child.unref();
  const started = Date.now();
  let lastError = '尚未响应';
  while (Date.now() - started < 20_000) {
    try { const health = await verifyHealth(); console.log(`ChongHub dev ready: ${origin} (CSS ${health.cssBytes} bytes)`); return; } catch (error) { lastError = error instanceof Error ? error.message : String(error); await delay(500); }
  }
  throw new Error(`开发服务启动超时：${lastError}\n日志：${logFile}`);
}

async function status() {
  const infos = listeningPids().map((pid) => classifyProcess(pid));
  if (!infos.length) { console.log(`端口 ${port} 空闲`); return; }
  for (const info of infos) console.log(`PID ${info.pid} ${info.owned ? 'ChongHub' : '外部'} ${info.command} cwd=${info.cwd ?? 'unknown'}`);
}

async function stop() { await stopOwnedProcesses(); console.log(`ChongHub dev 已停止（端口 ${port} 已释放）`); }

async function main() {
  const action = process.argv[2] ?? 'start';
  if (action === 'start') await start();
  else if (action === 'stop') await stop();
  else if (action === 'status') await status();
  else if (action === 'check') console.log(await verifyHealth());
  else { console.error('用法：pnpm dev:local [start|stop|status|check]'); process.exitCode = 2; }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}
