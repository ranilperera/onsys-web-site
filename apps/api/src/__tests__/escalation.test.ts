import { describe, it, expect } from 'vitest';
import { wantsHuman, reportsIncident } from '../lib/escalation';

describe('wantsHuman', () => {
  it('detects explicit requests for a person', () => {
    expect(wantsHuman('can I speak to a human')).toBe(true);
    expect(wantsHuman('I want to talk with someone')).toBe(true);
    expect(wantsHuman('put me through to a real person')).toBe(true);
    expect(wantsHuman('call me back please')).toBe(true);
  });

  it('detects an unhappy visitor', () => {
    expect(wantsHuman('this is useless')).toBe(true);
    expect(wantsHuman('I want to make a complaint')).toBe(true);
  });

  it('leaves ordinary questions to the assistant', () => {
    expect(wantsHuman('what database platforms do you support?')).toBe(false);
    expect(wantsHuman('how much does managed database support cost')).toBe(false);
    expect(wantsHuman('do you work with PostgreSQL')).toBe(false);
  });

  it('no longer claims incidents — those go to the phone, not the chat queue', () => {
    expect(wantsHuman('our database is down')).toBe(false);
    expect(wantsHuman('we think we have a ransomware incident')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(wantsHuman('SPEAK TO A HUMAN')).toBe(true);
  });
});

describe('reportsIncident', () => {
  it('detects a live outage', () => {
    expect(reportsIncident('our database is down')).toBe(true);
    expect(reportsIncident('production is offline')).toBe(true);
    expect(reportsIncident('we have an outage')).toBe(true);
    expect(reportsIncident('the website is not working')).toBe(true);
  });

  it('detects security and data-loss incidents', () => {
    expect(reportsIncident('we think we have a ransomware incident')).toBe(true);
    expect(reportsIncident('there has been a breach')).toBe(true);
    expect(reportsIncident('the database is corrupted')).toBe(true);
    expect(reportsIncident("we can't restore last night's backup")).toBe(true);
  });

  it('does not fire on "down" used commercially', () => {
    // The reason "down" is only matched beside something that can be down:
    // an outage script in reply to a pricing question reads as if nobody is
    // listening, and it would send buyers to the emergency line.
    expect(reportsIncident('are your prices coming down next year?')).toBe(false);
    expect(reportsIncident('we want to bring our costs down')).toBe(false);
    expect(reportsIncident('can you help us scale down the instance')).toBe(false);
  });

  it('leaves ordinary questions alone', () => {
    expect(reportsIncident('what database platforms do you support?')).toBe(false);
    expect(reportsIncident('do you offer disaster recovery consulting')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(reportsIncident('OUR PRODUCTION DATABASE IS DOWN')).toBe(true);
  });
});
