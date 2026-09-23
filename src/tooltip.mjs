// A manual popover escapes native card stacking contexts and overflow clipping.
// Only our tooltip enters the top layer; native elements are never restyled.
export function attachTooltip(badge, tip) {
  const doc=badge.ownerDocument, win=doc.defaultView;
  if(typeof tip.showPopover!=='function')return ()=>{};
  tip.setAttribute('popover','manual');
  let open=false, hovered=false, disposed=false;
  function close(){
    if(!open)return;
    open=false;
    try{tip.hidePopover();}catch{}
    doc.removeEventListener('scroll',close,true);
    win.removeEventListener('resize',close);
    win.removeEventListener('blur',close);
    doc.removeEventListener('keydown',escape);
    doc.removeEventListener('visibilitychange',close);
  }
  function escape(event){if(event.key==='Escape')close();}
  function position(){
    const anchor=badge.getBoundingClientRect(), box=tip.getBoundingClientRect();
    const width=doc.documentElement.clientWidth||win.innerWidth;
    const height=doc.documentElement.clientHeight||win.innerHeight;
    const left=Math.max(8,Math.min(anchor.left,width-box.width-8));
    const above=anchor.top-box.height-8;
    const top=Math.max(8,Math.min(above>=8?above:anchor.bottom+8,height-box.height-8));
    tip.style.left=left+'px';tip.style.top=top+'px';
  }
  function show(){
    if(disposed||!badge.isConnected)return;
    if(!open){
      try{tip.showPopover();}catch{return;}
      open=true;
      doc.addEventListener('scroll',close,true);
      win.addEventListener('resize',close);
      win.addEventListener('blur',close);
      doc.addEventListener('keydown',escape);
      doc.addEventListener('visibilitychange',close);
    }
    position();
  }
  function enter(){hovered=true;show();}
  function leave(){hovered=false;if(!badge.contains(doc.activeElement))close();}
  function focusOut(event){if(!hovered&&!badge.contains(event.relatedTarget))close();}
  badge.addEventListener('pointerenter',enter);
  badge.addEventListener('pointerleave',leave);
  badge.addEventListener('focusin',show);
  badge.addEventListener('focusout',focusOut);
  const observer=new win.MutationObserver(()=>{if(open)position();});
  observer.observe(tip,{childList:true,subtree:true,characterData:true});
  const dispose=()=>{
    disposed=true;close();observer.disconnect();
    badge.removeEventListener('pointerenter',enter);
    badge.removeEventListener('pointerleave',leave);
    badge.removeEventListener('focusin',show);
    badge.removeEventListener('focusout',focusOut);
  };
  dispose.hide=close;return dispose;
}
