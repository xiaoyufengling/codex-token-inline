import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {readStore,updateStore,begin,finish,selectObjective} from '../src/store.mjs';
test('objective survives restarts; a new objective cannot silently reset active work',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'cti-test-')),file=path.join(dir,'objectives.json');
 try{
  assert.equal((await readStore(file)).objectives.length,0);
  await updateStore(file,d=>begin(d,{threadId:'thread',id:'first',startedAt:100}));
  await assert.rejects(updateStore(file,d=>begin(d,{threadId:'thread',id:'second',startedAt:200})),/active/);
  await updateStore(file,d=>finish(d,{id:'first',at:300}));await updateStore(file,d=>begin(d,{threadId:'thread',id:'second',startedAt:400}));
  const d=await readStore(file);assert.equal(selectObjective(d,'thread',200).id,'first');assert.equal(selectObjective(d,'thread',500).id,'second');assert.equal(selectObjective(d,'thread',200).status,'complete');
  await fs.writeFile(file+'.lock','');await assert.rejects(updateStore(file,()=>{}),{code:'EEXIST'});
 }finally{if(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(dir).startsWith('cti-test-'))await fs.rm(dir,{recursive:true,force:true});}
});
