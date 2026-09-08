import { snapshotLabel, segmentPending, tooltipRows } from './usage.mjs';
import { installStyles } from './badge.mjs';

// The supported native Oy component supplies numeric/opaque message anchors.
// Read only those fields, never serialize props or retain message text.
export function messageAnchor(fiber) {
  if (fiber.type?.name !== 'Oy') return null;
  const p = fiber.memoizedProps, item = p?.item;
  if (typeof p?.conversationId !== 'string' || !item || !Number.isFinite(item.sentAtMs)) return null;
  return {threadId:p.conversationId,turnId:p.turnId,
    messageId:item.searchItemId ?? item.responseAnnotationTargetId,sentAtMs:item.sentAtMs};
}
export function firstHost(fiber) {
  const pending = [fiber.child];
  while (pending.length) {
    const node = pending.pop(); if (!node) continue;
    if (node.stateNode?.nodeType === 1) return node.stateNode;
    if (node.sibling) pending.push(node.sibling);
    if (node.child) pending.push(node.child);
  }
  return null;
}
export function mountDomBadges(doc = globalThis.document, bridge = globalThis.codexTokenInline) {
  if (doc.defaultView.__ctiDom) return doc.defaultView.__ctiDom;
  installStyles(doc);
  const entries = new Map();
  let disposed = false, timer, rootHint;
  let language = doc.defaultView.__ctiLanguage === 'en' ? 'en' : 'zh';
  const state = {version:'0.2.0-alpha.4',mounted:0,delivered:0,dispose,setLanguage(value) {
    const next = value === 'en' ? 'en' : 'zh'; if (next === language) return;
    language = next; for (const entry of entries.values()) { entry.signature = null; entry.next = 0; }
  }};
  doc.defaultView.__ctiDom = state;
  function rootFiber() {
    if (!rootHint?.isConnected) {
      const walker = doc.createTreeWalker(doc.body ?? doc.documentElement, 1);
      let node = walker.currentNode, remaining = 12000;
      while (node && remaining-- > 0) {
        if (Object.keys(node).some(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'))) { rootHint = node; break; }
        node = walker.nextNode();
      }
    }
    if (!rootHint) return null;
    const key = Object.keys(rootHint).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$'));
    let fiber = rootHint[key];
    while (fiber?.return) fiber = fiber.return;
    return fiber?.stateNode?.current ?? fiber;
  }
  function create(anchor) {
    const container = doc.createElement('div'); container.className = 'cti-standalone';
    container.dataset.ctiOwned = 'true';
    const badge = doc.createElement('span'); badge.className = 'cti-badge'; badge.dataset.status = 'active';
    const button = doc.createElement('button'); button.type = 'button'; button.textContent = '— tokens';
    const tip = doc.createElement('span'); tip.className = 'cti-tip'; tip.setAttribute('role','tooltip');
    tip.id = `cti-tip-${Math.random().toString(36).slice(2)}`; button.setAttribute('aria-describedby',tip.id);
    badge.append(button,tip); container.append(badge);
    return {anchor,container,badge,button,tip,busy:false,next:0,signature:null};
  }
  async function refresh(entry) {
    if (entry.busy || Date.now() < entry.next) return;
    entry.busy = true;
    let interval = 500;
    try {
      const data = await bridge.snapshot(entry.anchor);
      if (disposed || !entry.container.isConnected) return;
      interval = data.frozen ? 10000 : 500;
      const segment = data.segmentUsage ?? data.usage;
      const label = snapshotLabel(data);
      const status = data.status === 'complete' ? 'complete' : 'active';
      const pendingRows = language === 'en' ? [['Input','Waiting for usage'],['Output','Waiting for usage'],['Cache hits','Waiting for usage']] : [['输入','等待用量记录'],['输出','等待用量记录'],['缓存命中','等待用量记录']];
      const rows = data.hasData && !segmentPending(data) ? tooltipRows(segment,language) : pendingRows;
      const signature = JSON.stringify([label,status,rows]);
      if (signature !== entry.signature) {
        entry.button.textContent = label; entry.badge.dataset.status = status;
        entry.button.setAttribute('aria-label',label);
        entry.tip.replaceChildren(...rows.map(([name,value]) => {
          const row = doc.createElement('span'); row.className = 'cti-tip-row';
          const left = doc.createElement('span'), right = doc.createElement('span');
          left.textContent = name; right.textContent = value; row.append(left,right); return row;
        }));
        entry.signature = signature;
      }
      state.delivered++;
    } catch { interval = 1500; }
    finally { entry.busy = false; entry.next = Date.now() + Math.max(interval,doc.visibilityState === 'hidden' ? 2000 : 0); }
  }
  function scan() {
    if (disposed) return;
    const found = new Set(), pending = [rootFiber()]; let remaining = 100000;
    while (pending.length && remaining-- > 0) {
      const fiber = pending.pop(); if (!fiber) continue;
      if (fiber.sibling) pending.push(fiber.sibling);
      if (fiber.child) pending.push(fiber.child);
      const anchor = messageAnchor(fiber); if (!anchor) continue;
      const host = firstHost(fiber); if (!host?.isConnected) continue;
      const key = JSON.stringify(anchor); found.add(key);
      let entry = entries.get(key); if (!entry) { entry = create(anchor); entries.set(key,entry); }
      // Reuse visible native actions, otherwise keep the small left-aligned row.
      // Never replace native nodes or make a hidden native toolbar visible.
      const footer = host.querySelector('.turn-action-controls');
      let visible = Boolean(footer), ancestor = footer;
      while (ancestor && visible) {
        const css = doc.defaultView.getComputedStyle(ancestor);
        visible = css.display !== 'none' && css.visibility !== 'hidden' && css.opacity !== '0';
        if (ancestor === host) break;
        ancestor = ancestor.parentElement;
      }
      const target = visible ? footer : host;
      entry.container.className = visible ? '' : 'cti-standalone';
      entry.container.style.display = visible ? 'contents' : 'block';
      entry.container.style.marginTop = visible ? '0' : '6px';
      if (entry.container.parentElement !== target) target.append(entry.container);
      void refresh(entry);
    }
    for (const [key,entry] of entries) if (!found.has(key)) { entry.container.remove(); entries.delete(key); }
    state.mounted = entries.size;
    timer = setTimeout(scan,doc.visibilityState === 'hidden' ? 2000 : 500);
  }
  function dispose() {
    disposed = true; clearTimeout(timer);
    for (const entry of entries.values()) entry.container.remove(); entries.clear();
    delete doc.defaultView.__ctiDom;
  }
  scan(); return state;
}
