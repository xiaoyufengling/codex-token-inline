import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export class Asar {
  static async open(file) {
    const handle = await fs.open(file, 'r');
    try {
      const preamble = Buffer.alloc(16); await handle.read(preamble, 0, 16, 0);
      if (preamble.readUInt32LE(0) !== 4) throw new Error('Unsupported ASAR preamble');
      const length = preamble.readUInt32LE(12), base = 8 + preamble.readUInt32LE(4);
      if (length > 64 * 1024 * 1024 || base < 16 + length || base > 16 + length + 3) throw new Error('Invalid ASAR header');
      const bytes = Buffer.alloc(length); await handle.read(bytes, 0, length, 16);
      return new Asar(file, handle, JSON.parse(bytes.toString()), base, (await handle.stat()).size);
    } catch (e) { await handle.close(); throw e; }
  }
  constructor(file, handle, header, base, size) { Object.assign(this, { file, handle, header, base, size }); }
  entry(name) {
    let node = this.header;
    for (const key of name.split('/')) { if (!key || key === '..') throw new Error('Invalid archive path'); node = node?.files?.[key]; }
    if (!node || node.unpacked || node.link || !Number.isSafeInteger(node.size) || node.size < 0) throw new Error(`Unsupported archive entry: ${name}`);
    return node;
  }
  async read(name) {
    const node = this.entry(name), offset = this.base + Number(node.offset);
    if (!Number.isSafeInteger(offset) || offset < this.base || offset + node.size > this.size || node.size > 100 * 1024 * 1024) throw new Error('Invalid archive entry bounds');
    const bytes = Buffer.alloc(node.size); const r = await this.handle.read(bytes, 0, bytes.length, offset);
    if (r.bytesRead !== bytes.length) throw new Error('Incomplete archive read'); return bytes;
  }
  async fingerprint(name) { return sha256(await this.read(name)); }
  async close() { await this.handle.close(); }
}
export function packHeader(header) {
  const json = Buffer.from(JSON.stringify(header)), aligned = Math.ceil((4 + json.length) / 4) * 4;
  const out = Buffer.alloc(12 + aligned); out.writeUInt32LE(4, 0); out.writeUInt32LE(4 + aligned, 4);
  out.writeUInt32LE(aligned, 8); out.writeUInt32LE(json.length, 12); json.copy(out, 16); return out;
}
export async function writePatchedArchive(archive, output, edits) {
  const header = structuredClone(archive.header); let offset = archive.size - archive.base;
  for (const [name, bytes] of edits) {
    const parts = name.split('/'); if (parts.some(p => !p || p === '..')) throw new Error('Invalid edit path');
    let node = header;
    for (const part of parts.slice(0, -1)) { node.files ??= {}; node.files[part] ??= { files: {} }; node = node.files[part]; }
    const blockSize = 4 * 1024 * 1024, blocks = [];
    for (let i = 0; i < bytes.length; i += blockSize) blocks.push(sha256(bytes.subarray(i, i + blockSize)));
    node.files ??= {}; node.files[parts.at(-1)] = { size: bytes.length, offset: String(offset),
      integrity: { algorithm: 'SHA256', hash: sha256(bytes), blockSize, blocks } }; offset += bytes.length;
  }
  const target = await fs.open(output, 'wx');
  try {
    await target.write(packHeader(header));
    const buffer = Buffer.alloc(1024 * 1024);
    for (let position = archive.base; position < archive.size;) {
      const { bytesRead } = await archive.handle.read(buffer, 0, Math.min(buffer.length, archive.size - position), position);
      if (!bytesRead) throw new Error('Incomplete source archive'); await target.write(buffer.subarray(0, bytesRead)); position += bytesRead;
    }
    for (const bytes of edits.values()) await target.write(bytes);
  } finally { await target.close(); }
}
