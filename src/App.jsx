import { useEffect, useState } from 'react';
import { calculatePosition } from './calculator.js';
import { parsePastedPrice } from './price.js';
import { formatResultValue } from './format.js';

const example = { balance: '10000', risk: '4', leverage: '10', entry: '65000', stop: '63000', target: '71000', direction: 'long' };
const leverageOptions = ['1', '2', '3', '5', '10', '20', '25', '50', '75', '100'];
const preferencesKey = 'position-size:preferences';
const number = (value, decimals = 2) => new Intl.NumberFormat('en-US', value !== 0 && (Math.abs(value) < 10 ** -decimals || Math.abs(value) >= 1e12) ? { notation: 'scientific', maximumSignificantDigits: 4 } : { maximumFractionDigits: decimals }).format(value);

function loadValues() {
  const values = { ...example };
  try {
    const saved = JSON.parse(localStorage.getItem(preferencesKey));
    for (const field of ['balance', 'risk', 'leverage']) {
      if (saved && typeof saved[field] === 'string' && !calculatePosition({ ...example, [field]: saved[field] }).errors[field] && (field !== 'leverage' || leverageOptions.includes(saved[field]))) values[field] = saved[field];
    }
  } catch { /* 无法读取本地设置时使用默认值。 */ }
  return values;
}

