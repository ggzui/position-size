import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePosition, feeRate } from './calculator.js';

const sample = { balance: '10000', risk: '4', leverage: '10', entry: '65000', stop: '63000', target: '71000' };

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} 不接近 ${expected}`);
}

test('按含开平仓手续费的风险计算做多仓位和净收益', () => {
  const { errors, result, direction } = calculatePosition(sample);
  assert.deepEqual(errors, {});
  assert.equal(direction, 'long');
  assert.equal(feeRate, 0.0005);
  assert.equal(result.lossPerUnit, 2064);
  close(result.quantity, 0.1937984496124031);
  assert.equal(result.riskAmount, 400);
  close(result.notional, 12596.899224806202);
  close(result.margin, 1259.6899224806202);
  close(result.marginUsage, 12.596899224806202);
  close(result.entryFee, 6.298449612403101);
  close(result.stopFees, 12.403100775193798);
  close(result.targetFees, 13.178294573643411);
  assert.ok(Math.abs(result.stopPercent - 3.076923076923077) < 1e-12);
  close(result.profit, 1149.6124031007753);
  close(result.rewardRisk, 2.874031007751938);
});

test('做空和空目标价', () => {
  const short = calculatePosition({ ...sample, stop: 67000, target: 59000 });
  assert.deepEqual(short.errors, {});
  assert.equal(short.direction, 'short');
  assert.equal(short.result.lossPerUnit, 2066);
  close(short.result.quantity, 0.1936108422071636);
  close(short.result.stopFees, 12.778315585672798);
  close(short.result.targetFees, 12.003872216844143);
  close(short.result.profit, 1149.6611810261375);
  close(short.result.rewardRisk, 2.8741529525653435);
  assert.ok(short.result.quantity < calculatePosition(sample).result.quantity);
  for (const target of ['', '  ', null, undefined]) {
    const { errors, result } = calculatePosition({ ...sample, target });
    assert.deepEqual(errors, {});
    close(result.quantity, 0.1937984496124031);
    close(result.entryFee, 6.298449612403101);
    close(result.stopFees, 12.403100775193798);
    assert.equal(result.targetFees, null);
    assert.equal(result.profit, null);
    assert.equal(result.rewardRisk, null);
  }
});

test('多空止损总亏损含费等于风险预算，目标净收益只扣对应开平仓费用', () => {
  for (const values of [sample, { ...sample, stop: 67000, target: 59000 }]) {
    const { errors, result } = calculatePosition(values);
    assert.deepEqual(errors, {});
    close(result.quantity * Math.abs(Number(values.entry) - Number(values.stop)) + result.stopFees, result.riskAmount);
    close(result.stopFees, result.entryFee + result.quantity * Number(values.stop) * feeRate);
    close(result.targetFees, result.entryFee + result.quantity * Number(values.target) * feeRate);
    close(result.profit, result.quantity * Math.abs(Number(values.target) - Number(values.entry)) - result.targetFees);
    close(result.rewardRisk, result.profit / result.riskAmount);
  }
});

test('目标价方向有效且净收益为零时仍保留仓位结果', () => {
  for (const prices of [{ entry: 1999, stop: 1900, target: 2001 }, { entry: 2001, stop: 2100, target: 1999 }]) {
    const { errors, result } = calculatePosition({ ...sample, ...prices });
    assert.deepEqual(errors, {});
    assert.equal(result.profit, 0);
    assert.equal(result.rewardRisk, 0);
    assert.ok(result.quantity > 0);
    assert.ok(result.targetFees > 0);
  }
});

test('目标价涨跌幅不足手续费时允许负净收益和负净风险收益比', () => {
  for (const prices of [{ entry: 100, stop: 99, target: 100.01 }, { entry: 100, stop: 101, target: 99.99 }]) {
    const { errors, result } = calculatePosition({ ...sample, ...prices });
    assert.deepEqual(errors, {});
    assert.ok(Number.isFinite(result.profit) && result.profit < 0);
    assert.ok(Number.isFinite(result.rewardRisk) && result.rewardRisk < 0);
    close(result.rewardRisk, result.profit / result.riskAmount);
    assert.ok(result.quantity > 0);
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

test('杠杆只影响保证金，不改变风险仓位、手续费或净盈亏', () => {
  const { result: baseline } = calculatePosition(sample);
  for (const leverage of [1, 2.5, 10, 1000]) {
    const { errors, result } = calculatePosition({ ...sample, leverage });
    assert.deepEqual(errors, {});
    for (const field of ['quantity', 'riskAmount', 'notional', 'entryFee', 'stopFees', 'targetFees', 'profit', 'rewardRisk']) {
      assert.equal(result[field], baseline[field]);
    }
    close(result.margin, 12596.899224806202 / leverage);
    close(result.marginUsage, 125.96899224806202 / leverage);
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
  close(result.quantity, 6.060651974636171);
  close(result.notional, 393942.37835135115);
  close(result.margin, 39394.237835135115);
  close(result.marginUsage, 393.94237835135115);
});

test('拒绝造成溢出或下溢的极端输入', () => {
  for (const changes of [
    { balance: Number.MAX_VALUE, risk: 100, entry: 2, stop: 1, target: '' },
    { balance: 1, risk: 100, entry: Number.MIN_VALUE * 2, stop: Number.MIN_VALUE, target: '' },
    { balance: Number.MIN_VALUE, risk: Number.MIN_VALUE, target: '' },
    { balance: 1e-100, risk: 100, entry: 1e-100, stop: 5e-101, leverage: 1e308, target: '' },
    { balance: 1e200, risk: 1e-100, leverage: 1e308, entry: 100, stop: 1, target: '' },
    { balance: 100, risk: 4, entry: Number.MAX_VALUE, stop: 1, target: '' },
    { balance: 1, risk: 100, entry: 1, stop: 0.5, target: Number.MAX_VALUE },
    { balance: Number.MIN_VALUE, risk: 100, leverage: 1, entry: 1, stop: 0.5, target: '' },
  ]) {
    const { errors, result } = calculatePosition({ ...sample, ...changes });
    assert.ok(errors.entry);
    assert.equal(result, null);
  }
});
