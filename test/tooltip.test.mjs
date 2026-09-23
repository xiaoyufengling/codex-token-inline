import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {attachTooltip} from '../src/tooltip.mjs';
function fixture(){
 const dom=new JSDOM('<div id="badge"><button>100 tokens</button><span role="tooltip">Input 80</span></div>');
 const doc=dom.window.document,badge=doc.getElementById('badge'),tip=badge.lastElementChild;
 let open=false;
 tip.showPopover=()=>{open=true;};tip.hidePopover=()=>{open=false;};
 badge.getBoundingClientRect=()=>({left:990,top:3,bottom:23});
 tip.getBoundingClientRect=()=>({width:220,height:80});
 return {dom,doc,badge,tip,isOpen:()=>open};
}
test('top-layer tooltip clamps at viewport edge and dismisses on scroll/Escape/disposal',()=>{
 const f=fixture(),clean=attachTooltip(f.badge,f.tip);
 try{
  f.badge.dispatchEvent(new f.dom.window.Event('pointerenter'));
  assert.equal(f.tip.getAttribute('popover'),'manual');assert.equal(f.isOpen(),true);
  assert.equal(f.tip.style.left,'796px');assert.equal(f.tip.style.top,'31px');
  f.doc.dispatchEvent(new f.dom.window.Event('scroll'));assert.equal(f.isOpen(),false);
  f.badge.dispatchEvent(new f.dom.window.Event('pointerenter'));
  f.doc.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Escape'}));assert.equal(f.isOpen(),false);
  f.badge.dispatchEvent(new f.dom.window.Event('pointerenter'));clean();assert.equal(f.isOpen(),false);
  f.badge.dispatchEvent(new f.dom.window.Event('pointerenter'));assert.equal(f.isOpen(),false);
 }finally{clean();f.dom.window.close();}
});
test('keyboard focus opens details and moving focus away closes them',()=>{
 const f=fixture(),clean=attachTooltip(f.badge,f.tip);
 try{
  f.badge.firstElementChild.focus();assert.equal(f.isOpen(),true);
  f.badge.firstElementChild.blur();assert.equal(f.isOpen(),false);
 }finally{clean();f.dom.window.close();}
});
