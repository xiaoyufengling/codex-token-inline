import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {packHeader} from '../src/asar.mjs';
import {inspectStructure,hasMessageContract} from '../src/compatibility.mjs';
import {verifiedAnchor,UsageService} from '../src/service.mjs';
import {Ledger} from '../src/ledger.mjs';
import {resolveTargets} from '../src/dom-badges.mjs';
import {JSDOM} from 'jsdom';
test('toolbar CSS class changes do not gate structural startup',()=>{
 assert.equal(hasMessageContract('conversationId turnId sentAtMs responseAnnotationTargetId entirely-new-toolbar'),true);
});

test('unknown version and renamed bundle pass structure checks; missing contract fails',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-structure-'));
 try{
  for(const present of [true,false]){
   const manifest=Buffer.from(JSON.stringify({version:'99.999.12345'}));
   const bundle=Buffer.from(present?'function RandomName(props){return {conversationId:props.conversationId,turnId:props.turnId,sentAtMs:props.item.sentAtMs,responseAnnotationTargetId:props.item.id,className:"turn-action-controls"}}':'unrelated program');
   const header={files:{'package.json':{offset:'0',size:manifest.length},webview:{files:{newFolder:{files:{'completely-new-name.js':{offset:String(manifest.length),size:bundle.length}}}}}}};
   const file=path.join(dir,'fixture.asar');await fs.writeFile(file,Buffer.concat([packHeader(header),manifest,bundle]));
   assert.equal((await inspectStructure(file)).matched,present);
  }
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
function ledger(){
 const l=new Ledger('thread');l.turns.set('run',{id:'run',startedAt:100,completedAt:null});
 l.messages.set('a',{id:'a',turnId:'run',time:200});l.messages.set('b',{id:'b',turnId:'run',time:300});return l;
}
test('only unambiguous assistant records can verify live anchors',()=>{
 const l=ledger();
 assert.equal(verifiedAnchor(l,{turnId:'run',messageId:'a',sentAtMs:200}).messageId,'a');
 assert.equal(verifiedAnchor(l,{messageId:'native-a',sentAtMs:200}).turnId,'run');
 assert.equal(verifiedAnchor(l,{turnId:'run',messageId:'native-wrapper-a',sentAtMs:200}).messageId,'a');
 for(const a of [{turnId:'different',messageId:'a',sentAtMs:200},{turnId:'run',messageId:'a',sentAtMs:300},{turnId:'run',messageId:'user-message',sentAtMs:250}])assert.equal(verifiedAnchor(l,a),null);
 l.messages.set('duplicate',{id:'duplicate',turnId:'run',time:200});
 assert.equal(verifiedAnchor(l,{turnId:'run',messageId:'native-wrapper',sentAtMs:200}),null);
});
test('rejected candidate cannot alter cached segment boundaries',async()=>{
 const service=new UsageService({store:path.join(os.tmpdir(),'cti-no-goal-for-structural-test.json')});
 service.collector={readThread:async()=>ledger()};
 const r=await service.snapshot({threadId:'thread',turnId:'run',messageId:'unrecorded',sentAtMs:250,requireEvidence:true});
 assert.equal(r.anchorValid,false);assert.equal(service.cache.size,0);
});
test('parent wrappers and conflicting hosts do not receive guessed counters',()=>{
 const dom=new JSDOM('<div id="parent"><div id="a"></div><div id="b"></div></div>');
 const host=id=>dom.window.document.getElementById(id);
 const result=resolveTargets([{key:'wrapper',host:host('parent')},{key:'a',host:host('a')},{key:'b',host:host('b')}]);
 assert.deepEqual(result.map(x=>x.key),['a','b']);
 assert.equal(resolveTargets([{key:'a',host:host('a')},{key:'b',host:host('a')}]).length,0);
 assert.equal(resolveTargets([{key:'a',host:host('a')},{key:'a',host:host('b')}]).length,0);
 dom.window.close();
});
