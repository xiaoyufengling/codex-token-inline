import test from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';
import {makeBadge,decorateActions,decorateThinking} from '../src/badge.mjs';
test('inline badge: one resting number, three hover rows, explicit final gray, retained native buttons',async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{url:'https://example.test',pretendToBeVisual:true});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let data={hasData:true,status:'active',objectiveId:'goal',usage:{input:10000,cached:8000,output:1000,reasoning:0,total:11000}};
 let snapshotCalls=0;
 const bridge={snapshot:async()=>{snapshotCalls++;return structuredClone(data);}};
 const Badge=makeBadge(React),root=createRoot(document.getElementById('root'));
 try{
  await act(async()=>{root.render(React.createElement(Badge,{threadId:'thread',turnId:'turn1',bridge}));});
  assert.equal(document.querySelector('.cti-badge>button').textContent,'11,000 tokens');
  assert.equal(document.querySelectorAll('.cti-tip-row').length,3);assert.equal(document.querySelector('.cti-badge').dataset.status,'active');
  assert.deepEqual([...document.querySelectorAll('.cti-tip-row>span:first-child')].map(e=>e.textContent),['输入','输出','缓存命中']);
  assert.match(document.querySelector('#cti-styles').textContent,/\.cti-tip\{display:none/);
  assert.match(document.querySelector('#cti-styles').textContent,/:hover \.cti-tip/);
  data={...data,usage:{...data.usage,total:12000,input:11000}};
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,1600));});
  assert.equal(document.querySelector('.cti-badge>button').textContent,'12,000 tokens');assert.equal(document.querySelector('.cti-badge').dataset.status,'active');
  data={...data,status:'complete'};
  await act(async()=>{root.render(React.createElement(Badge,{threadId:'thread',turnId:'turn3',bridge}));});
  assert.equal(document.querySelector('.cti-badge').dataset.status,'complete');assert.ok(snapshotCalls>=3);
  globalThis.codexTokenInline=bridge;
  const original=React.createElement('div',{className:'turn-action-controls'},React.createElement('button',{key:'copy'},'复制'));
  const decorated=decorateActions(original,{threadId:'thread',turnId:'turn3'},React);
  await act(async()=>root.render(decorated));assert.equal(document.querySelector('.turn-action-controls>button').textContent,'复制');
  assert.equal(document.querySelector('.turn-action-controls>.cti-badge>button').textContent,'12,000 tokens');
  await act(async()=>root.render(decorateActions(null,{threadId:'thread'},React)));
  assert.equal(document.querySelector('.cti-badge>button').textContent,'12,000 tokens','commentary without turnId must still display objective usage');
  data={...data,status:'active',usage:{input:130,cached:15,output:20,total:150},segmentUsage:{input:40,cached:5,output:10,total:50},hasPriorSegments:true};
  await act(async()=>root.render(React.createElement(Badge,{threadId:'thread',turnId:'segment',bridge})));
  assert.equal(document.querySelector('.cti-badge>button').textContent,'50 · 150 tokens');
  assert.equal(document.querySelector('.cti-tip-row>span:last-child').textContent,'40','hover input is the segment input, not cumulative input');
 }finally{await act(async()=>root.unmount());dom.window.close();delete globalThis.window;delete globalThis.document;delete globalThis.codexTokenInline;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
test('thinking shows unknown immediately, then real usage; unchanged samples do not repaint',async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>',{pretendToBeVisual:true});
 globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let data={hasData:false,status:'active'},calls=0,renders=0;
 const bridge={snapshot:async()=>{calls++;return {...data,observedAt:Date.now()};}};
 globalThis.codexTokenInline=bridge;
 const root=createRoot(document.getElementById('root'));
 try{
  const node=decorateThinking(React.createElement('span',null,'Thinking'),{threadId:'thread',turnId:'live',isVisible:true},React);
  await act(async()=>root.render(React.createElement(React.Profiler,{id:'thinking',onRender:()=>renders++},node)));
  assert.equal(document.querySelector('.cti-thinking-row .cti-badge>button').textContent,'— tokens');
  assert.deepEqual([...document.querySelectorAll('.cti-tip-row>span:last-child')].map(e=>e.textContent),['待返回','待返回','待返回']);
  data={hasData:true,status:'active',usage:{input:80,output:20,cached:50,total:100}};
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,650));});
  assert.equal(document.querySelector('.cti-badge>button').textContent,'100 tokens');
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,650));});
  const settled=renders;
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,1100));});
  assert.equal(renders,settled);assert.ok(calls>=4);
  await act(async()=>root.render(decorateThinking(React.createElement('span',null,'Reply'),{threadId:'thread',isVisible:false},React)));
  assert.equal(document.querySelector('.cti-badge'),null);
 }finally{await act(async()=>root.unmount());dom.window.close();delete globalThis.window;delete globalThis.document;delete globalThis.codexTokenInline;delete globalThis.IS_REACT_ACT_ENVIRONMENT;}
});
