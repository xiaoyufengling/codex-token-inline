#!/usr/bin/env node
import path from 'node:path';
import { inspect, prepare, projectRoot } from '../src/patch.mjs';
import { UsageService } from '../src/service.mjs';
import { defaultStore, updateStore, begin, finish } from '../src/store.mjs';
const [command, sub, ...rest] = process.argv.slice(2);
const words = command === 'objective' ? rest : [sub, ...rest].filter(Boolean);
const args = {};
for (let i = 0; i < words.length; i += 2) {
  if (!words[i].startsWith('--') || !words[i + 1] || words[i + 1].startsWith('--')) { console.error('Options must be --name value pairs'); process.exit(1); }
  args[words[i].slice(2)] = words[i + 1];
}
try {
  let result;
  if (command === 'inspect') {
    if (!args.archive) throw new Error('Pass --archive path/to/app.asar');
    result = await inspect(args.archive, args.profile);
  } else if (command === 'prepare') {
    if (!args.archive) throw new Error('Pass --archive path/to/app.asar');
    result = await prepare(args.archive, args.output || path.join(projectRoot, '.local', 'app.patched.asar'), args.profile);
  } else if (command === 'snapshot') {
    result = await new UsageService({ home: args.home, store: args.store }).snapshot({ threadId: args.thread, turnId: args.turn });
  } else if (command === 'objective') {
    const file = args.store || defaultStore();
    if (sub === 'start') result = await updateStore(file, data => begin(data, { threadId: args.thread, id: args.id,
      startedAt: args.from === 'beginning' ? 0 : Date.now() }));
    else if (sub === 'complete') result = await updateStore(file, data => finish(data, { id: args.id, at: Date.now() }));
    else throw new Error('Use objective start or objective complete');
  } else {
    console.log('codex-token-inline (experimental)\n\ninspect --archive PATH\nprepare --archive PATH\nsnapshot --thread UUID [--home PATH]\nobjective start --thread UUID --id NAME [--from beginning]\nobjective complete --id NAME\n\nprepare writes only an ignored offline copy. No install command is provided.');
    process.exit(0);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) { console.error(e.message); process.exitCode = 1; }
