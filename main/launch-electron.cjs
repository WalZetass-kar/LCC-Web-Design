const { spawn } = require('node:child_process');

const electronBinary = require('electron');
const env = { ...process.env };
const electronArgs = ['.'];
const isLinux = process.platform === 'linux';
const isRootUser = isLinux && typeof process.getuid === 'function' && process.getuid() === 0;

delete env.ELECTRON_RUN_AS_NODE;

if (isLinux) {
  electronArgs.push(
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage'
  );
}

if (env.ELECTRON_NO_SANDBOX === 'false') {
  const sandboxFlags = new Set(['--no-sandbox', '--disable-setuid-sandbox']);
  const filteredArgs = electronArgs.filter((arg) => !sandboxFlags.has(arg));
  electronArgs.length = 0;
  electronArgs.push(...filteredArgs);
}

if (isRootUser) {
  console.warn('[Electron Launcher] Root user detected on Linux. Running Electron as a normal user is strongly recommended.');
  console.warn('[Electron Launcher] Continuing with no-sandbox flags to avoid Chromium sandbox startup failures.');
}

const child = spawn(electronBinary, electronArgs, {
  stdio: 'inherit',
  env
});

child.on('error', (error) => {
  console.error('[Electron Launcher] Failed to start Electron:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
