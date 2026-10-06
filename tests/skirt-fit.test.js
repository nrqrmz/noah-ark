import test from 'node:test';
import assert from 'node:assert/strict';
import { fitTable, FIT_TABLE_CONSTANTS, FIT_DECIMALS } from '../characters/skirt.js';

test('precomputed skirt fit tables match the sampler', () => {
  assert.deepEqual([...FIT_TABLE_CONSTANTS.keys()].sort(), [0.1, 0.3]);
  const tol = 10 ** -FIT_DECIMALS;
  for (const [hem, constants] of FIT_TABLE_CONSTANTS) {
    const fresh = fitTable(hem);
    assert.equal(constants.length, fresh.length);
    fresh.forEach((v, i) => {
      assert.ok(constants[i] <= v + 1e-12, `hem ${hem}[${i}] must not exceed the exact fit`);
      assert.ok(v - constants[i] < tol, `hem ${hem}[${i}]: ${constants[i]} vs ${v}`);
    });
  }
});
