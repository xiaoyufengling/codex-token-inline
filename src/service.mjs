import { Collector, validId } from './collector.mjs';
import { readStore, defaultStore } from './store.mjs';
import { createObjective } from './objective.mjs';
export class UsageService {
  constructor({ home, store = defaultStore() } = {}) { this.collector = new Collector(home); this.store = store; this.cache = new Map(); }
  async snapshot({ threadId, turnId, messageId, sentAtMs }) {
    if (!validId(threadId) || (turnId != null && !validId(turnId))) throw new Error('Invalid identifiers');
    if (messageId != null && (typeof messageId !== 'string' || messageId.length > 256)) throw new Error('Invalid message ID');
    if (sentAtMs != null && (!Number.isFinite(sentAtMs) || sentAtMs < 0)) throw new Error('Invalid message time');
    const ledger = await this.collector.readThread(threadId), store = await readStore(this.store);
    let boundary = ledger.messageBoundary({ messageId, sentAtMs });
    // The native end-of-turn toolbar has a turn ID but no message ID/time.
    // Resolve it to the final message of that turn instead of the whole thread.
    if (boundary.messageTime == null && turnId) {
      const last = [...ledger.messages.values()].filter(m => m.turnId === turnId).sort((a,b) => b.time-a.time)[0];
      if (last) boundary = ledger.messageBoundary({ messageId: last.id });
    }
    const ownerTurnId = boundary.turnId ?? turnId;
    const ownerTurn = ownerTurnId ? ledger.turnBoundary(ownerTurnId) : null;
    // Native message anchors also include questions rendered from tool calls.
    // Retain only numeric/opaque metadata, never the question or conversation text.
    let anchors = this.cache.get(threadId);
    if (!anchors) { anchors = new Set(); this.cache.set(threadId, anchors); }
    if (boundary.messageTime != null) anchors.add(boundary.messageTime);
    const nextObserved = boundary.messageTime == null ? null : [...anchors].filter(t => t > boundary.messageTime).sort((a,b) => a-b)[0];
    const nextTime = Math.min(boundary.nextMessageTime ?? Infinity, nextObserved ?? Infinity);
    const referenceTime = boundary.messageTime ?? ownerTurn?.startedAt ?? ledger.snapshot({ turnId }).lastRecordAt ?? Date.now();
    const explicit = store.objectives.filter(o => o.threadId === threadId && o.startedAt <= referenceTime &&
      (o.completedAt == null || referenceTime <= o.completedAt)).sort((a,b) => b.startedAt-a.startedAt)[0];
    // An active run keeps intervening questions/steering in one work scope.
    // Independent runs start fresh unless an explicit overarching goal joins them.
    const objective = explicit ?? createObjective({ id: ownerTurnId || threadId, threadId, startedAt: ownerTurn?.startedAt ?? 0 });
    // Default scope is one execution; its recorded end finalizes its display.
    // Explicit overarching goals keep their own lifecycle across executions.
    // This display status must not truncate late records belonging to this run.
    const endedRun = !explicit && ownerTurn?.completedAt != null;
    const result = { objectiveId: objective.id, status: endedRun ? 'complete' : objective.status,
      completedAt: endedRun ? ownerTurn.completedAt : objective.completedAt };
    const frozen = Number.isFinite(nextTime) || ownerTurn?.frozen === true;
    const scopeFilter = explicit ? { throughTurnId: ownerTurnId } : ownerTurnId ? { turnId: ownerTurnId } : {};
    const usage = ledger.snapshot({ from: objective.startedAt,
      through: Math.min(nextTime - 1, objective.completedAt ?? Infinity), ...scopeFilter });
    const earlierTimes = [...ledger.messages.values()].map(m => m.time).concat([...anchors])
      .filter(t => t >= objective.startedAt && boundary.messageTime != null && t < boundary.messageTime);
    const segmentFrom = earlierTimes.length ? boundary.messageTime : objective.startedAt;
    const segment = ledger.snapshot({ from: segmentFrom,
      through: Math.min(nextTime - 1, objective.completedAt ?? Infinity), ...scopeFilter });
    return { ...result, ...usage, segmentUsage: segment.usage, segmentHasData: segment.hasData, hasPriorSegments: earlierTimes.length > 0,
      scope: explicit ? 'explicit-objective' : ownerTurn ? 'run' : 'unresolved',
      frozen, threadId, turnId, messageId, observedAt: Date.now() };
  }
}
