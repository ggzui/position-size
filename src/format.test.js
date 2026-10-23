import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePosition } from './calculator.js';
import { formatResultValue } from './format.js';

test('用户示例的四项结果统一四舍五入为两位小数', () => {
  const { result } = calculatePosition({ balance: '100', risk: '4', leverage: '10', entry: '1204.48', stop: '1187.20', target: '1267.57', direction: 'long' });
  assert.deepEqual([result.quantity, result.notional, result.margin, result.marginUsage].map(formatResultValue), ['0.23', '278.81', '27.88', '27.88']);
});

test('保留尾零并正确处理五入、进位及极小数', () => {
  for (const [value, expected] of [[0, '0.00'], [4, '4.00'], [1.005, '1.01'], [9.999, '10.00'], [0.004, '0.00'], [1000, '1,000.00']]) {
    assert.equal(formatResultValue(value), expected);
  }
});
