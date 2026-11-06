const assert = require('node:assert/strict');
const { test } = require('node:test');
const { parseDateInput, toDateKey, formatDateInput } = require('../src/lib/date.ts');

test('recognizes English date formats and normalizes their display', () => {
  for (const text of ['may 25 2023', 'May 25, 2023', '25 May 2023', 'May 25th 2023', '25th May 2023', ' MAY   25,2023 ', '5/25/2023', '05-25-2023', '2023-05-25', '2023/5/25']) {
    const date = parseDateInput(text);
    assert.ok(date, text);
    assert.equal(toDateKey(date), '2023-05-25', text);
    assert.equal(formatDateInput(date), 'May 25, 2023', text);
  }
});

test('recognizes full and abbreviated month names', () => {
  for (const [text, expected] of [['Jan. 2 2024', '2024-01-02'], ['September 1 2023', '2023-09-01'], ['1 Sept. 2023', '2023-09-01'], ['DEC 31 2023', '2023-12-31']]) {
    assert.equal(toDateKey(parseDateInput(text)), expected);
  }
});

test('numeric dates consistently use month/day/year', () => {
  assert.equal(toDateKey(parseDateInput('5/6/2023')), '2023-05-06');
  assert.equal(parseDateInput('25/5/2023'), null);
});

test('space-separated numeric dates accept two- or four-digit years', () => {
  for (const text of ['05 30 05', '5 30 05', ' 05   30   05 ', '05 30 2005', '05/30/05', '05-30-05']) {
    const date = parseDateInput(text);
    assert.equal(toDateKey(date), '2005-05-30', text);
    assert.equal(formatDateInput(date), 'May 30, 2005', text);
  }
  assert.equal(toDateKey(parseDateInput('01 01 00')), '2000-01-01');
  assert.equal(toDateKey(parseDateInput('12 31 99')), '2099-12-31');
  assert.equal(toDateKey(parseDateInput('02 29 04')), '2004-02-29');
  for (const text of ['02 29 05', '05 32 05', '13 01 05', '05 30 5', '05 30 005']) {
    assert.equal(parseDateInput(text), null, text);
  }
});

test('month names accept two-digit years consistently', () => {
  for (const text of ['may 25 30', 'May 25th, 30', '25 May 30', '25th May 30']) {
    const date = parseDateInput(text);
    assert.equal(toDateKey(date), '2030-05-25');
    assert.equal(formatDateInput(date), 'May 25, 2030');
  }
  assert.equal(toDateKey(parseDateInput('Jan 1 00')), '2000-01-01');
  assert.equal(toDateKey(parseDateInput('Dec 31 99')), '2099-12-31');
  assert.equal(toDateKey(parseDateInput('May 25 23')), '2023-05-25');
  assert.equal(toDateKey(parseDateInput('Feb 29 24')), '2024-02-29');
  assert.equal(parseDateInput('Feb 29 30'), null);
});

test('rejects incomplete, unknown, and impossible dates instead of rolling over', () => {
  for (const text of ['', 'May 25', 'May 25 3', 'May 25 030', 'Mayhem 25 2023', 'May 32 2023', 'Feb 29 2023', 'Feb 30 2024', 'April 31 2023', '2/29/1900', '2023-13-01', '2023-00-01', '2023-01-00', '0000-01-01']) {
    assert.equal(parseDateInput(text), null, text);
  }
  assert.equal(toDateKey(parseDateInput('Feb 29 2024')), '2024-02-29');
  assert.equal(toDateKey(parseDateInput('2/29/2000')), '2000-02-29');
});
