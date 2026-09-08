import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepare, inspect } from '../src/patch.mjs';
import { Asar } from '../src/asar.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const [source, resultFile] = process.argv.slice(2);
async function hashHeader(file) {
  const archive = await Asar.open(file);
  try {
    const prefix = Buffer.alloc(16);
    await archive.handle.read(prefix, 0, 16, 0);
    const header = Buffer.alloc(prefix.readUInt32LE(12));
    await archive.handle.read(header, 0, header.length, 16);
    return crypto.createHash('sha256').update(header).digest('hex');
  } finally { await archive.close(); }
}
try {
  if (!source || !path.isAbsolute(source)) throw Error('Codex installation path is missing.');
  const original = path.join(source, 'resources/app.asar');
  if (!(await inspect(original)).matched) throw Error('This Codex version is not supported. Your original installation has not been changed.');
  const stage = path.join(root, '.local/desktop');
  const patched = path.join(root, '.local/app.asar');
  await prepare(original, patched);
  const executable = await fs.readFile(path.join(source, 'ChatGPT.exe'));
  const before = Buffer.from(await hashHeader(original));
  const offset = executable.indexOf(before);
  if (offset < 0 || executable.indexOf(before, offset + 1) !== -1) throw Error('Client integrity record does not match.');
  Buffer.from(await hashHeader(patched)).copy(executable, offset);
  // Copy only the installed program. Never copy user profiles or session data.
  await fs.cp(source, stage, { recursive: true, filter: async p => {
    if ((await fs.lstat(p)).isSymbolicLink()) throw Error('Unexpected link in the Codex installation.');
    return !['app.asar', 'ChatGPT.exe'].includes(path.basename(p));
  } });
  await fs.copyFile(patched, path.join(stage, 'resources/app.asar'));
  await fs.writeFile(path.join(stage, 'ChatGPT.exe'), executable);
  await fs.writeFile(resultFile, 'OK');
} catch (error) {
  await fs.writeFile(resultFile, String(error.message));
  process.exitCode = 1;
}
