import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePastedPrice } from './price.js';

test('识别普通正数、小数、前后空白及严格千分位并规范化', () => {
  for (const [text, expected] of [
    ['1000', '1000'],
    ['  \t65,000.25\n', '65000.25'],
    ['1,000', '1000'],
    ['1,234,567.89', '1234567.89'],
    ['65，000.25', '65000.25'],
    ['1，234，567.89', '1234567.89'],
    ['.5', '0.5'],
    ['0.50', '0.5'],
    ['0001.2300', '1.23'],
    ['0.0000001', '1e-7'],
    ['1e-7', '1e-7'],
    ['1.25E+3', '1250'],
  ]) {
    assert.equal(parsePastedPrice(text), expected, text);
  }
});

test('拒绝错误分组、混合文本、非数与非正数', () => {
  for (const text of [
    '1,00', '1,5', '12,34,567', '1000,000', '1,,000', ',100', '100,',
    '1，00', '1 000', '1\n000', '1,000.25.0', '1.2.3', '.', '', '  ',
    '100 USDT', 'BTC 100', '¥100', '100abc', 'NaN', 'Infinity', '1e', '1e--7', '1e309', '1e-400',
    '-1', '0', '0.00', '-0', null, undefined, 1000,
  ]) {
    assert.equal(parsePastedPrice(text), null, String(text));
  }
});

test('接受有限极值，拒绝溢出和下溢为零', () => {
  assert.equal(parsePastedPrice(`1${'0'.repeat(308)}`), '1e+308');
  assert.equal(parsePastedPrice(`0.${'0'.repeat(322)}5`), '5e-323');
  assert.equal(parsePastedPrice(`1${'0'.repeat(309)}`), null);
  assert.equal(parsePastedPrice(`0.${'0'.repeat(400)}1`), null);
});
