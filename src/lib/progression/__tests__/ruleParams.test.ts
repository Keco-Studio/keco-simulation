import { describe, it, expect } from 'vitest';
import {
  isValidRuleParamsJson,
  parseRuleParamsJson,
  stringifyRuleParams,
} from '../ruleParams';

describe('ruleParams', () => {
  it('parses numeric JSON object', () => {
    expect(parseRuleParamsJson('{"damageRatio":0.1,"levelBonus":5}')).toEqual({
      damageRatio: 0.1,
      levelBonus: 5,
    });
  });

  it('coerces numeric strings', () => {
    expect(parseRuleParamsJson('{"expPerKill":"75"}')).toEqual({ expPerKill: 75 });
  });

  it('rejects invalid JSON', () => {
    expect(() => parseRuleParamsJson('{')).toThrow();
    expect(isValidRuleParamsJson('{')).toBe(false);
  });

  it('stringify round-trips', () => {
    const params = { castProficiencyRate: 10 };
    expect(parseRuleParamsJson(stringifyRuleParams(params))).toEqual(params);
  });
});
