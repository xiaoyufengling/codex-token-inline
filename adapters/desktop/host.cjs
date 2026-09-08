/* This file is loaded only in an explicitly prepared experimental desktop build. */
(() => {
  const { ipcMain, app } = require('electron');
  const { pathToFileURL } = require('node:url');
  const path = require('node:path');
  const fs = require('node:fs');
  const diagnosticPath = process.env.CTI_DIAGNOSTIC_PATH;
  const diagnostic = (kind, details = {}) => {
    if (diagnosticPath) try {
      if (fs.existsSync(diagnosticPath) && fs.statSync(diagnosticPath).size > 2 * 1024 * 1024) return;
      fs.appendFileSync(diagnosticPath, JSON.stringify({ at: Date.now(), kind, ...details }) + '\n');
    } catch {}
  };
  diagnostic('host-loaded');
  app.on('web-contents-created', (_event, contents) => {
    contents.on('did-finish-load', () => diagnostic('page-loaded', { protocol: new URL(contents.getURL()).protocol }));
    contents.on('render-process-gone', (_e, details) => diagnostic('renderer-exit', { reason: details.reason }));
  });
  const channel = 'codex-token-inline:snapshot:v1';
  const service = import(pathToFileURL(path.join(__dirname, 'cti/service.mjs')).href)
    .then(({ UsageService }) => new UsageService());
  service.catch(error => diagnostic('service-error', { message: String(error.message).slice(0,200) }));
  const pending = new Map();
  ipcMain.handle('codex-token-inline:diagnostic:v1', (event, payload) => {
    if (event.senderFrame !== event.sender.mainFrame || new URL(event.senderFrame.url).protocol !== 'app:') throw new Error('Unsupported frame');
    if (!diagnosticPath || payload?.kind !== 'badge-layout') return;
    const record = { hidden: payload.hidden === true, thinking: payload.thinking === true };
    if (['active','complete'].includes(payload.status)) record.status = payload.status;
    if (typeof payload.color === 'string' && payload.color.length < 80 && /^(rgb|rgba|oklch|color|#)/.test(payload.color)) record.color = payload.color;
    for (const key of ['x','y','width','height','viewportHeight']) if (Number.isFinite(payload[key])) record[key] = payload[key];
    diagnostic('badge-layout', record);
  });
  ipcMain.handle(channel, async (event, payload) => {
    // Only the packaged app's top frame. No sandbox frames, browser pages, or arbitrary file paths.
    if (event.senderFrame !== event.sender.mainFrame) throw new Error('Unsupported frame');
    const url = new URL(event.senderFrame.url);
    if (url.protocol !== 'app:') { diagnostic('origin-rejected', { protocol: url.protocol }); throw new Error('Unsupported origin'); }
    if (!payload || Object.keys(payload).some(k => !['threadId', 'turnId', 'messageId', 'sentAtMs'].includes(k))) throw new Error('Invalid request');
    const key = JSON.stringify([payload.threadId,payload.turnId,payload.messageId,payload.sentAtMs]);
    if (pending.has(key)) return pending.get(key);
    const promise = service.then(s => s.snapshot(payload)).then(snapshot => {
      diagnostic('badge-snapshot', { hasData: snapshot.hasData, total: snapshot.usage?.total, status: snapshot.status,
        segment: snapshot.segmentUsage?.total, scope: snapshot.scope, turnId: payload.turnId,
        frozen: snapshot.frozen, hasMessageId: !!payload.messageId, sentAtMs: payload.sentAtMs });
      return { ...snapshot, diagnosticEnabled: !!diagnosticPath };
    }).catch(error => { diagnostic('snapshot-error', { message: String(error.message).slice(0,200) }); throw new Error('Local usage unavailable'); });
    pending.set(key, promise);
    // Shared polling across several mounted historical message footers.
    setTimeout(() => pending.delete(key), 200).unref();
    return promise;
  });
})();
