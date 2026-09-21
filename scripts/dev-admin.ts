import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, unlinkSync, openSync, writeFileSync } from 'node:fs';
import { loadLocalEnvironment } from './local-dev';
import { checkService } from './healthcheck-service';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = resolve(import.meta.dirname, '..');
const runtimeDir = resolve(root, 'var');
const pidFile = resolve(runtimeDir, 'admin-dev.pid');
const logFile = resolve(runtimeDir, 'admin-dev.log');
const port = 3001;
const origin = `http://localhost:${port}`;

function commandFor(pid: number) { try { return execFileSync('ps', ['-p', String(pid), '-o', 'command='], { encoding: 'utf8' }).trim(); } catch { return ''; } }
function cwdFor(pid: number): string | null { try { const out = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], { encoding: 'utf8' }); const line = out.split(/\r?\n/).find((v) => v.startsWith('n')); return line?.slice(1) ?? null; } catch { return null; } }
function owned(pid: number) {
  const command = commandFor(pid);
  const cwd = cwdFor(pid);
  const launcher = /(?:^|\/)(?:next|pnpm|npm|yarn)(?:\s|$)/.test(command) && /(?:^|\s)dev(?:\s|$)/.test(command);
  const child = /(?:^|\/)next-server(?:\s|$)/.test(command);
  const cwdOwned = cwd === resolve(root, 'apps/admin') || cwd === root;
  const adminCommand = /@chonghub\/admin|apps\/admin/.test(command);
  return (launcher || child) && cwdOwned && (cwd === resolve(root, 'apps/admin') || adminCommand);
}
function pids() { try { const out = execFileSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fp'], { encoding: 'utf8' }); return [...new Set(out.split(/\r?\n/).filter((v) => v.startsWith('p')).map((v) => Number(v.slice(1))).filter(Number.isInteger))]; } catch { return []; } }
async function free(timeout = 3000) { const start = Date.now(); while (pids().length && Date.now() - start < timeout) await delay(100); return pids().length === 0; }
async function stopOwned() {
  const listeners = pids();
  for (const pid of listeners) { if (!owned(pid)) throw new Error(`端口 ${port} 被无法证明属于本 checkout 的进程占用（PID ${pid}），未终止。`); process.kill(pid, 'SIGTERM'); }
  if (listeners.length && !await free()) throw new Error(`admin 服务未能在端口 ${port} 退出。`);
  if (existsSync(pidFile)) unlinkSync(pidFile);
}
async function check() { return checkService('admin'); }
async function start() {
  await stopOwned(); mkdirSync(runtimeDir, { recursive: true });
  const log = openSync(logFile, 'a');
  const env = loadLocalEnvironment({ ...process.env, NODE_ENV: 'development', PORT: String(port) });
  env.ADMIN_ORIGIN ??= origin;
  const child = spawn('pnpm', ['--filter', '@chonghub/admin', 'dev'], { cwd: root, env, detached: true, stdio: ['ignore', log, log] });
  if (!child.pid) throw new Error('admin 服务启动失败：未取得 PID');
  writeFileSync(pidFile, `${child.pid}\n`, { mode: 0o600 }); child.unref();
  const started = Date.now(); let last = '尚未响应';
  while (Date.now() - started < 20000) { try { await check(); console.log(`ChongHub admin ready: ${origin}`); return; } catch (e) { last = e instanceof Error ? e.message : String(e); await delay(500); } }
  throw new Error(`admin 服务启动超时：${last}\n日志：${logFile}`);
}
async function status() { const listeners = pids(); if (!listeners.length) return console.log(`端口 ${port} 空闲`); for (const pid of listeners) console.log(`PID ${pid} ${owned(pid) ? 'ChongHub' : '外部'} ${commandFor(pid)} cwd=${cwdFor(pid) ?? 'unknown'}`); }
async function main() { const action = process.argv[2] ?? 'start'; if (action === 'start') await start(); else if (action === 'stop') { await stopOwned(); console.log(`ChongHub admin 已停止（端口 ${port} 已释放）`); } else if (action === 'status') await status(); else if (action === 'check') console.log(await check()); else { console.error('用法：pnpm dev:admin [start|stop|status|check]'); process.exitCode = 2; } }
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; });
