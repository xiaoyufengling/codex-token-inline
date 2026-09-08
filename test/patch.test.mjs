import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Asar,packHeader,writePatchedArchive } from '../src/asar.mjs';
import { wrapActionFunction,prepare,enableThinkingCounter } from '../src/patch.mjs';

test('thinking placeholder adapter passes real thread/turn scope and fails closed on drift',()=>{
 const source='Li,{clientUserMessageId:A,isVisible:oa,icon:di,message:pi};function Li(e){return e.message}';
 const result=enableThinkingCounter(source);
 assert.match(result,/threadId:c,turnId:X/);assert.match(result,/__ctiThinking\(__ctiThinkingOriginal\(e\),e,Ui\)/);
 assert.throws(()=>enableThinkingCounter('changed build'),/anchor mismatch/);
});
test('adapter requires unique verified anchor; original hooks and actions are preserved',()=>{
 const result=wrapActionFunction('function zy(e){return e.actions}',{actionFunction:'zy',reactBinding:'R'});
 assert.match(result,/__ctiOriginal\(e\),e,R/);assert.match(result,/function __ctiOriginal\(e\)\{return e.actions\}/);
 assert.throws(()=>wrapActionFunction('function unknown(){}',{actionFunction:'zy',reactBinding:'R'}));
 assert.throws(()=>wrapActionFunction('function zy(e){}function zy(e){}',{actionFunction:'zy',reactBinding:'R'}));
});
test('prepared archive round-trips, preserves untouched entries, never overwrites an output',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'cti-test-'));const source=path.join(root,'source.asar'),output=path.join(root,'result.asar');
 const header={files:{'first.txt':{size:3,offset:'0'},'second.txt':{size:3,offset:'3'}}};
 try{
  await fs.writeFile(source,Buffer.concat([packHeader(header),Buffer.from('oldtwo')]));const a=await Asar.open(source);
  try{await writePatchedArchive(a,output,new Map([['first.txt',Buffer.from('replacement')],['new/extra.txt',Buffer.from('added')]]));await assert.rejects(writePatchedArchive(a,output,new Map()));}finally{await a.close();}
  const b=await Asar.open(output);try{assert.equal((await b.read('first.txt')).toString(),'replacement');assert.equal((await b.read('second.txt')).toString(),'two');assert.equal((await b.read('new/extra.txt')).toString(),'added');assert.equal(b.entry('first.txt').integrity.algorithm,'SHA256');}finally{await b.close();}
  await assert.rejects(prepare(source,source),/ignored project/);
 }finally{if(path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(root).startsWith('cti-test-'))await fs.rm(root,{recursive:true,force:true});}
});
