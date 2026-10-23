import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePosition } from './calculator.js';
import { formatQuantity, formatResultValue } from './format.js';

test('用户示例数量最多六位，其余三项固定两位小数', () => {
  const { result } = calculatePosition({ balance: '100', risk: '4', leverage: '10', entry: '1204.48', stop: '1187.20', target: '1267.57' });
  assert.equal(formatQuantity(result.quantity), '0.231481');
  assert.deepEqual([result.notional, result.margin, result.marginUsage].map(formatResultValue), ['278.81', '27.88', '27.88']);
});

test('合约数量最多六位、去掉尾零并正确舍入', () => {
  for (const [value, expected] of [[0, '0'], [4, '4'], [0.2, '0.2'], [1.23456, '1.23456'], [1.2345674, '1.234567'], [1.2345675, '1.234568'], [9.9999999, '10'], [0.000001, '0.000001'], [0.0000004, '0'], [1000.25, '1,000.25']]) {
    assert.equal(formatQuantity(value), expected);
  }
});

test('保留尾零并正确处理五入、进位及极小数', () => {
  for (const [value, expected] of [[0, '0.00'], [4, '4.00'], [1.005, '1.01'], [9.999, '10.00'], [0.004, '0.00'], [1000, '1,000.00']]) {
    assert.equal(formatResultValue(value), expected);
  }
});
