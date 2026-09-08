import { validId } from './collector.mjs';

/** Completion is explicit. A completed model turn, idle time, or gray toolbar is never evidence. */
export function createObjective({ id, threadId, startedAt = 0 }) {
  if (!validId(id) || !validId(threadId) || !Number.isFinite(startedAt) || startedAt < 0) throw new Error('Invalid objective');
  return { id, threadId, startedAt, status: 'active', completedAt: null };
}
export function completeObjective(objective, { at, evidence }) {
  if (!['explicit-user', 'native-goal-complete'].includes(evidence)) throw new Error('Explicit completion evidence required');
  if (!Number.isFinite(at) || at < objective.startedAt) throw new Error('Invalid completion time');
  if (objective.status === 'complete') return objective;
  return { ...objective, status: 'complete', completedAt: at, evidence };
}
export function objectiveSnapshot(ledger, objective) {
  return { ...ledger.snapshot({ from: objective.startedAt, through: objective.completedAt ?? Infinity }),
    objectiveId: objective.id, status: objective.status, completedAt: objective.completedAt };
}