function Icon({ name, size = 20, ...props }) {
  const paths = {
    bars: 'M5 19v-6m7 6V5m7 14V9',
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    up: 'm6 16 10-10M6 6h10v10',
    down: 'm6 8 10 10M6 18h10V8',
    shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-5',
    reset: 'M4 10a8 8 0 1 1 1 8M4 4v6h6',
    info: 'M12 11v6m0-10v.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    check: 'm5 12 4 4L19 6',
    copy: 'M9 9h11v12H9zM15 9V3H3v12h6',
    lock: 'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}

function Field({ id, label, suffix, value, onChange, error, optional, onPastePrice }) {
  return <div className="field">
    <label htmlFor={id}>{label}{optional && <span className="optional">选填</span>}</label>
    <div className={`input-wrap ${error ? 'invalid' : ''}`}>
      <input id={id} name={id} type="number" min="0" step="any" inputMode="decimal" value={value} placeholder={optional ? '输入目标价格' : '0'} onChange={event => onChange(id, event.target.value)} onPaste={onPastePrice ? event => { event.preventDefault(); onPastePrice(id, event.clipboardData.getData('text')); } : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
      <span className="input-suffix">{suffix}</span>
    </div>
    {error && <span className="field-error" id={`${id}-error`}>{error}</span>}
  </div>;
}

function PlanChart({ values, result }) {
  const long = values.direction === 'long';
  const entryY = values.target ? (long ? 120 : 85) : (long ? 60 : 150);
  const stopY = long ? 180 : 25;
  const targetY = long ? 25 : 180;
  const points = [
    ...(values.target ? [{ label: '止盈价格', value: values.target, color: 'positive', profit: result?.profit, sign: '+', position: targetY }] : []),
    { label: '入场价格', value: values.entry, color: 'neutral', profit: null, position: entryY },
    { label: '止损价格', value: values.stop, color: 'negative', profit: result?.riskAmount, sign: '−', position: stopY },
  ];
  return <section className="plan-card card" aria-labelledby="plan-title">
    <div className="section-heading"><h2 id="plan-title">让风险，看得见</h2><span className="subtle">价格区间示意 · 间距非比例</span></div>
    {result ? <>
      <div className="plan-chart">
        <svg className="plan-drawing" viewBox="0 0 580 218" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="reward-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8d7a8" stopOpacity=".23"/><stop offset="1" stopColor="#b8d7a8" stopOpacity=".02"/></linearGradient></defs>
          {values.target && <rect x="0" y={Math.min(targetY, entryY)} width="580" height={Math.abs(targetY - entryY)} fill="url(#reward-fill)" />}
          <rect x="0" y={Math.min(stopY, entryY)} width="580" height={Math.abs(stopY - entryY)} fill="#fdf1ed" opacity=".6" />
          {points.map(point => <line key={point.label} x1="0" y1={point.position} x2="580" y2={point.position} stroke={point.position === entryY ? '#b1bcb3' : '#d7dfd4'} strokeDasharray={point.position === entryY ? '0' : '4 5'} />)}
          {values.target && <text x="290" y={(targetY + entryY) / 2 + 4} textAnchor="middle" fill="#7e9a6d" fontSize="12">目标区间 · {number(result.rewardRisk)}R</text>}
          <text x="290" y={(stopY + entryY) / 2 + 4} textAnchor="middle" fill="#b28c78" fontSize="11">风险区间 · 1R</text>
        </svg>
        {points.map(point => <div className={`price-level ${point.color}`} key={point.label} style={{ top: `${point.position / 218 * 100}%` }}><span>{point.label}<b>{point.value ? number(Number(point.value)) : '未设置'}</b></span>{point.profit !== null && point.profit !== undefined && <strong>{point.sign}{number(point.profit)} <small>USDT</small></strong>}</div>)}
      </div>
      <div className="chart-legend"><span><i className="legend-dot" />{long ? '做多' : '做空'}计划 · 仅展示设定价格，不代表行情</span><span>价格单位 USDT</span></div>
    </> : <div className="chart-empty"><Icon name="bars" size={28} /><p>完善交易参数，即可查看计划示意</p></div>}
  </section>;
}

export default function App() {
  const [values, setValues] = useState(loadValues);
  const [copyState, setCopyState] = useState('');
  const [pasteErrors, setPasteErrors] = useState({});
  const [storageFailed, setStorageFailed] = useState(false);
  const { errors, result } = calculatePosition(values);
  const update = (id, value) => { setValues(current => ({ ...current, [id]: value })); setPasteErrors(current => ({ ...current, [id]: '' })); setCopyState(''); };

  useEffect(() => {
    if (errors.balance || errors.risk || errors.leverage) return;
    try {
      localStorage.setItem(preferencesKey, JSON.stringify({ balance: values.balance, risk: values.risk, leverage: values.leverage }));
      setStorageFailed(false);
    } catch { setStorageFailed(true); }
  }, [values.balance, values.risk, values.leverage, errors.balance, errors.risk, errors.leverage]);

  function pastePrice(id, text) {
    const price = parsePastedPrice(text);
    if (price === null) {
      setPasteErrors(current => ({ ...current, [id]: '不是有效价格，未替换原值。支持 1,000.25 格式。' }));
      return;
    }
    update(id, price);
  }

  function changeDirection(direction) {
    if (direction === values.direction) return;
    const entry = Number(values.entry);
    const sign = direction === 'long' ? 1 : -1;
    setValues(current => ({
      ...current,
      direction,
      stop: current.stop && entry > 0 && Number(current.stop) > 0 ? String(entry - sign * Math.abs(entry - Number(current.stop))) : current.stop,
      target: current.target && entry > 0 && Number(current.target) > 0 ? String(entry + sign * Math.abs(entry - Number(current.target))) : current.target,
    }));
    setPasteErrors({});
    setCopyState('');
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(`${values.direction === 'long' ? '做多' : '做空'} · ${values.leverage}x 杠杆\n合约数量：${formatResultValue(result.quantity)} 单位\n仓位大小：${formatResultValue(result.notional)} USDT\n预计保证金：${formatResultValue(result.margin)} USDT\n保证金比率：${formatResultValue(result.marginUsage)}%\n风险预算：${result.riskAmount} USDT\n入场：${values.entry}；止损：${values.stop}${values.target ? `；止盈：${values.target}` : ''}\n线性计价估算，未计手续费、滑点、数量步长及强平。`);
      setCopyState('已复制');
    } catch { setCopyState('复制失败，请手动选择结果'); }
  }

  return <>
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#"><span className="brand-symbol"><Icon name="bars" size={24} /></span><span>仓位<span className="brand-english">Position</span></span></a>
        <nav aria-label="主导航"><a className="active" href="#calculator">仓位计算</a><a href="#how-it-works">计算逻辑 <span>↗</span></a></nav>
        <span className="preview-badge"><span />设计预览 <b>V0.1</b></span>
      </div>
    </header>

    <main>
      <section className="hero">
        <div><div className="eyebrow"><span /> LESS GUESSWORK. MORE CONTROL.</div><h1>每一笔，<span>心中有数。</span></h1><p>先定义风险，再决定仓位。让每一次交易，都有清晰的边界。</p></div>
        <div className="hero-note"><Icon name="shield" size={24} /><div><strong>把风险放在收益之前</strong><span>一个计算器，一份更从容的交易计划。</span></div></div>
      </section>

      <div className="workspace" id="calculator">
        <section className="parameters card" aria-labelledby="parameters-title">
          <div className="section-heading"><div className="heading-with-icon"><span className="section-icon"><Icon name="bars" size={18} /></span><h2 id="parameters-title">设置交易参数</h2></div><button className="reset-button" onClick={() => { setValues(example); setCopyState(''); setPasteErrors({}); }}><Icon name="reset" size={14} />恢复默认</button></div>
          <div className="form-section">
            <div className="step-label"><span>01</span> 资金与风险</div>
            <div className="fields-grid">
              <Field id="balance" label="账户资金" suffix="USDT" value={values.balance} onChange={update} error={errors.balance} />
              <Field id="risk" label="单笔风险比例" suffix="%" value={values.risk} onChange={update} error={errors.risk} />
            </div>
            <div className="risk-row"><span>每笔愿意承担的计划亏损</span><div className="risk-presets" role="group" aria-label="风险比例快捷选择">{['1', '2', '3', '4'].map(value => <button key={value} aria-pressed={values.risk === value} className={values.risk === value ? 'selected' : ''} onClick={() => update('risk', value)}>{value}%</button>)}</div></div>
            <div className="leverage-row"><div><label htmlFor="leverage">杠杆倍数</label><span>仅影响预计保证金，不改变风险预算</span></div><div className="input-wrap"><select id="leverage" value={values.leverage} onChange={event => update('leverage', event.target.value)}>{leverageOptions.map(value => <option key={value} value={value}>{value}x</option>)}</select></div></div>
            {errors.leverage && <span className="field-error">{errors.leverage}</span>}
            {storageFailed && <p className="storage-error" role="status"><Icon name="info" size={12} />本地存储不可用，本次设置无法保留</p>}
          </div>
          <div className="form-section trade-section">
            <div className="step-label"><span>02</span> 交易计划</div>
            <div className="direction-control" role="group" aria-label="交易方向"><button className={values.direction === 'long' ? 'selected long' : ''} aria-pressed={values.direction === 'long'} onClick={() => changeDirection('long')}><Icon name="up" size={16} />做多 <span>Long</span></button><button className={values.direction === 'short' ? 'selected short' : ''} aria-pressed={values.direction === 'short'} onClick={() => changeDirection('short')}><Icon name="down" size={16} />做空 <span>Short</span></button></div>
            <div className="fields-grid price-fields"><Field id="entry" label="入场价格" suffix="USDT" value={values.entry} onChange={update} onPastePrice={pastePrice} error={errors.entry || pasteErrors.entry} /><Field id="stop" label="止损价格" suffix="USDT" value={values.stop} onChange={update} onPastePrice={pastePrice} error={errors.stop || pasteErrors.stop} /></div>
            <Field id="target" label="止盈价格" optional suffix="USDT" value={values.target} onChange={update} onPastePrice={pastePrice} error={errors.target || pasteErrors.target} />
          </div>
        </section>

        <section className="results-column" aria-label="计算结果">
          <div className="result-card">
            <div className="result-topline"><span><span className="live-dot" />你的仓位计划</span><span className="result-leverage">{values.leverage}x 杠杆</span></div>
            <p className="quantity-label">合约数量</p>
            <div className="quantity" aria-live="polite" aria-atomic="true">{result ? number(result.quantity, 6) : '—'}<span>单位</span></div>
            <div className="notional">仓位大小 <strong>{result ? number(result.notional) : '—'} <span>USDT</span></strong></div>
            <div className="notional">预计保证金 <strong>{result ? number(result.margin) : '—'} <span>USDT</span></strong></div>
            <div className="result-divider" />
            <div className="capital-label"><span>保证金比率</span><strong>{result ? number(result.marginUsage, 1) : '—'}%</strong></div>
            <div className="capital-bar"><span style={{ width: `${Math.min(result?.marginUsage ?? 0, 100)}%` }} /></div>
            <div className="result-bottom"><Icon name="shield" size={15} /><span>{result ? `风险预算为账户资金的 ${number(Number(values.risk))}%` : '请先填写有效的交易参数'}</span></div>
          </div>
          {result && result.marginUsage > 100 && <div className="capital-warning" role="status"><Icon name="info" size={17} /><span>预计保证金超出账户资金，请降低风险或调整交易参数。</span></div>}
          <div className="metrics-grid">
            <div className="metric card"><span className="metric-label"><i className="metric-dot loss" />计划亏损</span><strong>{result ? number(result.riskAmount) : '—'}<small> USDT</small></strong><span className="metric-detail">止损距离 {result ? number(result.stopPercent) : '—'}%</span></div>
            <div className="metric card"><span className="metric-label"><i className="metric-dot gain" />计划盈利</span><strong>{result?.profit != null ? number(result.profit) : '—'}<small> USDT</small></strong><span className="metric-detail">达到止盈价格时</span></div>
          </div>
          <div className="ratio-card card"><div><span className="metric-label">风险收益比</span><strong>{result?.rewardRisk != null ? `1 : ${number(result.rewardRisk)}` : '—'}</strong></div><div className="ratio-visual" aria-hidden="true"><span style={{ flex: 1 }} /><i style={{ flex: result?.rewardRisk ?? 1, opacity: result?.rewardRisk != null ? 1 : .2 }} /></div><span className="ratio-description">{result?.rewardRisk != null ? `每承担 1 份风险，对应 ${number(result.rewardRisk)} 份潜在收益` : '填写止盈价格后显示'}</span></div>
          <button className="copy-button" aria-label="复制计算结果" disabled={!result} onClick={copyResult}><Icon name={copyState === '已复制' ? 'check' : 'copy'} size={17} /><span role="status">{copyState || '复制计算结果'}</span><Icon name="arrow" size={18} /></button>
        </section>
      </div>

      <div className="below-grid">
        <PlanChart values={values} result={result} />
        <section className="explanation card" id="how-it-works" aria-labelledby="formula-title"><div className="section-heading"><h2 id="formula-title">简单的公式，清晰的决策</h2><Icon name="info" size={17} /></div><p>用你能承担的风险，反推合约数量。</p><div className="formula"><span>合约数量</span><b>=</b><div><span>账户资金 × 风险比例</span><hr /><span>| 入场价格 − 止损价格 |</span></div></div><div className="formula-example">代入当前参数<span>{result ? `${number(Number(values.balance))} × ${number(Number(values.risk))}% ÷ ${number(Math.abs(Number(values.entry) - Number(values.stop)))}` : '等待有效参数'}<b>{result ? `= ${number(result.quantity, 6)} 单位` : '—'}</b></span></div><p className="margin-formula">预计保证金 = 仓位大小 ÷ 杠杆倍数</p><a className="learn-link" href="https://www.cmegroup.com/education/courses/trade-and-risk-management/proper-position-size" target="_blank" rel="noreferrer">了解仓位与风险的关系<Icon name="up" size={15} /></a></section>
      </div>

      <div className="calculation-note"><Icon name="info" size={16} /><p>适用于数量 × 价格的线性计价，保证金按入场价估算；未计手续费、滑点、数量步长及维持保证金，不计算强平。切换多空时，止损与止盈会按原价差镜像调整。</p></div>
    </main>
    <footer><span className="footer-brand">仓位 <span>Position</span><i>·</i> 每一笔，心中有数。</span><span><Icon name="lock" size={13} />所有计算在你的浏览器中完成</span></footer>
  </>;
}
