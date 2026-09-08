import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const temp = path.resolve(os.tmpdir());
const relative = path.relative(temp, root);
if (relative.startsWith('..') || path.isAbsolute(relative) || path.basename(root) !== 'cti-tools' ||
    !/^is-[\w]+\.tmp$/i.test(path.basename(path.dirname(root)))) throw Error('Not an installer-owned staging directory');
const stage = path.join(root, '.local');
try {
  if ((await fs.lstat(stage)).isSymbolicLink()) throw Error('Linked staging directory');
  await fs.rm(stage, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
} catch (e) { if (e.code !== 'ENOENT') throw e; }
