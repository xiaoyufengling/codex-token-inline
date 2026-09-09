import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {mountDomBadges,messageAnchor} from '../src/dom-badges.mjs';

for (const componentName of ['Oy','eb','FutureRenamedComponent']) test(`passive adapter ${componentName} preserves content and maps distinct segment anchors`,async()=>{
  const dom=new JSDOM('<div id="root"><div id="first">native first</div><div id="second">native second</div></div>');
  const doc=dom.window.document;
  function Oy(){}
  Object.defineProperty(Oy,'name',{value:componentName});
  dom.window.__ctiAdapterName=componentName;
  const first={type:Oy,memoizedProps:{conversationId:'thread-a',turnId:'run-a',item:{sentAtMs:100,searchItemId:'m-a'}},child:{stateNode:doc.getElementById('first')}};
  const second={type:Oy,memoizedProps:{conversationId:'thread-a',turnId:'run-a',item:{sentAtMs:200,searchItemId:'m-b'}},child:{stateNode:doc.getElementById('second')}};
  first.sibling=second;
  doc.getElementById('root').__reactContainer$test={stateNode:{current:{child:first}}};
  const requests=[];
  const state=mountDomBadges(doc,{async snapshot(anchor){
    requests.push(anchor);
    const first=anchor.messageId==='m-a',segment={total:first?100:50,input:first?80:40,output:first?20:10,cached:20};
    return {anchorValid:true,usage:{total:first?100:150},segmentUsage:segment,hasData:true,hasPriorSegments:!first,status:first?'complete':'active',frozen:first};
  }});
  try{
    await new Promise(resolve=>setTimeout(resolve,10));
    assert.equal(state.delivered,2);
    assert.deepEqual(requests.map(x=>x.messageId),['m-a','m-b']);
    assert.deepEqual([...doc.querySelectorAll('.cti-badge>button')].map(x=>x.textContent),['100 tokens','50 · 150 tokens']);
    assert.deepEqual([...doc.querySelectorAll('.cti-badge')].map(x=>x.dataset.status),['complete','active']);
    assert.equal(doc.getElementById('first').firstChild.textContent,'native first');
    assert.deepEqual([...doc.querySelector('#second .cti-tip').children].map(x=>x.firstChild.textContent),['输入','输出','缓存命中']);
    state.setLanguage('en');
    await new Promise(resolve=>setTimeout(resolve,2200));
    assert.deepEqual([...doc.querySelector('#second .cti-tip').children].map(x=>x.firstChild.textContent),['Input','Output','Cache hits']);
    assert.deepEqual([...doc.querySelectorAll('.cti-badge>button')].map(x=>x.textContent),['100 tokens','50 · 150 tokens']);
  }finally{state.dispose();dom.window.close();}
  assert.equal(doc.querySelectorAll('[data-cti-owned]').length,0);
});
test('unknown native component or missing metadata does not receive a guessed counter',()=>{
  function Other(){}
  assert.equal(messageAnchor({type:Other,memoizedProps:{conversationId:'thread',item:{sentAtMs:1}}}),null);
  function Oy(){}
  assert.equal(messageAnchor({type:Oy,memoizedProps:{conversationId:'thread',item:{}}}),null);
});
test('startup integration cannot reload, navigate, or intercept native page loading',async()=>{
  const runtime=await fs.readFile(new URL('../bin/native-runtime.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(runtime,/['"`](?:Page\.(?:reload|navigate)|Fetch\.)/);
  assert.match(runtime,/document.readyState === 'complete'/);
});
