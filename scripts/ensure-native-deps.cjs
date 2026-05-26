#!/usr/bin/env node
/**
 * Cek apakah file native better_sqlite3.node cocok dengan platform saat ini.
 * Jika tidak (mis. habis build Windows lalu mau dev di Linux), jalankan
 * electron-rebuild otomatis.
 *
 * Pakai: `node scripts/ensure-native-deps.cjs`
 *        atau panggil dari npm script `predev`.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const targets = [
  {
    name: 'better-sqlite3',
    file: path.join(
      __dirname,
      '..',
      'node_modules',
      'better-sqlite3',
      'build',
      'Release',
      'better_sqlite3.node',
    ),
  },
];

function readMagic(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf;
  } catch {
    return null;
  }
}

/**
 * Cek apakah binary native cocok dengan platform Node yang berjalan.
 * Linux  = ELF (0x7f 0x45 0x4c 0x46)
 * macOS  = Mach-O (0xcf 0xfa 0xed 0xfe atau 0xfe 0xed 0xfa 0xcf, dst.)
 * Windows= PE (MZ → 0x4d 0x5a)
 */
function nativeMatchesPlatform(magic) {
  if (!magic) return false;
  if (process.platform === 'linux') {
    return magic[0] === 0x7f && magic[1] === 0x45 && magic[2] === 0x4c && magic[3] === 0x46;
  }
  if (process.platform === 'darwin') {
    return (
      (magic[0] === 0xcf && magic[1] === 0xfa) ||
      (magic[0] === 0xfe && magic[1] === 0xed) ||
      (magic[0] === 0xca && magic[1] === 0xfe)
    );
  }
  if (process.platform === 'win32') {
    return magic[0] === 0x4d && magic[1] === 0x5a;
  }
  return true; // platform lain → biarkan
}

let needRebuild = false;
for (const t of targets) {
  if (!fs.existsSync(t.file)) {
    console.log(`[ensure-native] ${t.name}: binary belum ada → akan rebuild`);
    needRebuild = true;
    continue;
  }
  const magic = readMagic(t.file);
  if (!nativeMatchesPlatform(magic)) {
    console.log(
      `[ensure-native] ${t.name}: binary tidak cocok untuk ${process.platform} → akan rebuild`,
    );
    needRebuild = true;
  }
}

if (!needRebuild) {
  console.log('[ensure-native] Native modules sudah cocok untuk', process.platform);
  process.exit(0);
}

console.log('[ensure-native] Menjalankan electron-rebuild …');
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = ['electron-rebuild', '-f', '-w', 'better-sqlite3'];
const res = spawnSync(cmd, args, { stdio: 'inherit' });
process.exit(res.status ?? 0);
