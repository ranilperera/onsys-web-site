import { describe, it, expect } from 'vitest';
import { wantsHuman } from '../lib/escalation';

describe('wantsHuman', () => {
  it('detects explicit requests for a person', () => {
    expect(wantsHuman('can I speak to a human')).toBe(true);
    expect(wantsHuman('I want to talk with someone')).toBe(true);
    expect(wantsHuman('put me through to a real person')).toBe(true);
    expect(wantsHuman('call me back please')).toBe(true);
  });

  it('escalates anything time-critical', () => {
    expect(wantsHuman('our database is down')).toBe(true);
    expect(wantsHuman('this is urgent')).toBe(true);
    expect(wantsHuman('we think we have a ransomware incident')).toBe(true);
    expect(wantsHuman('production is offline')).toBe(true);
  });

  it('leaves ordinary questions to the assistant', () => {
    expect(wantsHuman('what database platforms do you support?')).toBe(false);
    expect(wantsHuman('how much does managed database support cost')).toBe(false);
    expect(wantsHuman('do you work with PostgreSQL')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(wantsHuman('SPEAK TO A HUMAN')).toBe(true);
  });
});
