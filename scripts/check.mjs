import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root = process.cwd();
const files = [];
async function walk(dir) {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.local'].includes(e.name) || dir === root && e.name === '历史交付') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p); else files.push(p);
  }
}
await walk(root);
let failed = false;
for (const file of files) {
  if (/\.(mjs|cjs)$/.test(file)) { const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }); if (r.status !== 0) { console.error(r.stderr); failed = true; } }
  const publicIcon = file === path.join(root, 'assets', 'branding', 'icon-source.png');
  const publicScreenshot = ['active-single.png', 'active-total.png', 'complete-total.png'].some(name => file === path.join(root, 'assets', 'screenshots', name));
  if (/\.(asar|jsonl|png|zip)$/.test(file) && !publicIcon && !publicScreenshot && !file.includes(path.join('test', 'fixtures'))) { console.error('Unexpected private/binary artifact:', path.relative(root, file)); failed = true; }
  if (publicIcon || publicScreenshot) continue;
  const text = await fs.readFile(file, 'utf8');
  const privateHome = process.env.USERPROFILE || process.env.HOME;
  if (privateHome && [privateHome, privateHome.replaceAll('\\', '/')].some(p => text.includes(p))) { console.error('Private home path in source:', path.relative(root, file)); failed = true; }
}
if (failed) process.exitCode = 1; else console.log(`Checked ${files.length} project files: syntax and private-artifact boundary passed.`);
