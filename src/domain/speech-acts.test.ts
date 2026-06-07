import { describe, it, expect } from 'vitest';
import { speechActSchema, messageSchema } from './speech-acts.js';

describe('speechActSchema', () => {
  it('accepts a capability inform with defaulted constraints', () => {
    const result = speechActSchema.safeParse({
      act: 'inform',
      payload: { kind: 'capability', service: 'payments', surface: 'POST /charges' },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.act === 'inform' && result.data.payload.kind === 'capability') {
      expect(result.data.payload.constraints).toEqual([]);
    }
  });

  it('accepts a result inform and a note inform', () => {
    expect(
      speechActSchema.safeParse({
        act: 'inform',
        payload: { kind: 'result', summary: 'exposed webhook endpoint' },
      }).success,
    ).toBe(true);
    expect(
      speechActSchema.safeParse({ act: 'inform', payload: { kind: 'note', text: 'fyi' } }).success,
    ).toBe(true);
  });

  it('accepts propose, accept, reject (with counter), request, and failure', () => {
    expect(
      speechActSchema.safeParse({
        act: 'propose',
        payload: { body: { title: 'v1', interface: 'POST /charges' } },
      }).success,
    ).toBe(true);
    expect(speechActSchema.safeParse({ act: 'accept', payload: { version: 1 } }).success).toBe(true);
    expect(
      speechActSchema.safeParse({
        act: 'reject',
        payload: { version: 1, reason: 'needs idempotency', counter: { title: 'v2', interface: 'x' } },
      }).success,
    ).toBe(true);
    expect(
      speechActSchema.safeParse({ act: 'request', payload: { to: 'p_1', ask: 'share schema' } })
        .success,
    ).toBe(true);
  });

  it('defaults failure.fatal to false', () => {
    const result = speechActSchema.safeParse({ act: 'failure', payload: { reason: 'cannot build' } });
    expect(result.success).toBe(true);
    if (result.success && result.data.act === 'failure') {
      expect(result.data.payload.fatal).toBe(false);
    }
  });

  it('rejects an unknown act tag', () => {
    expect(speechActSchema.safeParse({ act: 'shout', payload: {} }).success).toBe(false);
  });

  it('rejects a payload that does not match its act', () => {
    expect(
      speechActSchema.safeParse({ act: 'accept', payload: { kind: 'note', text: 'x' } }).success,
    ).toBe(false);
  });

  it('rejects a missing required field', () => {
    expect(speechActSchema.safeParse({ act: 'reject', payload: { version: 1 } }).success).toBe(false);
  });

  it('rejects unknown extra fields (strict)', () => {
    expect(
      speechActSchema.safeParse({ act: 'accept', payload: { version: 1, sneaky: true } }).success,
    ).toBe(false);
  });

  it('rejects a non-positive contract version', () => {
    expect(speechActSchema.safeParse({ act: 'accept', payload: { version: 0 } }).success).toBe(false);
  });
});

describe('messageSchema', () => {
  const base = { id: 'm_1', from: 'p_1', ts: 1000 };

  it('accepts a well-formed transcript entry', () => {
    expect(
      messageSchema.safeParse({ ...base, act: 'accept', payload: { version: 2 } }).success,
    ).toBe(true);
  });

  it('rejects a message missing envelope metadata', () => {
    expect(
      messageSchema.safeParse({ from: 'p_1', ts: 1000, act: 'accept', payload: { version: 2 } })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(
      messageSchema.safeParse({ ...base, act: 'accept', payload: { version: 2 }, spoof: 1 }).success,
    ).toBe(false);
  });
});
