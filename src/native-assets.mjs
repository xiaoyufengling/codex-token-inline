import fs from 'node:fs/promises';
import { Asar } from './asar.mjs';
import { inspect, defaultProfile, wrapActionFunction, enableLiveFooter, enableThinkingCounter } from './patch.mjs';
import { styles, installStyles } from './badge.mjs';

export async function nativeDomSource(archivePath) {
  const report = await inspect(archivePath);
  if (!report.matched) throw new Error('Unsupported Codex version; original application unchanged.');
  const usage = (await fs.readFile(new URL('./usage.mjs',import.meta.url),'utf8')).replace(/^export /gm,'');
  const dom = (await fs.readFile(new URL('./dom-badges.mjs',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
  return {report,source:`(() => {globalThis.__ctiAdapterName=${JSON.stringify(report.domComponent)};${usage}\nconst styles=${JSON.stringify(styles)};\n${installStyles.toString()}\n${dom}\nmountDomBadges();return true;})()`};
}

// Only renderer responses are substituted in memory. The installed archive and
// executable are never written; existing accounting/UI code remains shared.
export async function nativeAssets(archivePath) {
  const report = await inspect(archivePath, defaultProfile);
  if (!report.matched) throw new Error('Unsupported Codex version. Original installation was not changed.');
  const profile = JSON.parse(await fs.readFile(defaultProfile, 'utf8'));
  const archive = await Asar.open(archivePath);
  try {
    const assets = new Map();
    const renderer = (await archive.read(profile.files.renderer.path)).toString();
    const thinking = (await archive.read(profile.files.thinking.path)).toString();
    assets.set('/' + profile.files.renderer.path.replace(/^webview\//, ''), enableLiveFooter(wrapActionFunction(renderer, profile)));
    assets.set('/' + profile.files.thinking.path.replace(/^webview\//, ''), enableThinkingCounter(thinking));
    for (const name of ['badge', 'usage']) assets.set(`/assets/cti/${name}.mjs`, await fs.readFile(new URL(`./${name}.mjs`, import.meta.url), 'utf8'));
    return { assets, report };
  } finally { await archive.close(); }
}

export function assetFor(assets, address, origin) {
  try {
    const url = new URL(address), expected = new URL(origin);
    if (url.protocol !== 'app:' || url.host !== expected.host) return null;
    return assets.get(url.pathname) ?? null;
  } catch { return null; }
}

export const bridgeSource = `(() => {
  if (globalThis.codexTokenInline) return;
  let serial = 0;
  const waiting = new Map();
  globalThis.__ctiDeliver = (id, value, error) => {
    const entry = waiting.get(id); if (!entry) return;
    waiting.delete(id); clearTimeout(entry.timer);
    if (error) entry.reject(new Error(error)); else entry.resolve(value);
  };
  globalThis.codexTokenInline = Object.freeze({snapshot(args) {
    return new Promise((resolve, reject) => {
      if (waiting.size >= 64) { reject(new Error('Too many pending snapshots')); return; }
      const id = ++serial;
      const timer = setTimeout(() => { waiting.delete(id); reject(new Error('Usage helper unavailable')); }, 8000);
      waiting.set(id, {resolve, reject, timer});
      try { globalThis.__ctiRequest(JSON.stringify({id, args})); }
      catch (error) { clearTimeout(timer); waiting.delete(id); reject(error); }
    });
  }});
})();`;
