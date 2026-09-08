import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Ledger} from '../src/ledger.mjs';
import {UsageService} from '../src/service.mjs';
const state=(type,turn_id,time)=>({type:'event_msg',timestamp:new Date(time).toISOString(),payload:{type,turn_id}});
const usage=(turn_id,time,value)=>({type:'token_usage_record',timestamp:new Date(time).toISOString(),payload:{thread_id:'thread',turn_id,response_id:`r-${time}`,usage:{input_tokens:value,output_tokens:0}}});
test('a native final footer with only turnId never absorbs the next answer',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-turn-'));
 try{
  const ledger=new Ledger('thread'),service=new UsageService({store:path.join(dir,'goals.json')});service.collector={readThread:async()=>ledger};
  ledger.accept(state('task_started','old',1000));ledger.accept(usage('old',1200,100));ledger.accept(state('task_complete','old',1300));
  const get=turnId=>service.snapshot({threadId:'thread',turnId});
  assert.equal((await get('old')).usage.total,100);
  ledger.accept(state('task_started','new',2000));ledger.accept(usage('new',2100,50));
  assert.equal((await get('old')).usage.total,100,'new request usage must not change the previous final footer');
  assert.equal((await get('old')).frozen,true);
  assert.equal((await get('old')).status,'complete','the default execution scope is complete; explicit goals have their own lifecycle');
  assert.equal((await get('new')).usage.total,50,'an independent new request starts a new work scope');
  ledger.accept(usage('old',2200,5));
  assert.equal((await get('old')).usage.total,105,'late usage still belongs to its recorded original turn');
  assert.equal((await get('new')).usage.total,50);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('a completed message freezes before the next response has any visible text',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-turn-'));
 try{
  const ledger=new Ledger('thread'),service=new UsageService({store:path.join(dir,'goals.json')});service.collector={readThread:async()=>ledger};
  ledger.accept(state('task_started','old',1000));
  ledger.accept({type:'response_item',timestamp:new Date(1100).toISOString(),payload:{type:'message',role:'assistant',id:'msg_old'}});
  ledger.accept(usage('old',1200,100));ledger.accept(state('task_complete','old',1300));
  ledger.accept(state('task_started','new',2000));ledger.accept(usage('new',2100,50));
  const snapshot=await service.snapshot({threadId:'thread',messageId:'msg_old',sentAtMs:1100});
  assert.equal(snapshot.usage.total,100);assert.equal(snapshot.frozen,true);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
