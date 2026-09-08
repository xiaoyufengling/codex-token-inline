import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotLabel,segmentPending} from '../src/usage.mjs';
test('delayed active-segment usage stays unknown while preserving the recorded scope total',()=>{
  const data={hasData:true,status:'active',frozen:false,segmentHasData:false,segmentUsage:{total:0},usage:{total:476637},hasPriorSegments:true};
  assert.equal(snapshotLabel(data),'— · 476,637 tokens');
  assert.equal(segmentPending(data),true);
  assert.equal(snapshotLabel({...data,segmentHasData:true,segmentUsage:{total:165608},usage:{total:642245}}),'165,608 · 642,245 tokens');
  assert.equal(snapshotLabel({...data,segmentHasData:true}),'0 · 476,637 tokens');
  assert.equal(snapshotLabel({...data,frozen:true}),'0 · 476,637 tokens');
  assert.equal(snapshotLabel({...data,status:'complete'}),'0 · 476,637 tokens');
});
