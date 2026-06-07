import { describe, it, expect } from 'vitest';
import { speechActSchema, messageSchema } from './speech-acts.js';

describe('speechActSchema', () => {
  it('accepts a propose with an optional title', () => {
    expect(
      speechActSchema.safeParse({ act: 'propose', payload: { text: '1 + 1 = 2' } }).success,
    ).toBe(true);
    expect(
      speechActSchema.safeParse({ act: 'propose', payload: { title: 'sum', text: '1 + 1 = 2' } })
        .success,
    ).toBe(true);
  });

  it('accepts agree (with optional note), block, and say', () => {
    expect(speechActSchema.safeParse({ act: 'agree', payload: {} }).success).toBe(true);
    expect(speechActSchema.safeParse({ act: 'agree', payload: { note: 'lgtm' } }).success).toBe(true);
    expect(
      speechActSchema.safeParse({ act: 'block', payload: { reason: 'needs retries' } }).success,
    ).toBe(true);
    expect(speechActSchema.safeParse({ act: 'say', payload: { text: 'hello' } }).success).toBe(true);
  });

  it('rejects an unknown act tag', () => {
    expect(speechActSchema.safeParse({ act: 'shout', payload: {} }).success).toBe(false);
  });

  it('rejects a payload that does not match its act', () => {
    expect(
      speechActSchema.safeParse({ act: 'block', payload: { text: 'not a reason' } }).success,
    ).toBe(false);
  });

  it('rejects a missing required field', () => {
    expect(speechActSchema.safeParse({ act: 'propose', payload: {} }).success).toBe(false);
    expect(speechActSchema.safeParse({ act: 'block', payload: {} }).success).toBe(false);
  });

  it('rejects unknown extra fields (strict)', () => {
    expect(
      speechActSchema.safeParse({ act: 'say', payload: { text: 'hi', sneaky: true } }).success,
    ).toBe(false);
  });
});

describe('messageSchema', () => {
  const base = { id: 'm_1', from: 'p_1', ts: 1000 };

  it('accepts a well-formed transcript entry', () => {
    expect(
      messageSchema.safeParse({ ...base, act: 'propose', payload: { text: 'plan' } }).success,
    ).toBe(true);
  });

  it('rejects a message missing envelope metadata', () => {
    expect(
      messageSchema.safeParse({ from: 'p_1', ts: 1000, act: 'say', payload: { text: 'x' } }).success,
    ).toBe(false);
  });

  it('rejects an unknown top-level field', () => {
    expect(
      messageSchema.safeParse({ ...base, act: 'say', payload: { text: 'x' }, spoof: 1 }).success,
    ).toBe(false);
  });
});
