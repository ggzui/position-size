import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePosition } from './calculator.js';

const sample = { balance: '10000', risk: '4', leverage: '10', entry: '65000', stop: '63000', target: '71000' };

test('按风险计算做多仓位和目标收益', () => {
  const { errors, result, direction } = calculatePosition(sample);
  assert.deepEqual(errors, {});
  assert.equal(direction, 'long');
  assert.equal(result.quantity, 0.2);
  assert.equal(result.riskAmount, 400);
  assert.equal(result.notional, 13000);
  assert.equal(result.margin, 1300);
  assert.equal(result.marginUsage, 13);
  assert.ok(Math.abs(result.stopPercent - 3.076923076923077) < 1e-12);
  assert.equal(result.profit, 1200);
  assert.equal(result.rewardRisk, 3);
});

test('做空和空目标价', () => {
  const short = calculatePosition({ ...sample, stop: 67000, target: 59000 });
  assert.deepEqual(short.errors, {});
  assert.equal(short.direction, 'short');
  assert.equal(short.result.quantity, 0.2);
  assert.equal(short.result.profit, 1200);
  assert.equal(short.result.rewardRisk, 3);
  for (const target of ['', '  ', null, undefined]) {
    const { errors, result } = calculatePosition({ ...sample, target });
    assert.deepEqual(errors, {});
    assert.equal(result.profit, null);
    assert.equal(result.rewardRisk, null);
  }
});

test('止损等于入场或目标价与自动方向冲突时返回字段错误', () => {
  for (const [changes, field] of [
    [{ stop: 65000 }, 'stop'],
    [{ target: 65000 }, 'target'],
    [{ target: 63000 }, 'target'],
    [{ stop: 67000, target: 65000 }, 'target'],
    [{ stop: 67000, target: 71000 }, 'target'],
  ]) {
    const { errors, result } = calculatePosition({ ...sample, ...changes });
    assert.ok(errors[field], `${field} 应有错误`);
    assert.equal(result, null);
  }
});

test('方向仅由有效入场价与止损价推断，不受其它参数错误影响', () => {
  for (const field of ['entry', 'stop']) {
    for (const value of ['', '  ', null, undefined, 0, -1, 'abc', Infinity, NaN, true]) {
      const { direction, result } = calculatePosition({ ...sample, [field]: value });
      assert.equal(direction, null);
      assert.equal(result, null);
    }
  }
  assert.equal(calculatePosition({ ...sample, stop: sample.entry }).direction, null);
  assert.equal(calculatePosition({ ...sample, balance: '' }).direction, 'long');
  assert.equal(calculatePosition({ ...sample, stop: 67000 }).direction, 'short');
  assert.equal(calculatePosition({ ...sample, entry: 62000, target: '' }).direction, 'short');
});

test('拒绝非正数、非数及超过 100% 的风险', () => {
  for (const field of ['balance', 'risk', 'leverage', 'entry', 'stop', 'target']) {
    for (const value of [0, -1, 'abc', Infinity, NaN, true]) {
      const { errors, result } = calculatePosition({ ...sample, [field]: value });
      assert.ok(errors[field], `${field} 不应接受 ${value}`);
      assert.equal(result, null);
    }
  }
  assert.ok(calculatePosition({ ...sample, risk: 101 }).errors.risk);
  assert.deepEqual(calculatePosition({ ...sample, risk: 100 }).errors, {});
});

test('杠杆只影响保证金，不改变风险仓位或盈亏', () => {
  for (const [leverage, margin, marginUsage] of [[1, 13000, 130], [2.5, 5200, 52], [10, 1300, 13], [1000, 13, 0.13]]) {
    const { errors, result } = calculatePosition({ ...sample, leverage });
    assert.deepEqual(errors, {});
    assert.equal(result.quantity, 0.2);
    assert.equal(result.riskAmount, 400);
    assert.equal(result.profit, 1200);
    assert.equal(result.notional, 13000);
    assert.equal(result.margin, margin);
    assert.equal(result.marginUsage, marginUsage);
  }
});

test('杠杆必填且必须为不小于 1 的有限数', () => {
  for (const leverage of [undefined, null, '', 0, -1, 0.5, 'abc', Infinity, NaN, true]) {
    const { errors, result } = calculatePosition({ ...sample, leverage });
    assert.ok(errors.leverage);
    assert.equal(result, null);
  }
});

test('超出账户资金仍保留风险仓位供界面提示', () => {
  const { errors, result } = calculatePosition({ ...sample, stop: 64999, target: '' });
  assert.deepEqual(errors, {});
  assert.equal(result.quantity, 400);
  assert.equal(result.notional, 26000000);
  assert.equal(result.margin, 2600000);
  assert.equal(result.marginUsage, 26000);
});

test('拒绝造成溢出或下溢的极端输入', () => {
  for (const changes of [
    { balance: Number.MAX_VALUE, risk: 100, entry: 2, stop: 1, target: '' },
    { balance: 1, risk: 100, entry: Number.MIN_VALUE * 2, stop: Number.MIN_VALUE, target: '' },
    { balance: Number.MIN_VALUE, risk: Number.MIN_VALUE, target: '' },
    { balance: 1e-100, risk: 100, entry: 1e-100, stop: 5e-101, leverage: 1e308, target: '' },
    { balance: 1e200, risk: 1e-100, leverage: 1e308, entry: 100, stop: 1, target: '' },
  ]) {
    const { errors, result } = calculatePosition({ ...sample, ...changes });
    assert.ok(errors.entry);
    assert.equal(result, null);
  }
});
