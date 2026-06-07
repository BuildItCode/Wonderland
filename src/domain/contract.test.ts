import { describe, it, expect } from 'vitest';
import { contractBodySchema, contractVersionSchema } from './contract.js';

describe('contractBodySchema', () => {
  it('defaults terms to an empty array', () => {
    const result = contractBodySchema.safeParse({ title: 'v1', interface: 'POST /charges' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.terms).toEqual([]);
    }
  });

  it('rejects an empty title', () => {
    expect(contractBodySchema.safeParse({ title: '', interface: 'x' }).success).toBe(false);
  });
});

describe('contractVersionSchema', () => {
  it('accepts a version with defaulted signatures and no supersededBy', () => {
    const result = contractVersionSchema.safeParse({
      version: 1,
      proposedBy: 'p_1',
      body: { title: 'v1', interface: 'POST /charges' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.signatures).toEqual([]);
      expect(result.data.supersededBy).toBeUndefined();
    }
  });

  it('records signatures and a supersededBy pointer', () => {
    const result = contractVersionSchema.safeParse({
      version: 1,
      proposedBy: 'p_1',
      body: { title: 'v1', interface: 'x' },
      signatures: ['p_1', 'p_2'],
      supersededBy: 2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.signatures).toHaveLength(2);
      expect(result.data.supersededBy).toBe(2);
    }
  });

  it('rejects a non-positive version', () => {
    expect(
      contractVersionSchema.safeParse({
        version: 0,
        proposedBy: 'p_1',
        body: { title: 'v1', interface: 'x' },
      }).success,
    ).toBe(false);
  });
});
