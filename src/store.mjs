import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createObjective, completeObjective } from './objective.mjs';
export const defaultStore = () => path.join(os.homedir(), '.codex-token-inline', 'objectives.json');
export async function readStore(file = defaultStore()) {
  try { const data = JSON.parse(await fs.readFile(file, 'utf8')); if (data.version !== 1 || !Array.isArray(data.objectives)) throw new Error('Unsupported objective store'); return data; }
  catch (e) { if (e.code === 'ENOENT') return { version: 1, objectives: [] }; throw e; }
}
export async function updateStore(file, action) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  // A lock prevents two CLI writers from losing each other's lifecycle change.
  const lockPath = `${file}.lock`; const lock = await fs.open(lockPath, 'wx');
  try {
    const data = await readStore(file); const result = action(data);
    const temp = `${file}.${crypto.randomUUID()}.tmp`;
    try { await fs.writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 }); await fs.rename(temp, file); }
    finally { await fs.rm(temp, { force: true }); }
    return result;
  } finally { await lock.close(); await fs.rm(lockPath, { force: true }); }
}
export function begin(data, { threadId, id, startedAt }) {
  if (data.objectives.some(o => o.id === id || (o.threadId === threadId && o.status === 'active'))) throw new Error('An objective already exists or is still active');
  const objective = createObjective({ id, threadId, startedAt }); data.objectives.push(objective); return objective;
}
export function finish(data, { id, at }) {
  const index = data.objectives.findIndex(o => o.id === id); if (index < 0) throw new Error('Unknown objective');
  const objective = completeObjective(data.objectives[index], { at, evidence: 'explicit-user' });
  data.objectives[index] = objective; return objective;
}
export function selectObjective(data, threadId, time = Date.now()) {
  return data.objectives.filter(o => o.threadId === threadId && o.startedAt <= time)
    .sort((a, b) => b.startedAt - a.startedAt)[0] || createObjective({ id: threadId, threadId });
}
