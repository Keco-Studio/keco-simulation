import { describe, it, expect } from 'vitest';
import type { BattleSession } from '@keco/battle-core';
import {
  battleEventsToContributions,
  contributionsFromBattleEvents,
  deriveEnemyLevelFromSession,
  type BattleEventMapperState,
} from '../sources/battleEventSource';

function minimalSession(overrides: Partial<BattleSession> = {}): BattleSession {
  return {
    id: 's1',
    tick: 10,
    phase: 'battle',
    preparationEndTick: 0,
    result: 'left_win',
    mapBounds: { minX: 0, maxX: 20, minY: 0, maxY: 12 },
    left: {
      id: 'player',
      name: 'Hero',
      team: 'left',
      position: { x: 5, y: 6 },
      resources: { hp: 100, maxHp: 100, mp: 50, maxMp: 50, shield: 0, rage: 0, maxRage: 100 },
      atk: 120,
      def: 80,
      spd: 100,
      skillSlots: [],
      defending: false,
      alive: true,
      effects: [],
    },
    right: {
      id: 'enemy',
      name: 'Slime',
      team: 'right',
      position: { x: 15, y: 6 },
      resources: { hp: 0, maxHp: 200, mp: 0, maxMp: 0, shield: 0, rage: 0, maxRage: 0 },
      atk: 60,
      def: 30,
      spd: 50,
      skillSlots: [],
      defending: false,
      alive: false,
      effects: [],
    },
    commandQueue: [],
    chaseState: { status: 'none' },
    movementState: {},
    events: [],
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

describe('deriveEnemyLevelFromSession', () => {
  it('returns a positive proxy from enemy stats', () => {
    const lvl = deriveEnemyLevelFromSession(minimalSession());
    expect(lvl).toBeGreaterThan(0);
  });
});

describe('battleEventsToContributions', () => {
  it('maps player damage_applied to deal_damage with skillId', () => {
    const session = minimalSession({
      events: [
        {
          eventId: 'e1',
          sessionId: 's1',
          tick: 5,
          type: 'damage_applied',
          payload: { actorId: 'player', targetId: 'enemy', damage: 420, skillId: 'firebolt' },
          createdAt: 1,
        },
      ],
    });
    expect(battleEventsToContributions(session)).toEqual([
      {
        type: 'deal_damage',
        amount: 420,
        step: 0,
        ctx: { skillId: 'firebolt', targetId: 'enemy' },
      },
    ]);
  });

  it('maps player cast_skill action_executed', () => {
    const session = minimalSession({
      events: [
        {
          eventId: 'e2',
          sessionId: 's1',
          tick: 3,
          type: 'action_executed',
          payload: { actorId: 'player', action: 'cast_skill', skillId: 'firebolt', skillName: 'Firebolt' },
          createdAt: 1,
        },
      ],
    });
    expect(battleEventsToContributions(session)).toEqual([
      { type: 'cast_skill', amount: 1, step: 0, ctx: { skillId: 'firebolt' } },
    ]);
  });

  it('emits kill_enemy once on left_win battle_ended', () => {
    const session = minimalSession({
      events: [
        {
          eventId: 'e3',
          sessionId: 's1',
          tick: 20,
          type: 'battle_ended',
          payload: { result: 'left_win', reason: 'right_defeated' },
          createdAt: 1,
        },
      ],
    });
    const out = battleEventsToContributions(session);
    expect(out).toEqual([
      { type: 'kill_enemy', amount: 1, step: 0, ctx: { enemyName: 'Slime' } },
    ]);
  });

  it('incremental slices do not duplicate kill_enemy', () => {
    const session = minimalSession();
    const state: BattleEventMapperState = { killEmitted: false };
    const slice1 = contributionsFromBattleEvents(
      [
        {
          type: 'damage_applied',
          payload: { actorId: 'player', damage: 100, skillId: 'firebolt' },
        },
      ],
      session,
      {},
      state
    );
    expect(slice1).toHaveLength(1);
    const slice2 = contributionsFromBattleEvents(
      [
        {
          type: 'battle_ended',
          payload: { result: 'left_win', reason: 'right_defeated' },
        },
        {
          type: 'battle_ended',
          payload: { result: 'left_win', reason: 'right_defeated' },
        },
      ],
      session,
      {},
      state
    );
    expect(slice2.filter((c) => c.type === 'kill_enemy')).toHaveLength(1);
  });
});
