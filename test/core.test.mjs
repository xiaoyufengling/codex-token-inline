import test from 'node:test';
import assert from 'node:assert/strict';
import { Ledger } from '../src/ledger.mjs';
import { normalize, tooltipRows, formatTokens } from '../src/usage.mjs';
import { createObjective, completeObjective, objectiveSnapshot } from '../src/objective.mjs';
const event = (id, turnId, time, input=100, output=10) => ({ type:'token_usage_record', timestamp:new Date(time).toISOString(), payload:{thread_id:'thread',turn_id:turnId,response_id:id,usage:{input_tokens:input,cached_input_tokens:80,output_tokens:output,reasoning_output_tokens:4,total_tokens:input+output}} });
test('cached and reasoning tokens are subsets, never additional charges',()=>{
 const u=normalize({input_tokens:10000,cached_input_tokens:8000,output_tokens:1000,reasoning_output_tokens:400,total_tokens:19400});
 assert.equal(u.total,11000);assert.deepEqual(tooltipRows(u),[['输入','10,000'],['输出','1,000'],['缓存命中','8,000 · 80%']]);
});
test('millions use two decimals; smaller numbers and tooltip retain precision',()=>{
 assert.equal(formatTokens(undefined),'— tokens');assert.equal(formatTokens(0),'0 tokens');assert.equal(formatTokens(11000),'11,000 tokens');assert.equal(formatTokens(1200000),'1.20M tokens');
 assert.equal(formatTokens(999999),'999,999 tokens');assert.equal(formatTokens(1000000),'1.00M tokens');assert.equal(formatTokens(1274567),'1.27M tokens');assert.equal(formatTokens(14928178),'14.93M tokens');
 assert.equal(normalize({input_tokens:-1,cached_input_tokens:100,output_tokens:2}).cached,0);
 assert.equal(tooltipRows(normalize())[2][1],'0 · —');
});
test('exact records deduplicate and mirrored legacy records do not add again',()=>{
 const l=new Ledger('thread');l.accept({type:'turn_context',payload:{turn_id:'t'}});
 l.accept(event('r','t',100));l.accept(event('r','t',100));
 l.accept({type:'event_msg',timestamp:new Date(101).toISOString(),payload:{type:'token_count',info:{total_token_usage:{input_tokens:100,output_tokens:10,total_tokens:110}}}});
 assert.equal(l.snapshot().usage.total,110);assert.equal(l.snapshot().calls,1);assert.equal(l.snapshot().estimated,false);
});
test('legacy-only older turn remains available when a later turn has exact records',()=>{
 const l=new Ledger('thread');l.accept({type:'turn_context',payload:{turn_id:'old'}});
 const legacy={type:'event_msg',timestamp:new Date(1).toISOString(),payload:{type:'token_count',info:{total_token_usage:{input_tokens:100,output_tokens:10,total_tokens:110}}}};
 l.accept(legacy);l.accept(legacy);l.accept(event('r','new',100));assert.equal(l.snapshot().usage.total,220);assert.equal(l.snapshot().estimated,true);
});
test('copied evidence from a parent thread is excluded',()=>{
 const l=new Ledger('fork');l.accept(event('r','t',100));assert.equal(l.snapshot().hasData,false);
});
test('intermediate messages, approval waits, and task_complete do not finalize an objective',()=>{
 const l=new Ledger('thread'),o=createObjective({id:'goal',threadId:'thread'});
 l.accept(event('r1','turn1',100));l.accept({type:'event_msg',timestamp:new Date(200).toISOString(),payload:{type:'task_complete',turn_id:'turn1'}});
 l.accept(event('r2','turn2',300));assert.equal(objectiveSnapshot(l,o).usage.total,220);assert.equal(objectiveSnapshot(l,o).status,'active');
 assert.throws(()=>completeObjective(o,{at:400,evidence:'turn-complete'}));
});
test('explicit final completion freezes objective time range, including late-arriving older records',()=>{
 const l=new Ledger('thread');let o=createObjective({id:'goal',threadId:'thread',startedAt:100});l.accept(event('before','t0',50));l.accept(event('r1','t1',150));
 o=completeObjective(o,{at:200,evidence:'explicit-user'});l.accept(event('after','t2',250));l.accept(event('late','t1',180));
 const s=objectiveSnapshot(l,o);assert.equal(s.status,'complete');assert.equal(s.usage.total,220);assert.equal(completeObjective(o,{at:500,evidence:'explicit-user'}).completedAt,200);
});
