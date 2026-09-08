export const FIELDS = ['input', 'cached', 'output', 'reasoning', 'total'];
export const emptyUsage = () => Object.fromEntries(FIELDS.map(key => [key, 0]));
export function normalize(raw = {}) {
  const number = key => Number.isSafeInteger(raw[key]) && raw[key] >= 0 ? raw[key] : 0;
  const input = number('input_tokens'), output = number('output_tokens');
  return { input, cached: Math.min(input, number('cached_input_tokens')), output,
    reasoning: Math.min(output, number('reasoning_output_tokens')), total: input + output };
}
export function sum(a, b) { return Object.fromEntries(FIELDS.map(key => [key, a[key] + b[key]])); }
export function delta(a, b) { return Object.fromEntries(FIELDS.map(key => [key, Math.max(0, a[key] - b[key])])); }
export function formatTokens(n) {
  if (!Number.isSafeInteger(n) || n < 0) return '— tokens';
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M tokens`;
  return `${n.toLocaleString('en-US')} tokens`;
}
export function formatProgress(segment, cumulative, showCumulative = false) {
  if (!showCumulative || segment === cumulative) return formatTokens(segment);
  return `${formatTokens(segment).replace(/ tokens$/, '')} · ${formatTokens(cumulative)}`;
}
export function tooltipRows(usage, language = 'zh') {
  const number = n => n.toLocaleString('en-US');
  const hit = usage.input ? `${(usage.cached / usage.input * 100).toFixed(0)}%` : '—';
  const names = language === 'en' ? ['Input','Output','Cache hits'] : ['输入','输出','缓存命中'];
  return [[names[0], number(usage.input)], [names[1], number(usage.output)], [names[2], `${number(usage.cached)} · ${hit}`]];
}
export function segmentPending(data) {
  return data?.status !== 'complete' && !data?.frozen && data?.segmentHasData === false;
}
export function snapshotLabel(data) {
  if (!data?.hasData) return '— tokens';
  if (segmentPending(data)) return data.hasPriorSegments ? `— · ${formatTokens(data.usage.total)}` : '— tokens';
  return formatProgress((data.segmentUsage ?? data.usage).total,data.usage.total,data.hasPriorSegments);
}
