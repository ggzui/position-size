export function calculatePosition(values) {
  const errors = {};
  const numbers = {};
  const hasTarget = values.target != null && String(values.target).trim() !== '';

  for (const field of ['balance', 'risk', 'leverage', 'entry', 'stop', ...(hasTarget ? ['target'] : [])]) {
    const raw = values[field];
    numbers[field] = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(numbers[field]) || numbers[field] <= 0) {
      errors[field] = '请输入大于 0 的有效数字';
    }
  }

  if (numbers.risk > 100) errors.risk = '单笔风险不能超过 100%';
  if (errors.leverage || numbers.leverage < 1) errors.leverage = '请输入不小于 1 的有效杠杆倍数';
  if (!errors.entry && !errors.stop && numbers.stop === numbers.entry) errors.stop = '止损价格不能等于入场价格';
  const direction = !errors.entry && !errors.stop ? (numbers.stop > numbers.entry ? 'short' : 'long') : null;
  if (hasTarget && direction && !errors.target) {
    if (direction === 'long' && numbers.target <= numbers.entry) errors.target = '做多目标价必须高于入场价';
    if (direction === 'short' && numbers.target >= numbers.entry) errors.target = '做空目标价必须低于入场价';
  }
  if (Object.keys(errors).length) return { errors, result: null, direction };

  const distance = Math.abs(numbers.entry - numbers.stop);
  const riskAmount = numbers.balance * (numbers.risk / 100);
  const quantity = riskAmount / distance;
  const notional = quantity * numbers.entry;
  const margin = notional / numbers.leverage;
  const reward = hasTarget ? Math.abs(numbers.target - numbers.entry) : null;
  const result = {
    quantity,
    riskAmount,
    notional,
    margin,
    marginUsage: (margin / numbers.balance) * 100,
    stopPercent: (distance / numbers.entry) * 100,
    rewardRisk: hasTarget ? reward / distance : null,
    profit: hasTarget ? quantity * reward : null,
  };
  if (Object.values(result).some(value => value !== null && (!Number.isFinite(value) || value <= 0))) {
    return { errors: { entry: '数值超出可计算范围，请调整资金或价格' }, result: null, direction };
  }
  return { errors, result, direction };
}
