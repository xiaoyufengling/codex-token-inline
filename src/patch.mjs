import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Asar, writePatchedArchive } from './asar.mjs';
export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const defaultProfile = new URL('../adapters/desktop/profiles/26.901.6511.0.json', import.meta.url);
export async function inspect(archivePath, profilePath = defaultProfile) {
  const profile = JSON.parse(await fs.readFile(profilePath, 'utf8'));
  const archive = await Asar.open(archivePath);
  try {
    const manifest = JSON.parse((await archive.read('package.json')).toString());
    const files = [];
    for (const [role, spec] of Object.entries(profile.files)) {
      let actual = null; try { actual = await archive.fingerprint(spec.path); } catch {}
      files.push({ role, path: spec.path, match: actual === spec.sha256, expected: spec.sha256, actual });
    }
    return { profile: profile.id, appVersion: manifest.version, matched: manifest.version === profile.appVersion && files.every(f => f.match),
      runtimeVerified: false, files };
  } finally { await archive.close(); }
}
export function wrapActionFunction(source, { actionFunction, reactBinding }) {
  if (!/^[\w$]+$/.test(actionFunction) || !/^[\w$]+$/.test(reactBinding)) throw new Error('Invalid adapter symbols');
  const needle = `function ${actionFunction}(e){`;
  if (source.split(needle).length !== 2 || source.includes('__ctiOriginal')) throw new Error('Adapter anchor mismatch');
  return `import {decorateActions as __ctiDecorate} from './cti/badge.mjs';\n` + source.replace(needle,
    `function ${actionFunction}(e){return __ctiDecorate(__ctiOriginal(e),e,${reactBinding})}function __ctiOriginal(e){`);
}
export function enableLiveFooter(source) {
  const turn = 'turnId:U?o:void 0,copyText:U&&ve?ge:void 0';
  const ending = 'persistentAdditionalActions:I}):null]}),t[156]=F';
  if (source.split(turn).length !== 2 || source.split(ending).length !== 2) throw new Error('Live footer anchor mismatch');
  return source.replace(turn, 'turnId:o,ctiMessageId:n.searchItemId??n.responseAnnotationTargetId,copyText:U&&ve?ge:void 0')
    .replace(ending, 'persistentAdditionalActions:I}):__ctiDecorate(null,{threadId:p,turnId:o,ctiMessageId:n.searchItemId??n.responseAnnotationTargetId,sentAtMs:n.sentAtMs},Jy)]}),t[156]=F');
}
export function enableThinkingCounter(source) {
  const call = 'Li,{clientUserMessageId:A,isVisible:oa,icon:di,message:pi}';
  const definition = 'function Li(e){';
  if (source.split(call).length !== 2 || source.split(definition).length !== 2) throw new Error('Thinking placeholder anchor mismatch');
  return "import {decorateThinking as __ctiThinking} from './cti/badge.mjs';\n" + source
    .replace(call, 'Li,{clientUserMessageId:A,isVisible:oa,icon:di,message:pi,threadId:c,turnId:X}')
    .replace(definition, 'function Li(e){return __ctiThinking(__ctiThinkingOriginal(e),e,Ui)}function __ctiThinkingOriginal(e){');
}
export async function prepare(archivePath, output, profilePath = defaultProfile) {
  const local = path.resolve(projectRoot, '.local'), target = path.resolve(output);
  if (!target.startsWith(local + path.sep)) throw new Error('Prepared archives must remain in the ignored project .local directory');
  const report = await inspect(archivePath, profilePath);
  if (!report.matched) throw new Error('Unsupported desktop build; no patch generated');
  const profile = JSON.parse(await fs.readFile(profilePath, 'utf8'));
  const archive = await Asar.open(archivePath);
  try {
    const edits = new Map();
    const main = (await archive.read(profile.files.main.path)).toString();
    edits.set(profile.files.main.path, Buffer.from(main + '\n;require("./cti-host.cjs");\n'));
    edits.set(profile.files.preload.path, Buffer.concat([await archive.read(profile.files.preload.path), Buffer.from('\n'),
      await fs.readFile(new URL('../adapters/desktop/preload.cjs', import.meta.url))]));
    edits.set(profile.files.renderer.path, Buffer.from(enableLiveFooter(wrapActionFunction((await archive.read(profile.files.renderer.path)).toString(), profile))));
    edits.set(profile.files.thinking.path, Buffer.from(enableThinkingCounter((await archive.read(profile.files.thinking.path)).toString())));
    edits.set('.vite/build/cti-host.cjs', await fs.readFile(new URL('../adapters/desktop/host.cjs', import.meta.url)));
    for (const name of ['usage', 'ledger', 'collector', 'objective', 'store', 'service']) edits.set(`.vite/build/cti/${name}.mjs`, await fs.readFile(new URL(`./${name}.mjs`, import.meta.url)));
    for (const name of ['usage', 'badge']) edits.set(`webview/assets/cti/${name}.mjs`, await fs.readFile(new URL(`./${name}.mjs`, import.meta.url)));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await writePatchedArchive(archive, target, edits);
    const patched = await Asar.open(target);
    try { for (const [name, bytes] of edits) if (!(await patched.read(name)).equals(bytes)) throw new Error('Prepared archive verification failed'); }
    finally { await patched.close(); }
    const result = { ...report, installed: false, prepared: true, changedEntries: [...edits.keys()],
      note: 'Offline artifact only. Client startup, packaged integrity, streaming placement and native lifecycle integration are not yet verified.' };
    await fs.writeFile(target + '.report.json', JSON.stringify(result, null, 2)); return result;
  } finally { await archive.close(); }
}
