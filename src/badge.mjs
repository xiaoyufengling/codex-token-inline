import { snapshotLabel, segmentPending, tooltipRows } from './usage.mjs';
export const styles = `
.cti-badge{position:relative;display:inline-flex;align-items:center;margin-inline-start:8px;height:20px;font-family:inherit;font-size:14px;line-height:20px;font-weight:500;letter-spacing:normal;font-variant-numeric:tabular-nums;white-space:nowrap}
.cti-badge>button{font:inherit;color:inherit;line-height:inherit;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;cursor:default}
.cti-badge[data-status=active]{color:light-dark(#237a47,#49b978)}
.cti-badge[data-status=complete]{color:var(--color-text-tertiary,#888)}
.cti-standalone>.cti-badge{margin-inline-start:0}
.cti-thinking-row{display:flex;align-items:center;min-width:0}
.cti-badge>button:focus-visible{outline:1px solid currentColor;outline-offset:3px;border-radius:2px}
.cti-tip{display:none;position:absolute;bottom:calc(100% + 8px);left:0;z-index:1000;min-width:210px;padding:8px 10px;border:1px solid light-dark(#dedede,#414141);border-radius:7px;background:light-dark(#fff,#2a2a2a);color:light-dark(#242424,#ececec);box-shadow:0 3px 12px #0002;font-size:12px;line-height:20px}
.cti-badge:hover .cti-tip:not([popover]),.cti-badge:focus-within .cti-tip:not([popover]){display:block}
.cti-tip[popover]{position:fixed;inset:auto;margin:0;box-sizing:border-box;min-width:0;width:max-content;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;white-space:normal;pointer-events:none}
.cti-tip[popover]:popover-open{display:block}
.cti-tip[popover]::backdrop{background:transparent;pointer-events:none}
.cti-tip[popover] .cti-tip-row{min-width:min(190px,calc(100vw - 38px))}
.cti-tip-row>span:last-child{overflow-wrap:anywhere;text-align:end}
.cti-tip-row{display:flex;justify-content:space-between;gap:18px}.cti-tip-row>span:first-child{opacity:.7}
`;
export function installStyles(document) {
  if (document.getElementById('cti-styles')) return;
  const style = document.createElement('style'); style.id = 'cti-styles'; style.textContent = styles; document.head.append(style);
}
export function makeBadge(React) {
  return function TokenBadge({ threadId, turnId, messageId, sentAtMs, showPending = false, bridge }) {
    const [data, setData] = React.useState(null);
    const [stale, setStale] = React.useState(false);
    const tooltipId = React.useId();
    const badgeRef = React.useRef(null);
    React.useEffect(() => {
      const node = badgeRef.current;
      if (!node || !bridge?.report || !data?.diagnosticEnabled) return;
      const rect = node.getBoundingClientRect();
      let ancestor = node, hidden = false;
      for (let i = 0; ancestor && i < 12; i++, ancestor = ancestor.parentElement) {
        const css = document.defaultView.getComputedStyle(ancestor);
        if (css.display === 'none' || css.visibility === 'hidden' || css.opacity === '0') hidden = true;
      }
      bridge.report({ kind: 'badge-layout', x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        viewportHeight: window.innerHeight, hidden, thinking: showPending, status: node.dataset.status,
        color: document.defaultView.getComputedStyle(node.firstElementChild).color }).catch(() => {});
    }, [data, bridge]);
    React.useEffect(() => {
      installStyles(document);
      if (!bridge || !threadId || showPending && !turnId) return;
      let stopped = false, timer;
      const load = async () => {
        let delay = 500;
        try {
          const next = await bridge.snapshot({ threadId, turnId, messageId, sentAtMs });
          if (next.frozen) delay = 10000;
          if (!stopped) {
            const value = { ...next, scopeThread: threadId, scopeTurn: turnId, scopeMessage: messageId, scopeTime: sentAtMs };
            const signature = JSON.stringify([threadId,turnId,messageId,sentAtMs,next.usage,next.segmentUsage,next.segmentHasData,next.hasData,next.hasPriorSegments,next.frozen,next.status,next.objectiveId,next.diagnosticEnabled]);
            setData(previous => previous?.signature === signature ? previous : { ...value, signature });
            setStale(false);
          }
        } catch { if (!stopped) setStale(true); delay = 1500; }
        if (document.visibilityState === 'hidden') delay = Math.max(delay, 2000);
        if (!stopped) timer = setTimeout(load, delay);
      };
      load(); return () => { stopped = true; clearTimeout(timer); };
    }, [threadId, turnId, messageId, sentAtMs, showPending, bridge]);
    // Persistent cutoffs come from lifecycle state, never from a render side effect.
    const matches = data && data.scopeThread === threadId && data.scopeTurn === turnId && data.scopeMessage === messageId && data.scopeTime === sentAtMs;
    const hasUsage = matches && data.hasData;
    if (!hasUsage && !showPending) return null;
    const status = matches && data.status === 'complete' ? 'complete' : 'active';
    const segment = hasUsage ? data.segmentUsage ?? data.usage : null;
    const label = hasUsage ? snapshotLabel(data) : '— tokens';
    const rows = hasUsage && !segmentPending(data) ? tooltipRows(segment) : [['输入','待返回'],['输出','待返回'],['缓存命中','待返回']];
    return React.createElement('span', { ref: badgeRef, className: 'cti-badge', 'data-status': status, 'data-stale': stale,
      'data-objective-id': matches ? data.objectiveId : undefined },
      React.createElement('button', { type: 'button', 'aria-describedby': tooltipId,
        'aria-label': `${label}，${stale ? '刷新暂停' : status === 'complete' ? '已结束' : '进行中'}` }, label),
      React.createElement('span', { id: tooltipId, role: 'tooltip', className: 'cti-tip' },
        rows.map(([name, value]) => React.createElement('span', { key: name, className: 'cti-tip-row' },
          React.createElement('span', null, name), React.createElement('span', null, value)))));
  };
}
const components = new WeakMap();
export function decorateThinking(original, props, React) {
  const bridge = globalThis.codexTokenInline;
  if (!bridge || !props.threadId || props.isVisible === false) return original;
  let Badge = components.get(React); if (!Badge) { Badge = makeBadge(React); components.set(React, Badge); }
  return React.createElement('div', { className: 'cti-thinking-row' }, original,
    React.createElement(Badge, { key: 'thinking-tokens', threadId: props.threadId, turnId: props.turnId, showPending: true, bridge }));
}
export function decorateActions(original, props, React) {
  const bridge = globalThis.codexTokenInline;
  // Native commentary messages may omit turnId. They still belong to the
  // overarching objective, so poll by thread until a turn ID is available.
  if (!bridge || !props.threadId) return original;
  let Badge = components.get(React); if (!Badge) { Badge = makeBadge(React); components.set(React, Badge); }
  const badge = React.createElement(Badge, { key: 'codex-token-inline', threadId: props.threadId,
    turnId: props.turnId, messageId: props.ctiMessageId, sentAtMs: props.sentAtMs, bridge, completedGoal: props.completedThreadGoal });
  if (!original) return React.createElement('div', { className: 'cti-standalone mt-1.5 flex turn-action-controls h-5 items-center justify-start' }, badge);
  return React.cloneElement(original, {}, ...React.Children.toArray(original.props.children), badge);
}
