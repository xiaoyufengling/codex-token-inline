import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Ledger} from '../src/ledger.mjs';
import {UsageService} from '../src/service.mjs';
import {formatProgress,tooltipRows} from '../src/usage.mjs';
const event=(type,payload,time)=>({type,payload,timestamp:new Date(time).toISOString()});
const state=(type,turn_id,time)=>event('event_msg',{type,turn_id},time);
const message=(id,time)=>event('response_item',{type:'message',role:'assistant',id},time);
const usage=(id,turn_id,time,value)=>event('token_usage_record',{thread_id:'thread',turn_id,response_id:id,usage:{input_tokens:value-10,output_tokens:10,cached_input_tokens:5}},time);
test('100, then 50 / 150, then 20 / 170: segments sum once within an active long run',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-segment-'));
 try{
  const ledger=new Ledger('thread'),service=new UsageService({store:path.join(dir,'goals.json')});service.collector={readThread:async()=>ledger};
  ledger.accept(state('task_started','long',1000));
  ledger.accept(message('one',1100));ledger.accept(usage('r1','long',1200,100));
  ledger.accept(event('response_item',{type:'message',role:'user',id:'steering'},1300));
  ledger.accept(message('two',2000));ledger.accept(usage('r2','long',2100,50));
  ledger.accept(message('three',3000));ledger.accept(usage('r3','long',3100,20));
  const get=messageId=>service.snapshot({threadId:'thread',messageId});
  const values=await Promise.all(['one','two','three'].map(get));
  assert.deepEqual(values.map(s=>s.segmentUsage.total),[100,50,20]);
  assert.deepEqual(values.map(s=>s.usage.total),[100,150,170]);
  assert.deepEqual(values.map(s=>formatProgress(s.segmentUsage.total,s.usage.total,s.hasPriorSegments)),['100 tokens','50 · 150 tokens','20 · 170 tokens']);
  assert.equal(values.reduce((sum,s)=>sum+s.segmentUsage.total,0),values.at(-1).usage.total);
  ledger.accept(state('task_complete','long',3200));
  ledger.accept(state('task_started','independent',4000));ledger.accept(message('new',4100));ledger.accept(usage('r4','independent',4200,30));
  assert.equal((await get('three')).usage.total,170);assert.equal((await get('three')).segmentUsage.total,20);
  assert.equal((await get('new')).usage.total,30);assert.equal((await get('new')).segmentUsage.total,30);
  assert.deepEqual(tooltipRows((await get('two')).segmentUsage),[['输入','40'],['输出','10'],['缓存命中','5 · 13%']]);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('explicit overarching goal joins separate runs without joining the next completed goal',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-segment-')),store=path.join(dir,'goals.json');
 try{
  await fs.writeFile(store,JSON.stringify({version:1,objectives:[{id:'goal',threadId:'thread',startedAt:1000,status:'complete',completedAt:2500}]}));
  const ledger=new Ledger('thread'),service=new UsageService({store});service.collector={readThread:async()=>ledger};
  for(const [turn,time,n] of [['first',1000,100],['second',2000,50],['unrelated',3000,20]]){
   ledger.accept(state('task_started',turn,time));ledger.accept(message(turn,time+100));ledger.accept(usage(`r-${turn}`,turn,time+200,n));ledger.accept(state('task_complete',turn,time+300));
  }
  const first=await service.snapshot({threadId:'thread',turnId:'first'}),second=await service.snapshot({threadId:'thread',turnId:'second'}),third=await service.snapshot({threadId:'thread',turnId:'unrelated'});
  assert.equal(first.segmentUsage.total,100);assert.equal(second.segmentUsage.total,50);assert.equal(second.usage.total,150);assert.equal(second.scope,'explicit-objective');
  assert.equal(third.usage.total,20);assert.equal(third.scope,'run');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
