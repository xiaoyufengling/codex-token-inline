import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Collector } from '../src/collector.mjs';
const thread='00000000-0000-4000-8000-000000000001';
const record=(id,input=100)=>JSON.stringify({type:'token_usage_record',timestamp:new Date(100).toISOString(),payload:{thread_id:thread,turn_id:'turn',response_id:id,usage:{input_tokens:input,output_tokens:10}}});
test('incremental local reads tolerate partial UTF-8/JSON lines, rotation, archives and copies',async()=>{
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'cti-test-'));
 const dir=path.join(home,'sessions');await fs.mkdir(dir);const file=path.join(dir,`rollout-${thread}.jsonl`);
 try{
  await fs.writeFile(file,record('one')+'\n'+record('two').slice(0,30));const c=new Collector(home);
  assert.equal((await c.readThread(thread)).snapshot().usage.total,110);
  await fs.appendFile(file,record('two').slice(30)+'\n');assert.equal((await c.readThread(thread)).snapshot().usage.total,220);
  assert.equal((await c.readThread(thread)).snapshot().usage.total,220);
  await fs.mkdir(path.join(home,'archived_sessions'));await fs.copyFile(file,path.join(home,'archived_sessions',`rollout-${thread}.jsonl`));c.indexedAt=0;
  assert.equal((await c.readThread(thread)).snapshot().usage.total,220);
  await fs.rm(path.join(home,'archived_sessions',`rollout-${thread}.jsonl`));await fs.writeFile(file,record('new',300)+'\n');c.indexedAt=0;
  assert.equal((await c.readThread(thread)).snapshot().usage.total,310);
  await assert.rejects(c.readThread('../auth.json'));
 }finally{if(path.resolve(home).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(home).startsWith('cti-test-'))await fs.rm(home,{recursive:true,force:true});}
});
