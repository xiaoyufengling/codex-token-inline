import { emptyUsage, normalize, sum, delta } from './usage.mjs';

/** Numeric evidence only. Prompt, reply, command, and credential contents are never retained. */
export class Ledger {
  constructor(threadId) {
    this.threadId = threadId;
    this.turnId = null;
    this.responses = new Map();
    this.legacy = new Map();
    this.previous = emptyUsage();
    this.lastRecordAt = null;
    this.unknownLines = 0;
    this.messages = new Map();
    this.turns = new Map();
    this.orderedRecords = null;
  }
  accept(event) {
    this.orderedRecords = null;
    const p = event?.payload || {};
    if (event.type === 'turn_context' && p.turn_id) this.turnId = p.turn_id;
    if (event.type === 'event_msg' && ['task_started', 'turn_started'].includes(p.type)) this.turnId = p.turn_id || this.turnId;
    const time = Date.parse(event.timestamp);
    if (!Number.isFinite(time)) return;
    if ((event.type === 'turn_context' || event.type === 'event_msg' && ['task_started','turn_started'].includes(p.type)) && this.turnId) {
      const previous = this.turns.get(this.turnId);
      this.turns.set(this.turnId, { id: this.turnId, startedAt: Math.min(previous?.startedAt ?? Infinity, time), completedAt: previous?.completedAt ?? null });
    }
    if (event.type === 'event_msg' && ['task_complete','turn_complete','turn_aborted'].includes(p.type) && (p.turn_id || this.turnId)) {
      const id = p.turn_id || this.turnId, previous = this.turns.get(id);
      this.turns.set(id, { id, startedAt: previous?.startedAt ?? null, completedAt: time });
    }
    const isQuestion = p.type === 'function_call' && ['request_user_input','request_user_input_async','functions.request_user_input','functions.request_user_input_async'].includes(p.name);
    if (event.type === 'response_item' && ((p.role === 'assistant' && p.type === 'message') || isQuestion)) {
      const id = p.id || `message:${time}`;
      this.messages.set(id, { id, callId: isQuestion ? p.call_id : null, time, turnId: this.turnId });
    }
    if (event.type === 'token_usage_record' && p.usage) {
      if (p.thread_id && p.thread_id !== this.threadId) return;
      const turnId = p.turn_id || this.turnId;
      const id = p.response_id || `${turnId}:${event.ordinal ?? event.timestamp}`;
      this.responses.set(id, { id, turnId, time, usage: normalize(p.usage), quality: 'recorded' });
      this.lastRecordAt = Math.max(this.lastRecordAt || 0, time);
    }
    if (event.type === 'event_msg' && p.type === 'token_count' && p.info?.total_token_usage) {
      const total = normalize(p.info.total_token_usage);
      const usage = total.total >= this.previous.total ? delta(total, this.previous) : normalize(p.info.last_token_usage);
      this.previous = total;
      if (usage.total && this.turnId) {
        const id = `legacy:${this.turnId}:${event.ordinal ?? event.timestamp}`;
        this.legacy.set(id, { id, turnId: this.turnId, time, usage, quality: 'estimated' });
        this.lastRecordAt = Math.max(this.lastRecordAt || 0, time);
      }
    }
    // task_complete deliberately does NOT complete the overarching objective.
  }
  records() {
    if (this.orderedRecords) return this.orderedRecords;
    const exactTurns = new Set([...this.responses.values()].map(x => x.turnId));
    return this.orderedRecords = [...this.responses.values(), ...[...this.legacy.values()].filter(x => !exactTurns.has(x.turnId))]
      .sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  }
  messageBoundary({ messageId, sentAtMs } = {}) {
    const message = this.messages.get(messageId) ?? (typeof messageId === 'string' ? [...this.messages.values()].find(m => messageId.includes(m.id) || (m.callId && messageId.includes(m.callId))) : null);
    const time = message?.time ?? (Number.isFinite(sentAtMs) && sentAtMs > 0 ? sentAtMs : null);
    if (time == null) return { messageTime: null, nextMessageTime: null, turnId: message?.turnId ?? null };
    const next = [...this.messages.values()].filter(m => m.time > time).sort((a,b) => a.time-b.time)[0];
    return { messageTime: time, nextMessageTime: next?.time ?? null, turnId: message?.turnId ?? this.turnAt(time)?.id ?? null };
  }
  turnAt(time) {
    return [...this.turns.values()].filter(t => t.startedAt != null && t.startedAt <= time)
      .sort((a,b) => b.startedAt-a.startedAt)[0] ?? null;
  }
  turnBoundary(turnId) {
    let turn = this.turns.get(turnId);
    if (!turn || turn.startedAt == null) {
      const first = this.records().find(r => r.turnId === turnId);
      if (first) turn = { id: turnId, startedAt: first.time, completedAt: turn?.completedAt ?? null };
    }
    if (!turn || turn.startedAt == null) return null;
    const next = [...this.turns.values()].filter(t => t.startedAt != null && t.startedAt > turn.startedAt)
      .sort((a,b) => a.startedAt-b.startedAt)[0];
    return { ...turn, frozen: turn.completedAt != null || next != null };
  }
  snapshot({ from = 0, through = Infinity, turnId = null, throughTurnId = null } = {}) {
    const boundary = throughTurnId ? this.turnBoundary(throughTurnId) : null;
    const records = this.records().filter(r => {
      if (r.time < from || r.time > through || turnId && r.turnId !== turnId) return false;
      if (!boundary || r.turnId === throughTurnId) return true;
      const other = this.turns.get(r.turnId);
      return (other?.startedAt ?? r.time) < boundary.startedAt;
    });
    return {
      usage: records.reduce((u, r) => sum(u, r.usage), emptyUsage()),
      hasData: records.length > 0, calls: records.length,
      estimated: records.some(r => r.quality === 'estimated'),
      lastRecordAt: records.at(-1)?.time ?? null,
      coverage: this.unknownLines ? 'partial' : 'local',
    };
  }
}
