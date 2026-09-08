import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { assetFor, bridgeSource } from '../src/native-assets.mjs';
import { Cdp } from '../src/cdp.mjs';

test('runtime resource substitution is confined to known app assets and host', () => {
  const assets = new Map([['/assets/test.js', 'replacement']]);
  assert.equal(assetFor(assets, 'app://-/assets/test.js?v=1', 'app://-/index.html'), 'replacement');
  for (const url of ['https://-/assets/test.js','app://other/assets/test.js','app://-/assets/other.js','bad']) {
    assert.equal(assetFor(assets, url, 'app://-/index.html'), null);
  }
});
test('page bridge handles independent results and errors without leaking pending requests', async () => {
  const sent = [];
  const context = vm.createContext({setTimeout,clearTimeout,__ctiRequest:value => sent.push(JSON.parse(value))});
  vm.runInContext(bridgeSource, context);
  const a = context.codexTokenInline.snapshot({threadId:'first'});
  const b = context.codexTokenInline.snapshot({threadId:'second'});
  context.__ctiDeliver(sent[1].id, {total:50}, null);
  context.__ctiDeliver(sent[0].id, null, 'offline');
  await assert.rejects(a, /offline/);
  assert.equal((await b).total, 50);
  context.__ctiDeliver(sent[1].id, {total:999}, null);
  assert.equal((await b).total, 50);
});
test('CDP disconnect rejects pending requests and error responses reject commands', async () => {
  class Socket extends EventTarget { send(value) { this.last = JSON.parse(value); } close() { this.dispatchEvent(new Event('close')); } }
  const socket = new Socket(), cdp = new Cdp(socket);
  const failure = cdp.send('Fetch.enable');
  socket.dispatchEvent(new MessageEvent('message', {data:JSON.stringify({id:socket.last.id,error:{message:'unavailable'}})}));
  await assert.rejects(failure, /unavailable/);
  const pending = cdp.send('Page.enable'); socket.close();
  await assert.rejects(pending, /disconnected/);
  assert.equal(cdp.pending.size, 0);
});
test('CDP refuses non-loopback and wrong-port targets before connecting', async () => {
  await assert.rejects(Cdp.connect('ws://example.com:9335/devtools/page/a',9335), /Non-loopback/);
  await assert.rejects(Cdp.connect('ws://127.0.0.1:9336/devtools/page/a',9335), /Non-loopback/);
});
