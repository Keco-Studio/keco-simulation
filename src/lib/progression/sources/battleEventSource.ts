import type { BattleSession } from '@keco/battle-core';
import type { Contribution } from '../types';

export interface BattleContributionContext {
  /** Which entity id counts as the player (defaults to session.left.id). */
  playerId?: string;
  /** Proxy enemy level for rules referencing enemyLevel (derived from enemy stats if omitted). */
  enemyLevel?: number;
  /** Step index assigned to all contributions from this battle (default 0). */
  step?: number;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

/** Rough proxy when battle entities have no explicit level field. */
export function deriveEnemyLevelFromSession(session: BattleSession): number {
  const e = session.right;
  return Math.max(1, Math.round((e.atk + e.def + e.resources.maxHp / 10) / 15));
}

/**
 * Map a finished battle's event log into progression Contribution[].
 * Only player-side actions count as "付出" (left team by default).
 */
export function battleEventsToContributions(
  session: BattleSession,
  ctx: BattleContributionContext = {}
): Contribution[] {
  const playerId = ctx.playerId ?? session.left.id;
  const enemyLevel = ctx.enemyLevel ?? deriveEnemyLevelFromSession(session);
  const step = ctx.step ?? 0;
  const out: Contribution[] = [];

  let killEmitted = false;

  for (const ev of session.events) {
    const p = ev.payload;

    if (ev.type === 'damage_applied') {
      const actorId = str(p.actorId);
      if (actorId !== playerId) continue;
      const damage = num(p.damage);
      if (damage <= 0) continue;
      const skillId = str(p.skillId);
      out.push({
        type: 'deal_damage',
        amount: damage,
        step,
        ctx: {
          enemyLevel,
          ...(skillId ? { skillId } : {}),
          ...(str(p.targetId) ? { targetId: str(p.targetId)! } : {}),
        },
      });
      continue;
    }

    if (ev.type === 'action_executed') {
      const actorId = str(p.actorId);
      if (actorId !== playerId) continue;
      const action = str(p.action);
      const skillId = str(p.skillId);
      if (action === 'cast_skill' && skillId) {
        out.push({
          type: 'cast_skill',
          amount: 1,
          step,
          ctx: { skillId },
        });
      }
      continue;
    }

    if (ev.type === 'battle_ended' && !killEmitted) {
      const result = str(p.result) ?? session.result;
      if (result === 'left_win') {
        killEmitted = true;
        out.push({
          type: 'kill_enemy',
          amount: 1,
          step,
          ctx: { enemyLevel, enemyName: session.right.name },
        });
      }
    }
  }

  return out;
}
