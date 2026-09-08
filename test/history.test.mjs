import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Ledger } from '../src/ledger.mjs';
import { UsageService } from '../src/service.mjs';
import { enableLiveFooter } from '../src/patch.mjs';
const message=(id,time)=>({type:'response_item',timestamp:new Date(time).toISOString(),payload:{type:'message',role:'assistant',id}});
const record=(id,time,input)=>({type:'token_usage_record',timestamp:new Date(time).toISOString(),payload:{thread_id:'thread',turn_id:'turn',response_id:id,usage:{input_tokens:input,output_tokens:10}}});
test('historical messages keep their cumulative checkpoint while the newest continues',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-history-'));
 try {
  const ledger=new Ledger('thread');
  ledger.accept(message('msg_one',1000));ledger.accept(record('r1',1100,100));
  ledger.accept(message('msg_two',2000));ledger.accept(record('r2',2100,200));
  ledger.accept(message('msg_three',3000));ledger.accept(record('r3',3100,300));
  const service=new UsageService({store:path.join(dir,'objectives.json')});
  service.collector={readThread:async()=>ledger};
  const get=messageId=>service.snapshot({threadId:'thread',messageId});
  assert.equal((await get('msg_one')).usage.total,110);
  assert.equal((await get('prefix:msg_two')).usage.total,320);
  assert.equal((await get('msg_three')).usage.total,630);
  ledger.accept(record('r4',4000,400));
  assert.equal((await get('msg_one')).usage.total,110);
  assert.equal((await get('msg_two')).usage.total,320);
  assert.equal((await get('msg_three')).usage.total,1040);
  assert.equal((await get('msg_one')).frozen,true);
  assert.equal((await get('msg_three')).frozen,false);
  const restored=new UsageService({store:path.join(dir,'objectives.json')});restored.collector={readThread:async()=>ledger};
  assert.equal((await restored.snapshot({threadId:'thread',messageId:'msg_one'})).usage.total,110);
 } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('native questions are reconstructed from numeric log metadata after restart',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-history-'));
 try {
  const ledger=new Ledger('thread');ledger.accept(message('first',1000));ledger.accept(record('r1',1100,100));
  ledger.accept({type:'response_item',timestamp:new Date(2000).toISOString(),payload:{type:'function_call',name:'request_user_input_async',id:'fc_question',call_id:'call_question'}});
  ledger.accept(record('r2',2100,200));
  const service=new UsageService({store:path.join(dir,'objectives.json')});service.collector={readThread:async()=>ledger};
  assert.equal((await service.snapshot({threadId:'thread',sentAtMs:2000})).usage.total,320);
  assert.equal((await service.snapshot({threadId:'thread',messageId:'first'})).usage.total,110);
  const restored=new UsageService({store:path.join(dir,'objectives.json')});restored.collector={readThread:async()=>ledger};
  assert.equal((await restored.snapshot({threadId:'thread',messageId:'first'})).usage.total,110);
  assert.equal((await restored.snapshot({threadId:'thread',messageId:'question:call_question'})).usage.total,320);
 } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
test('streaming footer preserves native actions and adds a metadata-only fallback',()=>{
 const source='turnId:U?o:void 0,copyText:U&&ve?ge:void 0; persistentAdditionalActions:I}):null]}),t[156]=F';
 assert.match(enableLiveFooter(source),/ctiMessageId:n.searchItemId/);
 assert.match(enableLiveFooter(source),/__ctiDecorate\(null,\{threadId:p,turnId:o/);
 assert.throws(()=>enableLiveFooter('changed version'),/anchor mismatch/);
});
