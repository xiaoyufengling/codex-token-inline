import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Ledger } from './ledger.mjs';
export const validId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id);

export class Collector {
  constructor(home = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')) {
    this.home = home; this.states = new Map(); this.index = new Map(); this.indexedAt = 0; this.pending = new Map();
  }
  async reindex() {
    if (Date.now() - this.indexedAt < 5000) return;
    const index = new Map();
    const walk = async dir => {
      let entries; try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
      for (const ent of entries) {
        const file = path.join(dir, ent.name);
        if (ent.isDirectory()) await walk(file);
        else if (ent.isFile() && ent.name.endsWith('.jsonl')) {
          const match = ent.name.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i);
          if (match) { const list = index.get(match[1]) || []; list.push(file); index.set(match[1], list); }
        }
      }
    };
    await walk(path.join(this.home, 'sessions')); await walk(path.join(this.home, 'archived_sessions'));
    this.index = index; this.indexedAt = Date.now();
  }
  async readThread(threadId) {
    if (!validId(threadId)) throw new Error('Invalid thread ID');
    if (this.pending.has(threadId)) return this.pending.get(threadId);
    const promise = this.readInternal(threadId).finally(() => this.pending.delete(threadId));
    this.pending.set(threadId, promise); return promise;
  }
  async readInternal(threadId) {
    await this.reindex();
    const combined = new Ledger(threadId);
    const files = this.index.get(threadId) || [];
    for (const file of files) {
      let stat; try { stat = await fs.stat(file); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
      let state = this.states.get(file);
      if (!state || stat.size < state.offset || (stat.size === state.offset && stat.mtimeMs !== state.mtime)) {
        state = { ledger: new Ledger(threadId), offset: 0, mtime: 0, pending: Buffer.alloc(0) };
        this.states.set(file, state);
      }
      if (stat.size > state.offset) {
        const handle = await fs.open(file, 'r');
        try {
          const chunk = Buffer.alloc(256 * 1024);
          while (state.offset < stat.size) {
            const { bytesRead } = await handle.read(chunk, 0, Math.min(chunk.length, stat.size - state.offset), state.offset);
            if (!bytesRead) break;
            state.offset += bytesRead;
            let data = Buffer.concat([state.pending, chunk.subarray(0, bytesRead)]), start = 0, end;
            while ((end = data.indexOf(10, start)) !== -1) {
              const line = data.subarray(start, end).toString('utf8'); start = end + 1;
              if (!line.trim()) continue;
              try { state.ledger.accept(JSON.parse(line)); } catch { state.ledger.unknownLines++; }
            }
            state.pending = Buffer.from(data.subarray(start));
            // Bound malformed/oversized lines rather than retaining arbitrary transcript payloads forever.
            if (state.pending.length > 32 * 1024 * 1024) throw new Error('Log line exceeds supported size');
          }
        } finally { await handle.close(); }
      }
      state.mtime = stat.mtimeMs;
      for (const [id, r] of state.ledger.responses) combined.responses.set(id, r);
      for (const [id, r] of state.ledger.legacy) combined.legacy.set(id, r);
      for (const [id, r] of state.ledger.messages) combined.messages.set(id, r);
      for (const [id, r] of state.ledger.turns) {
        const prior = combined.turns.get(id);
        combined.turns.set(id, { ...r,
          startedAt: prior?.startedAt == null ? r.startedAt : r.startedAt == null ? prior.startedAt : Math.min(prior.startedAt, r.startedAt),
          completedAt: Math.max(prior?.completedAt ?? 0, r.completedAt ?? 0) || null });
      }
      combined.unknownLines += state.ledger.unknownLines;
    }
    // Bound cache for users switching between many tasks. Read positions are safe to recreate.
    if (this.states.size > 32) for (const key of [...this.states.keys()]) { if (!files.includes(key)) this.states.delete(key); if (this.states.size <= 32) break; }
    return combined;
  }
}
