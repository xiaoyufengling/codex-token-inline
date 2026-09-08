import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Ledger} from '../src/ledger.mjs';
import {UsageService} from '../src/service.mjs';
const event=(type,payload,time)=>({type,payload,timestamp:new Date(time).toISOString()});
test('ordinary work scope becomes gray-ready only after its recorded completion',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-complete-'));
 try{
  const ledger=new Ledger('thread'),service=new UsageService({store:path.join(dir,'goals.json')});service.collector={readThread:async()=>ledger};
  ledger.accept(event('event_msg',{type:'task_started',turn_id:'run'},1000));
  ledger.accept(event('response_item',{type:'message',role:'assistant',id:'first'},1100));
  ledger.accept(event('token_usage_record',{thread_id:'thread',turn_id:'run',response_id:'response',usage:{input_tokens:90,output_tokens:10}},1200));
  const get=()=>service.snapshot({threadId:'thread',turnId:'run'});
  assert.equal((await get()).status,'active');
  ledger.accept(event('event_msg',{type:'request_user_input'},1250));
  assert.equal((await get()).status,'active','waiting for clarification is not completion');
  ledger.accept(event('response_item',{type:'message',role:'assistant',id:'second'},1300));
  assert.equal((await service.snapshot({threadId:'thread',messageId:'first'})).status,'active','a frozen earlier segment in a running scope stays active');
  ledger.accept(event('event_msg',{type:'task_complete',turn_id:'run'},1400));
  const done=await get();assert.equal(done.status,'complete');assert.equal(done.completedAt,1400);assert.equal(done.usage.total,100);
  assert.equal((await service.snapshot({threadId:'thread',messageId:'first'})).status,'complete');
  const restored=new UsageService({store:path.join(dir,'goals.json')});restored.collector={readThread:async()=>ledger};
  assert.equal((await restored.snapshot({threadId:'thread',turnId:'run'})).status,'complete');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('an explicitly ongoing overarching goal remains green across completed runs',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-complete-')),store=path.join(dir,'goals.json');
 try{
  const goal={id:'goal',threadId:'thread',startedAt:1000,status:'active',completedAt:null};
  await fs.writeFile(store,JSON.stringify({version:1,objectives:[goal]}));
  const ledger=new Ledger('thread'),service=new UsageService({store});service.collector={readThread:async()=>ledger};
  ledger.accept(event('event_msg',{type:'task_started',turn_id:'run'},1100));ledger.accept(event('event_msg',{type:'task_complete',turn_id:'run'},1200));
  const get=()=>service.snapshot({threadId:'thread',turnId:'run'});
  assert.equal((await get()).status,'active');
  await fs.writeFile(store,JSON.stringify({version:1,objectives:[{...goal,status:'complete',completedAt:1500}]}));
  assert.equal((await get()).status,'complete');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
